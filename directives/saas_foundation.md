# Base SaaS multiempresa

## Objetivo

Construir AlDía APP como servicio web multiusuario: cada persona se autentica con Supabase Auth y sus datos financieros permanecen aislados por empresa mediante Row Level Security (RLS).

## Flujo al conectar las cuentas del propietario

1. Crear un proyecto Supabase a nombre de `clamasanber@gmail.com`, preferiblemente en `sa-east-1` para el piloto colombiano.
2. Guardar solo `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` en `apps/web/.env.local`; nunca subir secretos ni la contraseña de base de datos.
3. Aplicar, en orden, las migraciones de `supabase/migrations/`.
4. Configurar en Supabase Auth la URL de producción de Vercel y las URL de redirección de `/auth/callback`.
5. Crear el repositorio GitHub privado y subir el código sin archivos `.env*`.
6. Crear el proyecto Vercel desde ese repositorio y registrar las mismas dos variables públicas.

## Reglas no negociables

- Las consultas de negocio deben ejecutarse con el cliente autenticado; no usar la clave `service_role` en el navegador.
- Todas las tablas de negocio requieren `organization_id`; el cliente nunca puede elegir datos de otra empresa porque RLS lo filtra.
- Los comprobantes se guardan en el bucket privado `expense-receipts` bajo la ruta `<organization_id>/<expense_id>/<archivo>`.
- Validar MIME y tamaño también en el servidor, aunque el bucket tenga límites.
- No marcar como funcional la lectura de fotos, PDF, audio, correo o mensajes hasta que creen gastos reales, trazables y corregibles.

## Verificación antes de piloto

- Probar dos usuarios de dos empresas: ninguno debe leer, modificar, listar archivos ni inferir IDs de la otra.
- Verificar correo, inicio de sesión, renovación de sesión, alta de empresa, carga de comprobante y salida de sesión.
- Aplicar las migraciones en un proyecto de prueba antes de producción y revisar los avisos de seguridad de Supabase.
