// Read-only check of frontend HTTP paths against the deployed OpenAPI document.
import fs from "node:fs";
import path from "node:path";
import ts from "typescript";

function files(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const file = path.join(directory, entry.name);
    if (entry.isDirectory())
      return entry.name === "__tests__" ? [] : files(file);
    return /\.(ts|vue)$/.test(file) ? [file] : [];
  });
}
function basePath(node) {
  for (let parent = node.parent; parent; parent = parent.parent) {
    if (ts.isClassDeclaration(parent)) {
      const member = parent.members.find(
        (item) => item.name?.getText() === "basePath",
      );
      return member?.initializer && ts.isStringLiteral(member.initializer)
        ? member.initializer.text
        : null;
    }
  }
  return null;
}
function literal(node, call) {
  if (!node) return null;
  if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node))
    return node.text;
  if (ts.isPropertyAccessExpression(node) && node.name.text === "basePath")
    return basePath(call);
  if (ts.isTemplateExpression(node)) {
    let result = node.head.text;
    for (const span of node.templateSpans) {
      const value = literal(span.expression, call);
      if (
        value === null &&
        ts.isPropertyAccessExpression(span.expression) &&
        span.expression.name.text === "basePath"
      )
        return null;
      result += (value ?? "{parameter}") + span.literal.text;
    }
    return result;
  }
  return null;
}
const normalize = (value) =>
  value
    .replace(/\?.*$/, "")
    .replace(/\{[^}]+\}/g, ":parameter")
    .replace(/\/$/, "");
const specUrl =
  process.argv[2] || "https://plantsync-backend.onrender.com/v3/api-docs";
const response = await fetch(specUrl, { signal: AbortSignal.timeout(30000) });
if (!response.ok) throw new Error(`OpenAPI returned HTTP ${response.status}`);
const document = await response.json();
const endpoints = new Set(
  Object.entries(document.paths).flatMap(([route, methods]) =>
    Object.keys(methods).map(
      (method) =>
        `${method.toUpperCase()} ${normalize(route.replace(/^\/api\/v1/, ""))}`,
    ),
  ),
);
let checked = 0;
const failures = [];
for (const file of files("src")) {
  let source = fs.readFileSync(file, "utf8");
  if (file.endsWith(".vue"))
    source = source.match(/<script[^>]*>([\s\S]*?)<\/script>/)?.[1] || "";
  const ast = ts.createSourceFile(
    file,
    source,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TS,
  );
  function visit(node) {
    if (
      ts.isCallExpression(node) &&
      ts.isPropertyAccessExpression(node.expression) &&
      node.expression.expression.getText() === "http" &&
      ["get", "post", "put", "patch", "delete"].includes(
        node.expression.name.text,
      )
    ) {
      const route = literal(node.arguments[0], node);
      const method = node.expression.name.text.toUpperCase();
      const line = ast.getLineAndCharacterOfPosition(node.getStart()).line + 1;
      if (!route) failures.push(`${file}:${line} — unresolved ${method} path`);
      else if (!endpoints.has(`${method} ${normalize(route)}`))
        failures.push(`${file}:${line} — missing ${method} ${route}`);
      else checked++;
    }
    ts.forEachChild(node, visit);
  }
  visit(ast);
}
console.log(`Matched ${checked} HTTP call sites against deployed OpenAPI.`);
for (const failure of failures) console.error(failure);
console.log(
  "This checks routes and methods; authentication, DTO semantics and provider availability need separate tests.",
);
if (failures.length) process.exitCode = 1;
