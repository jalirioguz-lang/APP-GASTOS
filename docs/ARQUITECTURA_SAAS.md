# Arquitectura de AlDía APP

La aplicación funcional vive en `apps/web`: Next.js sirve la interfaz y las acciones de servidor; Supabase provee autenticación, PostgreSQL, políticas RLS y almacenamiento privado; Vercel alojará el frontend conectado a GitHub.

## Aislamiento de empresas

Cada usuario pertenece a una o más filas de `organization_members`. Toda entidad financiera incluye `organization_id`; las políticas RLS permiten leer o escribir solo si `auth.uid()` pertenece a esa empresa. Esto impide que una URL, un ID o una petición manipulada crucen los límites entre clientes.

## Primera entrega funcional

La base incluida cubre registro con correo, contraseña, nombre y celular, verificación de correo, creación de empresa y panel protegido. El esquema ya reserva proyectos, cuentas, gastos, comprobantes y auditoría. Aún no presenta como operativos la extracción de recibos, audio, correo ni mensajería.

## Propiedad y accesos

El proyecto Supabase, el repositorio GitHub y el equipo Vercel deben pertenecer al usuario propietario. Claudia puede añadirse con acceso de colaboración, sin compartir contraseñas ni credenciales de producción.
