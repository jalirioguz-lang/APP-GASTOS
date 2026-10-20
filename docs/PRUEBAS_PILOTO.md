# Pruebas internas del prototipo — AlDía APP

Versión inicial: 2026-09-29. Datos ficticios. Responsable de aceptación: Alirio Guzmán.

## Recorrido con cinco o más personas

Dar a cada participante la misma consigna sin explicar la interfaz. Registrar si terminó, cuánto tardó, qué dudó y en qué pantalla ocurrió el problema.

1. Entrar a una empresa de demostración e identificar que los importes son ficticios.
2. Crear un proyecto o escoger uno existente e identificar la moneda base COP.
3. Guardar un gasto como borrador; explicar si ya afecta el panel o presupuesto.
4. Revisar y confirmar el gasto; encontrarlo en la lista y en el total del período.
5. Registrar un gasto en USD; identificar importe original, tasa y equivalente en COP.
6. Consultar el presupuesto, el saldo de caja menor y la exportación CSV.
7. Probar el recorrido de audio e indicar en qué momento se registra realmente el gasto.

En esta vista previa, una sola persona hace el registro. El audio es una simulación; todavía no se reciben mensajes ni correos ni se extraen datos de PDF o fotos de recibos. El adjunto solo conserva su nombre. No pedir a evaluadores que envíen información real por esos canales. Cuando se implementen, probar para cada canal la secuencia entrada → gasto creado y visible automáticamente, sin pulsar «Guardar» → corrección auditable de campos dudosos. Probar que un envío repetido no duplique gastos y que los datos inciertos no se presenten como cifras confiables. Para una foto, comprobar además lectura de comercio, fecha, total y moneda, y señalización de campos ilegibles.

Meta inicial: al menos cuatro de cinco personas completan los pasos 1–5 sin ayuda. Si alguien confunde un borrador con un gasto confirmado, una tasa con un importe o un ejemplo con datos reales, corregir la pantalla y repetir esa tarea.

## Casos adversarios internos

| Caso | Resultado esperado |
| --- | --- |
| Guardar gasto de COP 45.000 como borrador | No modifica panel, presupuesto ni CSV. |
| Confirmar el mismo gasto | Aparece una sola vez en lista, panel y CSV. |
| Registrar USD 50 con tasa 4.050 COP/USD | Mostrar USD 50 original y COP 202.500 equivalente; no sumar importes originales de distintas monedas. |
| Intentar cambiar a otra empresa de demostración | Pendiente: esta versión solo permite renombrar un único espacio local y no ofrece aislamiento entre empresas. No probar con datos reales. |
| Usar comprobante de 5 MB y otro de 5 MB + 1 byte | Aceptar el primero si el formato es válido; rechazar el segundo con mensaje claro. |
| Activar audio simulado y cancelar | No crea ni confirma gasto. |
| Cuenta con COP 20.000 y gasto confirmado de COP 45.000 | Permitir saldo negativo y mostrar COP -25.000 claramente. |
| Fondo de caja menor COP 500.000 y salida COP 80.000 | Soportado COP 80.000 y disponible COP 420.000, sin doble conteo. |
| Exportar una descripción que empiece con `=` | CSV seguro para abrir en Excel, sin fórmula activa. |

Estos casos prueban el comportamiento visible del prototipo. Antes del piloto con datos reales se repetirán contra API y base de datos, incluyendo autorización por empresa, idempotencia, auditoría y controles de archivos.

## Comprobación técnica del 29 de septiembre de 2026

Pasaron pruebas de lógica ejecutadas con un DOM simulado: alta de empresa vacía, proyecto inicial, creación de proyecto, borrador excluido de confirmados, revisión y confirmación única de USD 50 a tasa 4.050 = COP 202.500, metadatos de tasa manual, CSV acorde a la búsqueda y límite de comprobante de 5.000.000 bytes. La sintaxis JavaScript de la versión final también pasó y el servidor local respondió HTTP 200.

La separación real entre empresas es un requisito del piloto funcional, no de esta vista navegable.

## Ensayo sintético con diez empresas — 30 de septiembre de 2026

Se ejecutó `execution/test_ten_companies.py` con diez perfiles de Chromium independientes y datos inventados. Los diez recorridos pasaron para alta local, proyecto, presupuesto, borrador excluido del CSV, confirmación y exportación única, recarga, COP/USD/EUR y caja negativa. La tabla de escenarios, resultados y límites se encuentra en [PRUEBA_10_EMPRESAS_2026-09-30.md](PRUEBA_10_EMPRESAS_2026-09-30.md). No es una prueba de aislamiento en servidor ni de extracción de recibos.

Una segunda ejecución con `execution/test_ten_companies_channels.py` registró 40 gastos en los diez perfiles y validó diez CSV de cuatro filas cada uno. [PRUEBA_CANALES_10_EMPRESAS_2026-09-30.md](PRUEBA_CANALES_10_EMPRESAS_2026-09-30.md) distingue los recorridos reales de los simulados o ausentes. Se añadió el nombre de la empresa de prueba a cada fila CSV y al nombre del archivo para que las diez descargas no se confundan. Esta prueba no valida recepción de correo/mensajes, transcripción de audio ni extracción de fotos/PDF.

## Comprobación en navegador real del 29 de septiembre de 2026

Se probó la URL HTTPS publicada con Chromium en un contenedor temporal de Playwright 1.63.0, en escritorio (1440 × 900) y móvil (390 × 844). Se inspeccionaron capturas de alta, panel, gastos y presupuestos. El recorrido automatizado de `execution/test_prototype_browser.py` pasó sin errores JavaScript: alta de empresa, borrador, confirmación, COP, USD 50 × 4050 = COP 202.500, presupuesto sin definir, descarga CSV, creación de proyecto con Enter, foco del diálogo, advertencia de descarte, título HTML mostrado como texto, rechazo de un gasto que redondearía a COP 0 y audio simulado. El CSV descargado se verificó como archivo de siete gastos confirmados más encabezado.

Tras sustituir la ventana emergente de autenticación básica por el formulario de acceso, se repitió el recorrido completo en escritorio y móvil: contraseña incorrecta rechazada, contraseña correcta aceptada y operaciones anteriores aún funcionales. `execution/test_prototype_login.py` verificó también cookies seguras, archivos protegidos y rutas no permitidas.

Las capturas y el CSV de la ejecución viven en `.tmp/browser/`; son temporales y se regeneran al repetir el script. Se corrigieron el título sin escapado en el detalle, el «0 % usado» engañoso cuando no hay presupuesto, la navegación de teclado en los diálogos y el descarte accidental de formularios. El presupuesto de valor cero significa «aún no definido» en esta demo.

No se ha hecho una prueba con lector de pantalla ni abierto el CSV en Microsoft Excel. Tampoco se han realizado sesiones con los cinco usuarios piloto. En móvil, el menú y la tabla de gastos requieren desplazamiento horizontal; observar si las personas descubren las opciones sin ayuda.

## Registro de cinco evaluadores reales

Usar un perfil de navegador distinto por persona y solo datos ficticios. No anotar nombres ni gastos reales en este documento; usar alias y registrar fecha, tareas completadas sin ayuda, dudas y prioridad del problema.

| Alias | Fecha | Tareas 1–5 sin ayuda | Dudas o bloqueos | Acción acordada |
| --- | --- | --- | --- | --- |
| P1 | Pendiente | Pendiente | Pendiente | Pendiente |
| P2 | Pendiente | Pendiente | Pendiente | Pendiente |
| P3 | Pendiente | Pendiente | Pendiente | Pendiente |
| P4 | Pendiente | Pendiente | Pendiente | Pendiente |
| P5 | Pendiente | Pendiente | Pendiente | Pendiente |
