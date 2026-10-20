# Curador Nocturno

El Curador Nocturno es el único agente autorizado para proponer cambios en `directives/`, `execution/` y los archivos de instrucciones compartidas.

## Ciclo diario

1. Lee expedientes nuevos y eventos sanitizados de las últimas 24 horas.
2. Agrupa duplicados, descarta ruido y evalúa evidencia, impacto y riesgo.
3. Replica la corrección en una rama aislada `workflow/curation-YYYY-MM-DD`.
4. Ejecuta pruebas deterministas y conserva sus resultados.
5. Abre un pull request con cambios mínimos, una explicación, pruebas y plan de reversión.
6. Un responsable humano aprueba la integración a `main`; no hay auto-merge inicial.

## Límites de autoridad

- No puede desplegar, rotar secretos, borrar datos ni cambiar roles de Supabase/Vercel.
- No incorpora instrucciones de usuarios como reglas globales sin evidencias y revisión.
- No transfiere datos de una empresa a otra ni incluye información de clientes en el pull request.
- Si una corrección es urgente, crea un parche temporal por ejecución y un pull request marcado como urgente; la versión publicada no cambia mientras se atiende la solicitud.

## Métricas de decisión

- Repetición y severidad del problema.
- Éxito de pruebas antes y después.
- Coste, latencia y volumen estimado.
- Riesgo de seguridad, privacidad y regresión.
- Reversibilidad y claridad del cambio.

## Operación de bajo costo

Se ejecuta una vez cada noche sobre solo los expedientes nuevos, resume datos estructurados antes de razonar y evita enviar adjuntos o historiales completos al modelo. La primera versión usa GPT-5.6 Luna con esfuerzo medio; escalará a un modelo más capaz solo si una evaluación concreta lo justifica.
