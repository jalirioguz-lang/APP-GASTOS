# Validación reproducible de AlDía APP

Este procedimiento usa únicamente un Supabase local efímero. No ejecuta `supabase link`, `db push` ni modifica cuentas remotas.

## Requisitos

- Node `22.22.1` y npm `9.2.0` (ver `.nvmrc`).
- Docker con acceso al daemon local.
- Supabase CLI `2.73.0`, siempre invocada con `npx --yes supabase@2.73.0`.

## Instalación y compilación

```bash
cd apps/web
cp .env.example .env.local
npm ci
npx tsc --noEmit
npm run build
```

Complete las dos variables `NEXT_PUBLIC_SUPABASE_*` con los valores que imprime el entorno local una vez iniciado. `NEXT_PUBLIC_APP_URL` debe coincidir con la URL que sirve Next.js.

## Base de datos local

Desde la raíz:

```bash
npx --yes supabase@2.73.0 start
npx --yes supabase@2.73.0 db reset
npx --yes supabase@2.73.0 status
```

`db reset` destruye y recrea exclusivamente la base local del proyecto. Aplica, en orden, `20260930160000_initial_multitenant_schema.sql` y `20261002090000_harden_attachment_integrity.sql`.

Antes de cualquier prueba de seguridad, ejecute el control de preparación con límite de 90 segundos:

```bash
cd apps/web
npm run test:security-local
```

El control consulta el estado local, verifica REST con la clave pública y solo entonces ejecuta la batería RLS/Storage. Si la base o el proxy siguen iniciando, termina con `NOT READY`, conserva el diagnóstico y no reporta ninguna aserción de seguridad como aprobada.

## Reversión de prueba

Las migraciones ya aplicadas no se editan. Para volver a un estado limpio local se usa:

```bash
npx --yes supabase@2.73.0 db reset
```

En un entorno compartido, se debe publicar una migración compensatoria nueva y probarla primero en local; nunca usar `db reset` contra un proyecto remoto.

## Controles de aceptación pendientes

La evidencia debe contener: salida de `npm ci`, `tsc`, `npm run build`, `supabase db reset`, pruebas de dos usuarios/empresas autenticados por cliente público, y capturas de escritorio y móvil con datos ficticios. La batería debe demostrar aislamiento RLS, operaciones cruzadas rechazadas, rutas `organization_id/expense_id/archivo`, metadatos coherentes, enlaces firmados de corta duración y cierre de sesión.

## Hallazgo de rutas de comprobantes

**Causa:** `storage.foldername(name)` devuelve solo directorios: para `organizacion/gasto/archivo` retorna dos elementos, no tres.

**Corrección:** la migración `20261002090000_harden_attachment_integrity.sql` exige dos carpetas, convierte el UUID de forma segura y el trigger valida que gasto, empresa y ruta de metadatos coincidan.

**No regresión requerida:** aceptar la ruta válida y rechazar ruta con segmento extra, UUID inválido, gasto de otra empresa y metadatos cuya ruta no coincida.
