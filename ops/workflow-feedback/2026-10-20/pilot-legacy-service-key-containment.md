# Expediente de contención de seguridad

- **Ejecución:** piloto Supabase; 2026-10-20 UTC.
- **Tipo:** incidente de seguridad cerrado con contención controlada.

## Alcance y evidencia redactada

Una respuesta anterior de metadatos expuso material de una clave heredada de rol de servicio. No se volvió a consultar el endpoint de claves. Antes de la contención se verificó que no había Edge Functions, que el worker no estaba configurado ni activo, y que Vercel solo contenía variables públicas del piloto. Las referencias locales restantes son documentación, código de un worker no desplegado y permisos SQL, no valores de claves.

## Acción aprobada

Se deshabilitaron las claves JWT heredadas del proyecto mediante la configuración administrada de Supabase. Esta acción invalida conjuntamente las claves heredadas `anon` y `service_role`; no generó ni configuró una clave nueva.

## Verificación posterior

Vercel conserva únicamente variables `NEXT_PUBLIC_*`; no hay Edge Functions; el worker permanece ausente/inactivo. DB, Auth, REST y Storage reportan estado saludable. El bucket `expense-receipts` existe, es privado y conserva límite de 5 MB.

## Cierre y seguimiento

El incidente queda contenido para el entorno de piloto. Mantener prohibido el endpoint de enumeración de claves y no introducir claves de rol de servicio sin una autorización independiente, un custodio definido y una revisión previa de dependencias.
