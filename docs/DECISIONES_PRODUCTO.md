# AlDía APP — decisiones para el piloto

Fecha: 2026-09-29. Responsable de aprobación: Alirio Guzmán.

Este documento recoge las decisiones expresas del usuario. La especificación adjunta conserva el alcance a largo plazo; si ambos textos difieren, estas decisiones posteriores orientan el piloto.

## Producto y mercado

- Nombre elegido: AlDía APP. Su uso es provisional para el prototipo hasta la verificación formal de marca, tiendas y dominio.
- Piloto: aplicación web responsive en español, para pequeñas empresas de Colombia de hasta 10 personas.
- Expansión prevista, en orden: México, Chile, Argentina, Perú, Ecuador, Bolivia y España.
- La aplicación prioriza el control de gastos y permite presupuestos. No pretende sustituir un sistema contable.
- Alirio dispone de varias empresas piloto. El prototipo se probará con al menos cinco personas antes de construir el primer incremento funcional.
- En el inicio, una sola persona es la encargada de registrar los gastos. El tamaño de la empresa (hasta 10 personas) no implica que todos deban tener cuenta ni registrar gastos en esta etapa.

## Primer incremento funcional

Registro y acceso, empresa aislada, proyecto, cuenta, gasto en borrador, revisión, confirmación auditable y panel básico. Ingresos y transferencias se posponen.

- La persona responsable entra con correo y contraseña propios; el correo se confirma mediante un mensaje enviado al titular. En el registro se solicitan nombre y celular. Falta acordar si el celular es obligatorio.
- Recomendación para el piloto cerrado: que la persona responsable cree su cuenta, elija su contraseña y confirme el correo mediante un enlace de un solo uso y duración limitada antes de acceder a datos de empresa. Las invitaciones y permisos de equipo pueden esperar a una etapa posterior. No implementar este flujo como una simulación engañosa en la vista previa actual.

- Monedas iniciales: COP, USD y EUR. La moneda base inicial propuesta es COP.
- Se permiten saldos negativos en cuentas.
- Los gastos no requieren aprobación previa.
- No se añadirá una cola obligatoria «por aprobar» en el piloto inicial: una sola persona registra los gastos. Un saldo negativo de caja menor se muestra con claridad y puede generar una advertencia, pero no bloquea el registro.
- Los comprobantes son opcionales: PDF, JPG, JPEG o PNG, hasta 5 MB por archivo.
- La tasa manual podrá ajustarla un usuario autorizado y quedará registrada con autor, motivo, valor y fecha. El proveedor de tasas sigue por evaluar.
- El presupuesto compara movimientos confirmados; los compromisos quedan para después.
- Caja menor: base asignada, gastos y conciliación simple mediante arqueo y cierre auditable.
- Exportación inicial: CSV compatible con Excel y software contable; en pantalla se consultan y filtran los gastos.
- La persona responsable podrá aportar un gasto por formulario/manual, foto, audio, mensaje, correo y archivo PDF, entre otros formatos. La información extraída debe crear automáticamente un gasto visible y editable, sin exigir transcribir campos ni pulsar «Guardar» para que aparezca. Los campos ausentes o dudosos se marcan para corrección; no se inventan valores. Queda por precisar qué significa «mensaje» (texto en la app, WhatsApp o SMS), cómo llegan los correos y qué canales reales entran en la primera entrega funcional.
- Caso central de captura: desde el celular, la persona toma o sube una foto de un recibo y la app lee el documento para crear automáticamente el gasto (por ejemplo comercio, fecha, importe, moneda e impuestos cuando estén presentes), conserva la foto como comprobante y muestra el resultado casi de inmediato en la lista. El gasto puede corregirse después, con trazabilidad. Para evitar cifras falsas en los reportes, una lectura incompleta o dudosa queda señalada como pendiente; la regla de cuándo impacta los totales debe validarse antes de utilizar datos reales. No se exige aprobación de otra persona.
- Audio: recorrido simulado en el prototipo actual; aún no graba ni transcribe. La meta funcional es la misma captura automática y visible que con la foto. No anunciar audio, correo, mensajes ni lectura de PDF como operativos mientras sigan simulados o pendientes.
- El piloto no cobra. La pasarela se probará solo después de validar el producto y el marco comercial y legal.

## Prototipo y pruebas

El prototipo usa datos ficticios identificados como demostración. Debe permitir navegar desde el alta de empresa hasta el primer gasto y recorrer presupuesto, caja menor, exportación y un intento de carga por audio. La captura fotográfica con extracción real todavía no está implementada; la carga actual solo guarda el nombre del archivo en el navegador. Cada prueba interna debe comprobar que borrador y confirmado se distinguen, que moneda original y conversión son claras, y que ningún archivo de más de 5 MB parece aceptado.

La revisión recibida sobre la demo identifica bien el bloqueo para usar datos reales: faltan cuentas propias, aislamiento por empresa, almacenamiento privado de comprobantes, persistencia, auditoría y respaldo. Esas capacidades, junto con la captura real de foto a gasto, son puertas de entrada del piloto funcional. Propuestas de aprobaciones obligatorias, bloqueo de saldos negativos o cobros durante el piloto no sustituyen las decisiones expresas anteriores.

## Pendientes antes de publicar

- Revisar formalmente la disponibilidad y el riesgo de la marca AlDía APP. La búsqueda pública encontró uso literal de «AL DIA APP» por una empresa financiera mexicana (https://app.aldia.ai/site/contacto) y Aldia ERP para pymes en Colombia (https://aldiaerp.com/). Esto no determina por sí solo el estado legal de la marca. Consultar SIPI (Colombia), MARCia (México) y OEPM (España) antes de publicar.
- Elegir y registrar un dominio a nombre de la entidad aprobada por Alirio, después de la revisión de marca. `aldiaapp.com` y `aldia-app.com` figuran registrados en RDAP de Verisign al 2026-09-29; la disponibilidad de otros dominios no se ha confirmado.
- Elegir fuente de tasas, infraestructura, política de respaldo y costos tras comparar alternativas vigentes.
- Validar precios y límites con empresas piloto. La propuesta comercial previa es una hipótesis, no una decisión aprobada.
