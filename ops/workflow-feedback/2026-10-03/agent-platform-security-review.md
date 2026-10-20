# Revisión aislada: plataforma de ejecuciones agénticas

Fecha: 2026-10-03

## Observación

Un worker que ejecuta Codex dentro del mismo proceso, UID o entorno que conserva `SUPABASE_SERVICE_ROLE_KEY` puede exponer secretos mediante una instrucción maliciosa, incluso con sandbox de solo lectura. Las conversaciones de cliente tampoco deben poder elegir ni modificar el identificador de sesión de Codex.

## Evidencia

Revisión adversarial de seguridad y fiabilidad sobre la primera implementación de la cola: el subproceso hereda el entorno por defecto, y el identificador de sesión estaba en una fila que un cliente podía actualizar. También se detectó una opción de CLI no soportada en el binario presente.

## Corrección local aplicada

- El hijo de Codex recibe un entorno permitido mínimo y ya no usa la opción de CLI no válida.
- La migración impide que usuarios asignen sesiones, restringe cada hilo a su propietario y serializa ejecuciones activas por conversación.
- El daemon no se habilita mientras no exista un runner separado, sin secretos y con identidad propia.

## Propuesta para curaduría

Diseñar broker y runner como servicios independientes: el broker conserva las credenciales de Supabase y aplica acciones validadas por IPC autenticado; el runner usa un UID y `CODEX_HOME` efímeros por conversación, sin acceso a variables de servicio ni al entorno `/proc` del broker. Añadir pruebas de inyección de prompt, recuperación de leases y transacciones de finalización.
