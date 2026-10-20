# Protocolo de piloto controlado — AlDía APP

## Alcance y cohorte

El piloto no es producción. Comienza con hasta cinco personas aprobadas nominalmente, una cuenta por persona y una empresa de prueba asignada a cada cuenta. Se usan datos sintéticos o anonimizados; no se ingresan credenciales bancarias, identificaciones, información tributaria ni comprobantes reales. Cada participante acepta el alcance de prueba y un canal de soporte antes del alta.

El agente solo puede proponer un gasto COP entero como `draft` desde un mensaje. La persona autenticada debe revisar y confirmar el gasto: la base exige `confirmed_by`, `confirmed_at` y registra el cambio en `audit_events`. El agente no confirma gastos, no modifica saldos, cuentas, proyectos ni presupuestos.

La foto, el PDF y el audio pueden adjuntarse como comprobantes cuando el flujo manual esté disponible; no se describen ni prueban como extracción automática de datos hasta contar con implementación y evidencia específica.

## Soporte e incidencias

- Un único canal privado de soporte, atendido en horario hábil de Colombia. Nunca enviar contraseñas, claves, enlaces firmados ni comprobantes sensibles por ese canal.
- Severidad 1: exposición entre empresas, modificación inesperada o acceso no autorizado. Suspender altas y worker, preservar logs y avisar al responsable el mismo día.
- Severidad 2: gasto duplicado, fallo de exportación o indisponibilidad sin exposición. Congelar la operación afectada y responder en un día hábil.
- Severidad 3: defectos visuales o dudas de uso. Registrar, priorizar y responder en dos días hábiles.
- Cada incidencia contiene fecha, cuenta afectada, pasos reproducibles, impacto, evidencia saneada, decisión y resultado. No incluir secretos ni datos personales innecesarios.

## Respaldo, reversión y salida

- Antes de cada sesión, validar restauración en un entorno de prueba desde un respaldo cifrado. La política final de retención y el proveedor se aprueban antes de cualquier dato real.
- Reversión de aplicación: volver al último artefacto de despliegue validado y deshabilitar el worker. Reversión de base: usar una migración compensatoria nueva; nunca `db reset` en un entorno compartido.
- Ante un incidente de aislamiento, desactivar inmediatamente el registro y las exportaciones, revocar sesiones, detener el worker y revisar `audit_events`, `agent_runs` y logs de despliegue antes de reabrir.
- Al cierre, exportar los datos de prueba, borrar las cuentas y datos sintéticos conforme a la política aprobada y documentar hallazgos en un expediente aislado.

## Puertas de habilitación

No se habilita un usuario real hasta que una persona responsable apruebe por escrito: identidad de cuentas y empresas piloto; proveedor y prueba de restauración; política de privacidad/retención; canal y responsable de soporte; y evidencia verde de build, migraciones, RLS, Storage, exportación HTTP y worker end-to-end.

El worker end-to-end requiere además una sesión Codex limpia sin conectores MCP rotos, credenciales locales aisladas y una prueba que demuestre: cola a `succeeded`, respuesta persistida, un único gasto `draft` COP y la identidad del solicitante. Un fallo debe acabar en `failed` sin crear un gasto.
