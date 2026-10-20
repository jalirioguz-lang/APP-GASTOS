# Vista previa del prototipo en la VPS

Fecha: 2026-09-29. Esta vista sirve el prototipo con datos ficticios; no es el piloto funcional ni recibe datos reales.

## Estado

La VPS ya ejecuta n8n, su PostgreSQL y otro worker. La vista previa de AlDía APP se publica en [https://177-7-61-181.sslip.io/](https://177-7-61-181.sslip.io/) mediante dos contenedores aislados: Caddy proporciona HTTPS y un servicio Python muestra un formulario de acceso. El dominio temporal resuelve a la IP pública `177.7.61.181`; no es un dominio de marca. La contraseña no se guarda en esta guía ni en el código; su verificador y la clave de sesión están en `deploy/prototype/.env`, ignorado por Git y con permisos `600`.

Se verificó que el certificado TLS es válido, que HTTP redirige a HTTPS, que una visita sin sesión muestra el formulario (HTTP 200), que una contraseña errónea no crea sesión y que, tras entrar, `/`, `/app.js` y `/styles.css` responden 200. El servicio de acceso no publica ningún puerto en la VPS y solo sirve esos tres archivos del prototipo. Los contenedores preexistentes siguieron activos.

El acceso básico anterior produjo `ERR_INVALID_AUTH_CREDENTIALS` en el navegador integrado de Codex. Ahora basta recargar el mismo enlace y usar los campos «Usuario» y «Contraseña» de la página; la barra «Importar datos de Chrome» no forma parte de AlDía APP. Si persiste el error, abrir una pestaña nueva con la URL o probar Chrome externo y registrar una captura.

La configuración reproducible está en `deploy/prototype/compose.yaml`, `deploy/prototype/Caddyfile` y `execution/serve_prototype_login.py`. El servicio de acceso monta los archivos del prototipo en modo solo lectura; los certificados se conservan en un volumen Docker. Para verificar el estado:

```sh
cd /root/code/APP-GASTOS
docker compose -f deploy/prototype/compose.yaml ps
docker compose -f deploy/prototype/compose.yaml logs --tail=50 web auth
```

Para detener solamente esta vista previa, sin borrar el volumen de certificados:

```sh
docker compose -f deploy/prototype/compose.yaml down
```

Este prototipo no tiene cuentas reales ni servidor de datos de negocio. Los cambios se guardan en el navegador de cada persona; no se sincronizan entre usuarios, dispositivos o empresas. Usar solo datos ficticios y un perfil de navegador separado por evaluador. El audio es una simulación, no una grabación ni transcripción. El acceso con una sola contraseña es únicamente para pruebas cerradas; antes de usar información real se necesitarán cuentas individuales, base de datos propia, aislamiento por empresa y controles de auditoría. Al cambiar la contraseña, rotar también `ALDIA_SESSION_KEY` y reiniciar `auth` para invalidar sesiones anteriores.

## Acceso privado alternativo por SSH

También existe un proceso Python temporal en `127.0.0.1:8088`, que no está publicado en internet. Si deja de responder, puede iniciarse con:

```sh
cd /root/code/APP-GASTOS
python3 execution/serve_prototype.py --port 8088
```

Para abrir la vista desde un ordenador con acceso SSH a la VPS, crear un túnel en otro terminal (sustituir `usuario@vps` por la conexión existente):

```sh
ssh -L 8088:127.0.0.1:8088 usuario@vps
```

Después abrir `http://localhost:8088/` en el navegador del ordenador. La sesión SSH debe permanecer abierta mientras se usa la vista.

## Antes del piloto funcional

Completar las sesiones con cinco personas, la revisión con lector de pantalla y la apertura del CSV en Excel. La URL actual permite evaluar el prototipo, pero no constituye el piloto funcional ni autoriza a recoger gastos reales. No usar el PostgreSQL de n8n para datos de AlDía APP. Si la IP pública cambia, el dominio temporal dejará de apuntar a la VPS y habrá que actualizar la configuración.
