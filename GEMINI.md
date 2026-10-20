# Instrucciones para el Agente

> Crea un archivo CLAUDE.md, AGENTS.md y GEMINI.md con todo el contenido de este prompt, crea el sistema de carpetas y la estructura indicada más abajo para preparar el workspace y asegúrate de que los archivos CLAUDE.md, AGENTS.md y GEMINI.md estén siempre iguales, asía eu si haces un cambio o registras un aprendizaje en uno de estos tres archivos, deberás replicarlo en los demás para que el sistema cargue en cualquier entorno de IA agéntica.

## Aprendizajes del Agente (Mejora Continua)

> **INSTRUCCIÓN CRÍTICA — LEER PRIMERO:** Esta sección es la memoria curada del flujo publicado. Los agentes de solicitudes normales **no la modifican**, ni cambian `directives/`, `execution/`, `CLAUDE.md`, `AGENTS.md` o `GEMINI.md` durante una ejecución. Registran observaciones, errores y propuestas en un expediente aislado de `ops/workflow-feedback/`. El Curador Nocturno evalúa esos expedientes, pruebas y métricas, y es el único proceso que propone cambios al flujo publicado mediante pull request. Evita escrituras concurrentes y deja cada mejora revisable y reversible.
>
> **Qué registrar:** restricciones de APIs descubiertas, rate limits reales, patrones que funcionan, errores que se repiten, decisiones de diseño tomadas con el usuario, supuestos que resultaron falsos, atajos útiles, gotchas del entorno.
>
> **Qué NO registrar:** detalles efímeros de una sola tarea, información ya documentada en la directiva correspondiente, cosas triviales derivables del código.
>
> **Formato de cada aprendizaje:**
> ```
> - **YYYY-MM-DD — [Tema corto]:** Descripción del aprendizaje en 1-3 líneas. **Por qué importa:** consecuencia práctica o cómo aplicarlo en el futuro.
> ```
>
> **Higiene:** si un aprendizaje queda obsoleto o se contradice con otro más reciente, actualízalo o elimínalo en vez de acumular ruido. Mantén la lista ordenada por fecha (más recientes arriba). Si superas ~25 entradas, consolida las más antiguas o promuévelas a la directiva que corresponda.

### Registro de aprendizajes

- **2026-09-30 — [Curaduría nocturna y calidad de diseño]:** El proyecto pasa de aprendizaje en caliente a solicitudes de cambio aisladas por ejecución y una curaduría nocturna que valida y propone cambios mediante pull request; la calidad visual se rige por criterios verificables de sistema, accesibilidad y móvil, no por capturas aisladas. **Por qué importa:** evita escrituras concurrentes sobre el flujo, conserva evidencia y previene que la ambición estética sacrifique consistencia o confianza.
- **2026-09-30 — [Base SaaS antes de provisionar]:** La aplicación funcional se separó de la demo en `apps/web`, con una migración Supabase que impone `organization_id`, RLS, autenticación por correo, comprobantes privados, relaciones de gasto verificadas dentro de la misma empresa y auditoría automática. No hay Node ni claves de Supabase en el entorno todavía. **Por qué importa:** se puede revisar y versionar la arquitectura sin usar las cuentas compartidas; antes de producción hay que aplicar la migración en un proyecto de prueba y ejecutar la compilación cuando el propietario conecte Supabase y GitHub.
- **2026-09-30 — [Conexiones Composio y alias]:** Composio mostró GitHub activo con el usuario canónico `clamasanber`, pero su alias local era `facturacion-aztec`; una verificación posterior rechazó usar ese alias sin confirmar la cuenta objetivo. Supabase y Vercel no estaban conectados y devuelven enlaces de autorización de corta vigencia. **Por qué importa:** identificar y confirmar las cuentas por su usuario o correo canónico antes de crear o consultar recursos remotos; no asumir que un alias representa la cuenta indicada por Alirio.
- **2026-09-30 — [Canales reales frente a rutas de demo]:** Diez perfiles guardaron y exportaron 40 gastos, pero audio es un ejemplo fijo, foto/PDF solo guardan el nombre del archivo y correo/mensajes no tienen entrada. El CSV necesitó identificar la empresa tanto en la fila como en el archivo para evitar diez descargas indistinguibles. **Por qué importa:** no reportar estas rutas como captura multicanal operativa ni usar sus resultados para autorizar datos reales; verificar que la vista local siga activa antes de lanzar Chromium.
- **2026-09-30 — [Diez perfiles no son diez empresas aisladas]:** Diez recorridos ficticios en perfiles de navegador separados pasaron la lógica visible; al renombrar la empresa dentro de un mismo perfil, los gastos anteriores permanecen. Adjuntar una foto tampoco extrae campos ni crea el gasto. **Por qué importa:** una prueba con perfiles independientes valida la demo, pero no seguridad multiempresa ni el flujo automático de recibos; ambos requieren backend y pruebas propias antes de datos reales.
- **2026-09-29 — [Revisión del piloto sin desviar el enfoque]:** La evaluación de la demo confirma que no se pueden usar datos reales sin identidad, aislamiento, persistencia, soportes privados, auditoría y respaldo; no altera decisiones de Alirio: piloto gratuito, un registrador, sin aprobación previa ni bloqueo de saldos negativos. **Por qué importa:** priorizar confianza operativa y foto a gasto real sin incorporar flujos de equipo o cobro no aprobados.
- **2026-09-29 — [Foto a gasto automático]:** Alirio precisó que tomar una foto de un recibo debe crear automáticamente un gasto visible, sin transcribir ni pulsar «Guardar»; la revisión sirve para corregir campos dudosos, no como aprobación de otra persona. **Por qué importa:** la extracción de imagen es central; la demo actual solo guarda el nombre del archivo y no debe presentarse como extracción funcional.
- **2026-09-29 — [Un registrador y múltiples entradas]:** Alirio aclaró que inicialmente una sola persona se encarga de registrar gastos, pero debe poder aportarlos por audio, mensaje, correo, PDF y otras vías. **Por qué importa:** priorizar un flujo único de extracción a gasto visible y corregible, sin diseñar la primera experiencia alrededor de invitaciones o aprobaciones de equipo ni confundir simulaciones con integraciones reales.
- **2026-09-29 — [Acceso individual del piloto]:** Alirio confirmó que la aplicación funcional debe usar correo y contraseña de la persona responsable, validar el correo y solicitar nombre y celular. El formulario con contraseña compartida de la demo no representa ese registro. **Por qué importa:** antes de probar con datos reales hay que implementar identidad propia, verificación y aislamiento por empresa; sigue pendiente la obligatoriedad del celular.
- **2026-09-29 — [Acceso compatible con navegador integrado]:** La autenticación HTTP básica provocó `ERR_INVALID_AUTH_CREDENTIALS` repetido en el navegador integrado de Codex pese a funcionar en Chromium y curl. Se reemplazó por un formulario HTTPS con verificador scrypt, cookie HttpOnly/Secure/SameSite y servicio Python aislado sin puerto público; se limitan intentos y hash concurrentes. **Por qué importa:** Alirio puede recargar el mismo enlace dentro de Codex; al rotar la contraseña hay que rotar también la clave de sesión para revocar cookies existentes.
- **2026-09-29 — [Prueba real en navegador]:** Sin Node ni navegador instalados en la VPS, la imagen oficial `mcr.microsoft.com/playwright/python:v1.63.0-noble` permitió probar la URL HTTPS en escritorio y móvil con `execution/test_prototype_browser.py`; el paquete Python se instala dentro del contenedor temporal. En la demo, presupuesto cero representa «sin definir», no 0 % de uso. **Por qué importa:** repetir este recorrido antes de compartir cambios y no confundir pruebas automatizadas con las cinco sesiones humanas pendientes.
- **2026-09-29 — [Escapado y alcance de la demo]:** La revisión adversaria encontró un título de gasto insertado sin escapado en el detalle modal; aunque existe CSP, todo texto de usuario debe escaparse antes de entrar a `innerHTML`. La demo mantiene un solo espacio local: renombrar empresa no crea aislamiento. **Por qué importa:** las pruebas y pantallas no deben prometer separación de empresas hasta implementar cuentas y persistencia real.
- **2026-09-29 — [Demo HTTPS aislada]:** La URL temporal `177-7-61-181.sslip.io` resuelve a `177.7.61.181`; Caddy obtuvo un certificado válido por TLS-ALPN-01 y delega el acceso a un servicio Python sin puerto público. Los gastos permanecen en el perfil del navegador y podrían ser vistos por otro evaluador que lo reutilice, incluso tras cambiar la contraseña. **Por qué importa:** permite pruebas cerradas con perfiles separados y datos ficticios, pero no sustituye cuentas ni aislamiento de empresas para un piloto real.
- **2026-09-29 — [VPS y vista previa]:** El workspace está en la VPS `srv2018184`, con n8n, PostgreSQL de n8n y otro worker ya activos; Docker y los sockets requieren ejecución fuera del sandbox. La demo puede servirse por `127.0.0.1:8088` sin tocar esos servicios. **Por qué importa:** cualquier despliegue debe aislarse y comprobar puertos antes de publicar o reutilizar bases de datos.
- **2026-09-29 — [Pruebas del prototipo sin navegador]:** El entorno no trae Flutter, Node ni navegador; el prototipo web se pudo comprobar con el motor JavaScript del orquestador y un DOM simulado para alta, gastos, proyecto, CSV y adjuntos. **Por qué importa:** estas pruebas verifican lógica, pero la revisión visual y de accesibilidad sigue pendiente en un navegador real.
- **2026-09-29 — [Nombre provisional y colisión]:** Alirio eligió «AlDía APP»; «ProyecFin» quedó descartado. Una financiera mexicana llama literalmente «AL DIA APP» a su aplicación y existe Aldia ERP para pymes colombianas; `aldiaapp.com` y `aldia-app.com` ya están registrados. **Por qué importa:** usar el nombre solo en el prototipo interno y hacer búsqueda marcaria formal antes de dominio o publicación.
- **2026-09-29 — [Enfoque del piloto]:** El piloto de AlDía APP será web, en español y para pequeñas empresas colombianas de hasta 10 personas; prioriza gastos, presupuestos y conciliación simple de caja menor, sin cobros reales ni aprobaciones previas. Comprobantes opcionales hasta 5 MB y audio solo simulado en el prototipo con revisión antes de confirmar. **Por qué importa:** el primer incremento funcional debe concentrarse en un gasto auditable y aislado por empresa.
- **2026-09-28 — [Sincronización de directivas]:** CLAUDE.md, AGENTS.md y GEMINI.md se inicializaron con contenido idéntico y deben modificarse como un conjunto. **Por qué importa:** evita que distintos entornos agénticos carguen instrucciones incompatibles.

<!-- Agrega nuevas entradas arriba de esta línea. -->

---

Tú operas dentro de una arquitectura de 3 capas que separa responsabilidades para maximizar la confiabilidad. Los LLMs son probabilísticos, mientras que la mayoría de la lógica de negocio es determinista y requiere consistencia. Este sistema resuelve esa incompatibilidad.

## La Arquitectura de 3 Capas

**Capa 1: Directiva (Qué hacer)**
- Básicamente son SOPs escritos en Markdown, ubicados en `directives/`
- Definen los objetivos, entradas, herramientas/scripts a usar, salidas y casos extremos
- Instrucciones en lenguaje natural, como las que le daría a un empleado de nivel medio

**Capa 2: Orquestación (Toma de decisiones)**
- Esta es tu función. Tu trabajo: enrutamiento inteligente.
- Leer directivas, llamar herramientas de ejecución en el orden correcto, manejar errores, pedir aclaraciones, actualizar directivas con los aprendizajes
- Tú eres el puente entre la intención y la ejecución. Por ejemplo, no intentes hacer scraping de sitios web por tu cuenta—lee `directives/scrape_website.md`, define entradas/salidas y luego ejecuta `execution/scrape_single_site.py`

**Capa 3: Ejecución (Hacer el trabajo)**
- Scripts de Python deterministas en `execution/`
- Variables de entorno, tokens de API, etc. se almacenan en `.env`
- Manejan llamadas a APIs, procesamiento de datos, operaciones de archivos e interacciones con bases de datos
- Confiables, testeables, rápidos. Use scripts en vez de trabajo manual.

**Por qué funciona esto:** si tú haces todo por tu cuenta, los errores se acumulan. Un 90% de precisión por paso = 59% de éxito en 5 pasos. La solución es empujar la complejidad hacia código determinista. Así tú te concentras solo en la toma de decisiones.

## Principios de Operación

**1. Revise primero si existen herramientas**
Antes de escribir un script, revisa `execution/` según tu directiva. Solo crea scripts nuevos si no existe ninguno.

**2. Auto-corrección cuando algo falla**
- Lee el mensaje de error y el stack trace
- Corrige únicamente el caso o espacio de trabajo aislado y pruébalo de nuevo (a menos que use tokens/créditos de pago—en ese caso consulta primero con el usuario)
- Registra evidencia y una propuesta de cambio; no actualices la directiva ni el ejecutable compartidos durante la solicitud.
- Ejemplo: si llegas al rate limit de una API, usas una alternativa temporal para esa ejecución si es segura y registras la evidencia para el Curador Nocturno.

**3. Actualice las directivas a medida que aprende**
Las directivas son documentos publicados y versionados. Los agentes de solicitud no los actualizan. El Curador Nocturno consolida propuestas aprobables en una rama, ejecuta las pruebas aplicables y abre un pull request. Solo tras revisión se integra la modificación; `CLAUDE.md`, `AGENTS.md` y `GEMINI.md` siempre se cambian en el mismo commit y permanecen idénticos.

## Ciclo de Auto-corrección

Los errores son oportunidades de aprendizaje. Cuando algo falla:
1. Corrija el caso aislado si es seguro.
2. Registre la observación y la evidencia sin modificar el flujo publicado.
3. Pruebe la corrección local.
4. El Curador Nocturno consolida, prueba y propone el cambio permanente.
5. Una revisión de pull request publica el nuevo flujo.

## Organización de Archivos

**Estructura de directorios:**
- `.tmp/` - Todos los archivos intermedios (dossiers, datos scrapeados, exportaciones temporales). Nunca se suben al repositorio, siempre se regeneran.
- `execution/` - Scripts de Python (las herramientas deterministas).
- `directives/` - SOPs en Markdown (el conjunto de instrucciones).
- `ops/workflow-feedback/` - Expedientes inmutables por ejecución: observaciones, errores, propuestas y resultados de pruebas. Nunca se anexan a un archivo compartido.
- `ops/curation/` - Especificación, resultados y listas de verificación del Curador Nocturno.
- `runs/` - Overrides y artefactos aislados por ejecución. No se convierten en flujo publicado automáticamente.
- `.env` - Variables de entorno y claves de API.
- `credentials.json`, `token.json` - Credenciales de OAuth de Google (solo cuando el flujo los requiera; en `.gitignore`).

**Principio clave:** Los archivos intermedios viven en `.tmp/` y pueden borrarse siempre. Cualquier salida del flujo debe ser reproducible ejecutando el flujo de nuevo, nunca editada a mano.

## Resumen

Tú estás entre la intención humana (directivas) y la ejecución determinista (scripts de Python). Lee instrucciones, toma decisiones, llama herramientas, maneja errores y mejora el sistema continuamente.

Se pragmático. Se confiable. Auto-corríjete.
