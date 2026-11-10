
# PlantSync

Frontend Vue 3 + TypeScript. Instalar con `npm ci` y ejecutar `npm run dev` (en PowerShell con scripts restringidos, usar `npm.cmd`).

- `/sign-in`: acceso con verificación de roles; administradores a `/dashboard`, usuarios a `/plants`.
- `/preview/dashboard`: recorrido nuevo sin credenciales, con datos explícitamente simulados.
- `/preview/health`: fotografía local y resultado ilustrativo; no se sube ni analiza la imagen.
- `/preview/assistant`: revisión, confirmación y cancelación de una acción simulada.
- `/preview/rewards`: billetera y medalla simuladas; no abre MetaMask ni envía transacciones.

Las rutas reales `/health`, `/assistant`, `/rewards` permanecen deshabilitadas para operaciones hasta implementar el backend. No almacenar claves Gemini, broker o blockchain en variables `VITE_*`.

Ver [entrega para backend](docs/contrato-integracion-backend.md), [plan](docs/plan-mejora.md) y [arquitectura](docs/arquitectura-nuevas-funciones.md).

Verificación: `npm run type-check`, `npm test`, `npm run build`.

Próxima ejecución: [plan de cierre frontend e integración completa](docs/plan-cierre-frontend-backend.md). Identidad visual: `public/logo.png`, utilizada en navegación, acceso, registro y favicon.

Funciones anteriores, contratos contrastados y pendientes de seguridad del servidor: [verificación y entrega a backend](docs/verificacion-funciones-existentes.md). Para probar el acceso real se necesita un backend disponible; configurar su base completa mediante `VITE_API_BASE_URL` en `.env.local` y reiniciar Vite.
