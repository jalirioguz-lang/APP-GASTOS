# Corrección de estado — incidente de clave heredada

- **Ejecución:** piloto Supabase; 2026-10-20 UTC.
- **Tipo:** corrección de registro / incidente de seguridad abierto.

## Estado

La deshabilitación conjunta de las claves JWT heredadas ya fue confirmada por Supabase en una ejecución anterior. El expediente de contención previo no debe interpretarse como cierre definitivo: permanece pendiente una revisión manual de Supabase limitada a dependencias y configuraciones, sin revelar material secreto.

## Límite de la corrección

No se reactivan claves heredadas, no se enumeran claves, no se despliega la aplicación y no se configuran nuevos secretos. Reactivar las claves restauraría una credencial previamente expuesta y requiere una autorización explícita distinta.

## Criterio de cierre pendiente

El incidente solo podrá cerrarse después de que el custodio confirme por escrito que no había dependencias internas no revisables, y se complete una verificación redactada de acceso del piloto mediante clave `publishable`, superficies Vercel/repositorio, ausencia de worker y ausencia de configuración de nuevas claves de servicio.
