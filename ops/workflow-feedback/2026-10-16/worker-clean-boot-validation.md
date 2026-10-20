# Validación de arranque limpio del worker

Fecha: 2026-10-16. Entorno: Supabase local efímero; una empresa, conversación, solicitante y mensaje sintéticos.

## Resultado

La ejecución de Codex desde una sesión de escritorio fallaba antes de atender la cola porque cargaba conectores MCP externos. Se aisló `CODEX_HOME` para que contenga solo autenticación y se invocó Codex con `--ignore-user-config`. El siguiente bloqueo fue un esquema de respuesta no compatible con modo estricto: `oneOf` fue reemplazado por `type: ["object", "null"]` sin añadir acciones posibles.

La prueba end-to-end posterior terminó con la corrida en `succeeded`, una respuesta de asistente persistida y exactamente un gasto de `12345` COP en `draft`, con `source=message` y `created_by` igual al solicitante sintético. Se verificó el evento `audit_events` de inserción y que no existían cuentas ni presupuestos en la empresa de prueba.

## Aplicación

Los despliegues del worker deben usar un `CODEX_HOME` propio del usuario de servicio, sin plugins, hooks ni conectores MCP. Probar una ejecución sintética tras cualquier cambio de autenticación, CLI o configuración de Codex.
