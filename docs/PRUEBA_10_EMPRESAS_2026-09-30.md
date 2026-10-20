# Ensayo con diez empresas ficticias — AlDía APP

Fecha: 2026-09-30. Se usaron exclusivamente nombres y cifras inventados. Ninguna empresa, persona, factura o cuenta real participó. El ensayo automático se ejecutó en Chromium contra la vista privada local `127.0.0.1:8088`, con un perfil de navegador nuevo por escenario. El guion reproducible es `execution/test_ten_companies.py`; su resultado detallado se genera en `.tmp/ten_companies_results.json`.

| Empresa ficticia | Actividad | Responsable ficticio | Proyecto de prueba | Presupuesto COP | Gasto de prueba | Importe original | Equivalente COP |
| --- | --- | --- | --- | ---: | --- | ---: | ---: |
| Demo 01 · Cafetería Nube Verde | Cafetería | Camila Prueba | Punto central | 100.000 | Insumos de desayuno | COP 45.000 | 45.000 |
| Demo 02 · Taller Rueda Clara | Taller | Daniel Ensayo | Servicio móvil | 300.000 | Repuestos de prueba | COP 325.000 | 325.000 |
| Demo 03 · Estudio Farol | Diseño | Elena Muestra | Campaña inicial | 500.000 | Licencia digital USD | USD 50 × 4.050 | 202.500 |
| Demo 04 · Panadería Trigal Azul | Panadería | Fabio Prueba | Horno piloto | 250.000 | Mantenimiento de horno | COP 98.000 | 98.000 |
| Demo 05 · Huerta Monte Claro | Agricultura | Gloria Ensayo | Entrega semanal | 220.000 | Transporte de cosecha | COP 75.000 | 75.000 |
| Demo 06 · Muebles Arrayán | Carpintería | Hugo Muestra | Sala modelo | 400.000 | Herramienta EUR | EUR 40 × 4.500 | 180.000 |
| Demo 07 · Veterinaria Nube | Veterinaria | Iris Prueba | Consultorio | 270.000 | Servicio de aseo | COP 130.000 | 130.000 |
| Demo 08 · Librería Terral | Librería | Julián Ensayo | Catálogo digital | 190.000 | Software de inventario | COP 56.000 | 56.000 |
| Demo 09 · Mensajería Río | Mensajería | Karen Muestra | Ruta norte | 200.000 | Combustible de ruta | COP 165.000 | 165.000 |
| Demo 10 · Confecciones Brisa | Confección | Luis Prueba | Colección piloto | 120.000 | Alimentación jornada | COP 39.000 | 39.000 |

## Resultado y alcance

Los diez recorridos pasaron. Cada uno creó empresa de prueba, proyecto y presupuesto; guardó un gasto como borrador; comprobó que el CSV lo excluía; lo confirmó; verificó que se exportaba una sola vez con el valor esperado; recargó el navegador y comprobó la persistencia local. No aparecieron errores JavaScript. Las conversiones USD/COP y EUR/COP produjeron COP 202.500 y COP 180.000 respectivamente. El gasto del taller superó el presupuesto sin bloquearse. Las pruebas de cafetería y mensajería mostraron saldos negativos de caja menor (COP −25.000 y COP −15.000), como se decidió para el piloto.

El resultado **no demuestra aislamiento real entre empresas**. Un perfil nuevo empieza vacío porque tiene otro almacenamiento local, pero al cambiar el nombre de la empresa en un mismo perfil los gastos anteriores permanecen. La demo no tiene cuentas, base de datos ni separación en el servidor. Los nombres de responsables de esta tabla son datos de escenario; la interfaz no permite crear esas cuentas.

También se adjuntó una «foto» ficticia en el primer escenario: no rellenó campos ni creó un gasto; solo se conservó el nombre del archivo al guardar manualmente. No se probaron OCR, audio real, correo, mensajes, respaldo ni almacenamiento persistente de comprobantes porque no existen aún en el prototipo. Por ello, estos diez recorridos **no sustituyen** las pruebas con cinco o más personas reales ni autorizan a usar gastos reales.

Después de este ensayo se amplió la exportación para añadir «Empresa de prueba» a cada fila CSV y un nombre de archivo específico por empresa. La repetición multicanal y sus diez exportaciones están descritas en [PRUEBA_CANALES_10_EMPRESAS_2026-09-30.md](PRUEBA_CANALES_10_EMPRESAS_2026-09-30.md).
