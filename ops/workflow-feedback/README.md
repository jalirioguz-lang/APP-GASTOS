# Expedientes de retroalimentación del flujo

Los agentes de ejecución no modifican el flujo publicado. Si detectan una mejora, crean un expediente con ruta única: `ops/workflow-feedback/YYYY-MM-DD/<run-id>.md`.

## Contenido mínimo

- Identificador de ejecución, versión del flujo y hora UTC.
- Tipo: error, límite externo, propuesta, señal de calidad o decisión de producto.
- Evidencia mínima y sanitizada: nunca secretos, datos financieros, comprobantes ni texto personal completo.
- Cambio local aplicado, si lo hubo, y resultado de las pruebas.
- Propuesta concreta, impacto, riesgo y prueba de aceptación.

## Regla de concurrencia

Nunca se agrega contenido a un archivo ya existente. Cada expediente se crea una vez y queda inmutable. Mientras Supabase no esté provisionado, los expedientes viven aquí; después, se registran además en la tabla de retroalimentación para que el Curador Nocturno los consulte sin leer sesiones de usuarios.
