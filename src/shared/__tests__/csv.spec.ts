import { describe, expect, it } from "vitest";
import { toCSV } from "../services/csv";
describe("CSV exports", () => {
  it("preserves punctuation, newlines, accents and missing values", () => {
    expect(toCSV([{ name: 'Planta, "limón"\nNueva', value: null }])).toBe(
      '"name","value"\r\n"Planta, ""limón""\nNueva",""',
    );
  });
  it("neutralizes formulas without corrupting numeric negatives", () => {
    expect(toCSV([{ note: "=1+1", temperature: -5 }])).toContain(
      '"\'=1+1","-5"',
    );
    expect(toCSV([{ note: " @SUM(A1)" }])).toContain('"\' @SUM(A1)"');
  });
  it("handles no rows", () => {
    expect(toCSV([])).toBe("");
  });
});
