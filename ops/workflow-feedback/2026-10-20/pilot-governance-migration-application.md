# Aplicación redactada — migración de gobierno del piloto

- **Fecha:** 2026-10-20 UTC.
- **Ámbito:** exclusivamente el proyecto Supabase de piloto.
- **Migración registrada:** `controlled_pilot_governance_20261020`.

## Gates previos

- DB, Auth, REST y Storage: saludables.
- Estado base: seis migraciones previas; bucket privado `expense-receipts`, límite de 5 MB y MIME JPG/PNG/PDF.
- Incidente de claves heredadas: cerrado para el piloto; salvedad de revisión interna conservada. No se consultaron endpoints de claves.
- Cambio local: validación estática, tipos y compilación aprobados.

## Aplicación y verificación

El primer intento fue rechazado atómicamente por PostgreSQL: los valores de enum recién añadidos no podían usarse como literales dentro de la misma transacción. Una comprobación de solo lectura confirmó que no hubo historial, tablas ni valores de enum aplicados parcialmente. Se corrigió localmente la función para comparar el rol como texto, se repitió la validación local y la migración se aplicó con historial, idempotencia y rollback revisable.

La verificación posterior confirmó las cinco tablas nuevas, ausencia de política `DELETE` para gastos, lectura de Storage limitada a membresía directa y ausencia de un autorizador central configurado.

## Límite pendiente

`central_authorizer_id` permanece sin configurar. No se creó ninguna concesión cruzada ni se infirió una identidad técnica para Alirio. La prueba positiva CP-03 no puede ejecutarse hasta su provisión administrativa expresa.

No hay secretos, valores de claves, datos reales ni identificadores de usuarios en este expediente.
