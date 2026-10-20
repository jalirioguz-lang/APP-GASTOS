# Worker E2E — bloqueo de arranque de conectores

Fecha: 2026-10-16. Entorno: Supabase local efímero, empresa, conversación y gasto sintéticos.

## Evidencia

El worker reclamó una única ejecución sintética y llamó a `codex exec` en modo de solo lectura. Codex terminó antes de producir salida estructurada debido a un conector MCP que exigía autenticación y a otro endpoint ngrok fuera de línea. No se procesó una acción financiera.

La corrida se cerró como `failed` con `agent_execution_failed`; la comprobación posterior confirmó cero gastos para la empresa sintética. La notificación de fallo se creó en la aplicación.

## Propuesta para curación

Ejecutar el servicio del worker con una configuración Codex mínima y aislada de conectores no requeridos por el flujo. Validar el arranque y una respuesta JSON estructurada antes de habilitar cuentas piloto. Mantener el aislamiento de `SUPABASE_SERVICE_ROLE_KEY` respecto del proceso que interpreta mensajes de usuario.
