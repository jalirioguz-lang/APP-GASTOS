# Preflight redactado — inicio controlado del piloto

- **Fecha:** 2026-10-20 UTC.
- **Proyecto:** Supabase de piloto (referencia registrada de forma interna; sin claves ni URLs sensibles en este expediente).
- **Alcance:** comprobaciones de solo lectura anteriores a la migración de gobierno.

## Gates aprobados

1. **Servicios:** DB, Auth, REST y Storage reportaron estado saludable.
2. **Estado base:** se confirmaron seis migraciones ya aplicadas. El bucket `expense-receipts` es privado, con límite de 5.000.000 bytes y MIME permitidos `application/pdf`, `image/jpeg` e `image/png`.
3. **Incidente de claves:** se conserva el cierre para el piloto y la salvedad documental de la revisión manual interna. No se consultaron endpoints de claves ni se generaron o configuraron claves.
4. **Cambio local:** la migración de gobierno y las validaciones estáticas, de tipos y de compilación estaban aprobadas antes de esta etapa.

## Estado previo capturado para reversión

- Esquema de las tablas afectadas: inventario de columnas de organizaciones, membresías, proyectos, cuentas, gastos, adjuntos, auditoría y presupuestos.
- RLS: inventario de 26 políticas sobre esas tablas y `storage.objects`.
- Storage: bucket privado y sus límites/MIME anteriores.

La evidencia fuente se consultó en modo de solo lectura. Este resumen omite identificadores de usuarios, contenido de datos y valores secretos.
