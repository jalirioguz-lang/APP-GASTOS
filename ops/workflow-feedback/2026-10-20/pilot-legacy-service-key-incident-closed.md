# Cierre de incidente — claves JWT heredadas del piloto

- **Fecha y hora de cierre:** 2026-10-20T00:51:18Z (2026-10-19 19:51:18 America/Bogota).
- **Ámbito:** exclusivamente el proyecto Supabase de piloto.
- **Estado:** contenido y cerrado para el piloto por confirmación expresa del responsable.

## Acción de contención realizada

Supabase confirmó `enabled: false` para las claves JWT heredadas. La acción invalidó conjuntamente las claves heredadas `anon` y `service_role`. No se generó una clave nueva y no se configuró ninguna clave en Vercel, frontend, worker ni otro servicio.

## Superficies revisadas y resultado redactado

| Superficie | Resultado |
| --- | --- |
| Repositorio y frontend | No hay valores de clave ni configuración de `service_role`; las coincidencias son documentación, código de worker no desplegado y permisos SQL. |
| Vercel | Solo variables públicas `NEXT_PUBLIC_*`; no hay variables ocultas de producción ni referencia heredada. |
| Worker | Archivo de entorno ausente; servicio inactivo o no instalado. |
| Supabase Edge Functions | Inventario vacío. |
| Migraciones aplicadas | Sin llamadas a Vault, HTTP o webhooks; no hay consumidor desplegado de una clave de servicio. |
| Salidas nuevas de la contención | Solo estado booleano, metadatos de nombres y estado de salud; no se emitieron valores de claves. |

## Estado del piloto aceptado

DB, Auth, REST y Storage estaban saludables. El historial contenía seis migraciones aplicadas. El bucket `expense-receipts` existía, era privado y tenía límite de 5 MB.

## Controles permanentes

- No consultar endpoints que enumeren o puedan revelar claves.
- No introducir claves de servicio sin autorización independiente, custodio definido y revisión previa de dependencias.
- Antes de toda migración dependiente de Storage, comprobar que DB, Auth, REST y Storage estén saludables.
- Mantener pausados despliegue, GitHub, correo, invitaciones, worker, Resend, migraciones nuevas, cambios de configuración y datos reales hasta autorización posterior.

## Pendientes antes de un despliegue futuro

Presentar y aprobar un plan de prueba funcional que use exclusivamente la clave `publishable`. Siguen pendientes la cuenta GitHub/controlador autorizado, estrategia de verificación de correo, política de acceso al enlace y criterio formal de cierre, extensión o reversión.
