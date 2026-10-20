# Expediente de retroalimentación

- **Ejecución:** piloto Supabase `ukemojydiadxczfxckqa`; 2026-10-19 UTC.
- **Versión del flujo:** directiva `directives/saas_foundation.md` al iniciar la ejecución.
- **Tipo:** restricción de API / custodia de secretos.

## Evidencia sanitizada

La consulta de metadatos de claves de API, realizada sin activar una opción de revelación, devolvió la clave pública necesaria y también un valor heredado de alta criticidad asociado al rol de servicio. No se utilizó, almacenó en archivos, ni se incluyó en configuración de Vercel.

## Cambio local y resultado

La configuración continuará únicamente con la URL pública y la clave `publishable`. No se harán llamadas autenticadas como `service_role` ni se aprovisionará el worker privado.

## Propuesta para curaduría

Usar un mecanismo que seleccione explícitamente la clave `publishable` antes de registrar cualquier salida, o una ruta de API que no enumere claves de servicio. Riesgo: un endpoint de metadatos puede exponer material sensible inesperadamente. Prueba de aceptación: una consulta de configuración pública no contiene claves, prefijos ni hashes de rol de servicio.
