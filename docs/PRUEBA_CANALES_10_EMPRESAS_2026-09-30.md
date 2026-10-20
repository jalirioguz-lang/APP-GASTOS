# Ensayo de canales y descargas con diez empresas ficticias

Fecha: 2026-09-30. Datos completamente inventados. Se ejecutó `execution/test_ten_companies_channels.py` contra la vista privada local de AlDía APP, con un perfil de navegador nuevo por empresa. No se usaron correos, mensajes, recibos ni datos de clientes reales.

## Resultado comprobado

Las diez empresas del [ensayo inicial](PRUEBA_10_EMPRESAS_2026-09-30.md) registraron cuatro gastos cada una: uno manual, uno desde el recorrido de audio **simulado**, uno introducido manualmente con un archivo de imagen indicado y uno introducido manualmente con un PDF indicado. Los 40 gastos quedaron en el almacenamiento local de sus respectivos perfiles, persistieron tras recargar y aparecieron en diez CSV descargados, cuatro filas por archivo. Cada CSV incluye una columna «Empresa de prueba» y un nombre de archivo distinto por empresa; se compararon las descripciones, origen y nombres de comprobante de todas las filas. No hubo errores JavaScript.

| Vía ensayada | Empresas con gasto guardado y exportado | Lo que realmente hace la demo |
| --- | ---: | --- |
| Formulario manual | 10/10 | Guarda los campos escritos; exporta el gasto confirmado. |
| Botón de audio | 10/10 | Carga un ejemplo fijo; no graba ni transcribe. El CSV marca `audio-demo`. |
| Imagen adjunta | 10/10 | Exige rellenar el gasto a mano; conserva y exporta solo el **nombre** del archivo, no la imagen ni datos extraídos. |
| PDF adjunto | 10/10 | Exige rellenar el gasto a mano; conserva y exporta solo el **nombre** del archivo, no el PDF ni datos extraídos. |
| Mensaje | 0/10 | No hay entrada de mensajes ni integración. |
| Correo | 0/10 | No hay buzón de recepción ni integración. |

**Conclusión:** la comprobación de guardado y descarga pasó para las rutas disponibles, pero **no pasó el criterio de producto «capturar automáticamente por todos los canales»**. La app todavía no puede crear un gasto a partir de una foto, un PDF, un audio real, un mensaje o un correo. Además, «guardado» significa solo almacenamiento en ese navegador; no hay cuentas ni base de datos de empresa. El CSV no contiene los archivos adjuntos. No usar datos reales hasta construir y probar esas capacidades.

Las diez descargas se agruparon en `.tmp/aldia-10-empresas-csv-demo.zip` y el detalle legible por máquina se genera en `.tmp/ten_companies_channels_results.json`. Ambos son artefactos temporales reproducibles con el guion de prueba.
