# Worker privado de Codex

El worker usa una cola en Supabase, no recibe peticiones públicas y no expone un puerto. Caddy solo debe publicar el frontend de Vercel; el navegador escribe en Supabase bajo RLS y este servicio reclama trabajos mediante el rol de servicio.

## Variables requeridas en `/etc/aldia-agent.env`

```ini
SUPABASE_URL=https://<project-ref>.supabase.co
SUPABASE_SERVICE_ROLE_KEY=<server-only-secret>
CODEX_MODEL=gpt-5.6-luna
POLL_SECONDS=3
ALDIA_RUNS_DIR=/srv/aldia-agent/runs
AGENT_OUTPUT_SCHEMA=/srv/aldia-agent/app/deploy/agent/agent-output-schema.json
# Para los avisos por correo de gastos registrados:
RESEND_API_KEY=re_...
EMAIL_FROM=AlDía APP <notificaciones@tu-dominio.com>
```

El archivo debe pertenecer a `root:aldia-agent` y tener modo `0640`. Nunca debe vivir en Git ni en Vercel.

## Arranque aislado de Codex

El servicio usa `CODEX_HOME=/srv/aldia-agent/codex-home`, separado de cualquier
sesión de escritorio. Inicialícelo con permisos `0700` y autentique Codex como
el usuario de servicio. Ese directorio solo debe contener la autenticación
necesaria para el worker: no copie `config.toml`, plugins, marketplaces, hooks
ni conectores MCP de una estación de trabajo. El worker invoca Codex con
`--ignore-user-config` y sandbox de solo lectura.

Antes de activar el servicio, ejecute una corrida sintética contra Supabase
local o de prueba que demuestre una respuesta estructurada y un único gasto COP
en borrador. Nunca use la clave `service_role` fuera del worker.

## Límites de seguridad

- Cada conversación se reasocia a una sesión de Codex, pero la sesión se ejecuta sin escritura ni aprobaciones.
- El modelo solo puede devolver una acción tipada para crear un gasto en borrador. El worker valida todos los campos antes de escribir.
- Las mejoras del workflow quedan como expedientes bajo `ops/workflow-feedback/`; ningún hilo de cliente cambia `directives/`, `execution/` ni los archivos de instrucciones.
- La integración de correo es opcional. Si Resend falla, el gasto y la notificación dentro de la app siguen auditados.
