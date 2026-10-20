# Expediente de retroalimentación

- **Ejecución:** piloto Supabase `ukemojydiadxczfxckqa`; 2026-10-19 UTC.
- **Versión del flujo:** migraciones versionadas en `supabase/migrations/` al iniciar la ejecución.
- **Tipo:** límite externo / error transitorio de aprovisionamiento.

## Evidencia sanitizada

La aplicación de `20260930160000_initial_multitenant_schema.sql` fue rechazada con SQLSTATE `42P01` porque `storage.buckets` aún no existía. En el momento del error, el proyecto reportaba base de datos saludable, pero Auth, REST y Storage no estaban saludables y Storage seguía `COMING_UP`.

Una consulta de solo lectura a `information_schema.tables` para el esquema `public` devolvió cero tablas, por lo que la migración se revirtió atómicamente y no dejó el esquema de negocio parcial.

## Cambio local y resultado

No se modificaron las migraciones ni las directivas publicadas. Se espera a que Storage alcance estado saludable antes de reintentar exactamente la misma migración con su clave de idempotencia.

## Propuesta para curaduría

Antes de ejecutar la migración inicial que crea el bucket privado, el flujo debe exigir que DB, Auth, REST y Storage estén saludables. Riesgo: iniciar solo al estar DB activa puede producir rechazos transitorios. Prueba de aceptación: en un proyecto nuevo, esperar esos cuatro servicios saludables y aplicar la migración inicial una sola vez; verificar tablas públicas y bucket `expense-receipts`.
