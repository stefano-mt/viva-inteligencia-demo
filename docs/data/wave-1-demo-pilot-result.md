# Resultado del piloto técnico: Nexo vs webs oficiales

Fecha de validación: 9 de septiembre de 2026

Alcance: VERSIA (Cantabria) y MONTEROSSO (Grupo Toratto)

Autorización: `USER-DEMO-FEASIBILITY-2026-09-09`, otorgada por el Product Owner exclusivamente
para esta prueba técnica no publicable.

## Conclusión

La captura y el contraste son técnicamente factibles en las dos fuentes probadas. Cada página
respondió correctamente, permitió la ruta según `robots.txt` y produjo una observación enlazada
automáticamente con el proyecto correcto de Nexo. El piloto no almacenó HTML crudo, formularios,
datos de contacto ni PII; tampoco modificó la base Nexo ni publicó los resultados.

| Proyecto | Fuente oficial | Solicitudes | Redirecciones | Campos capturados | Enlace con Nexo | Resultado |
| --- | --- | ---: | ---: | ---: | --- | --- |
| VERSIA | [Cantabria](https://cantabriainmobiliaria.pe/landing-versia/) | 2 | 0 | 5 | Proyecto 3981, automático | Factible |
| MONTEROSSO | [Grupo Toratto](https://www.grupotoratto.com/departamento/monterosso/) | 2 | 0 | 6 | Proyecto 1940, automático | Factible |

Las dos solicitudes por proyecto corresponden a `robots.txt` y a la página exacta registrada.
No hubo reintentos.

## Datos obtenidos y contraste

### VERSIA

La web oficial aportó nombre, dirección, rango de área, configuración comercial y año de entrega:

- `VERSIA` coincide con Nexo.
- La web publica `Ca. Enrique Palacios 830, Miraflores`; Nexo registra `Calle Enrique Palacios
  830, Miraflores`. El contenido apunta a la misma dirección, pero el comparador actual conserva
  ambos originales y todavía no normaliza `Ca.` como `Calle`.
- La web publica `60 m² a 98 m²`; Nexo contiene mínimo 60 y máximo 98. El piloto conserva el rango,
  pero el contrato comparativo vigente toma primero el mínimo de Nexo y por eso lo marca como
  granularidad no comparable.
- La web publica `2 y 3 ambientes`; Nexo usa `Departamento` como tipología y `2 a 3` en dormitorios.
  Son dimensiones distintas que deben mapearse de forma explícita, no igualarse por texto.
- La web indica entrega en 2028; Nexo registra `2028-03-01`. El año coincide, pero una fuente tiene
  menor precisión temporal.
- El precio promocional localizado estaba vencido. Se excluyó deliberadamente y no se presentó
  como precio actual ni como precio de cierre.

### MONTEROSSO

La web oficial aportó nombre, marca, dirección, rango de área, dormitorios y áreas comunes:

- `MONTEROSSO` coincide con Nexo.
- `Grupo Toratto` y `TORATTO GRUPO INMOBILIARIO` se reconocen como la misma empresa, conservando
  los dos textos originales.
- La web publica `Jr. Coronel Zegarra 1045–1057`; Nexo agrega `N°`. El comparador aún debe
  normalizar esa abreviatura para clasificar la coincidencia semántica.
- La web publica `69.56 m² a 69.88 m²`; Nexo contiene el mismo mínimo y máximo. Como en VERSIA,
  falta comparar rangos estructurados en vez de un rango textual contra un mínimo.
- La web indica hasta 2 dormitorios; Nexo registra `2 a 2`. Se preservan ambos valores y se evita
  convertir una expresión de rango en una igualdad no demostrada.
- La web oficial añade estacionamiento para bicicletas y terraza, además de lobby y parrilla.
  Nexo registra áreas verdes, jardín interior, lobby y zona de parrillas. Esta diferencia demuestra
  el valor de enriquecer la ficha sin sobrescribir ninguna fuente.
- No se encontró un precio actual inequívocamente asociado al proyecto en la página revisada, por
  lo que el precio Nexo se mantiene separado y no se inventa una comparación.

## Qué demuestra y qué no

El piloto demuestra acceso controlado, extracción selectiva, vinculación con Nexo, preservación de
fuentes y detección de diferencias. No autoriza una recolección recurrente, no valida todas las
inmobiliarias de la demo y no convierte estos artefactos en datos publicables.

Antes de mostrar este contraste en la plataforma se debe:

1. modelar mínimos y máximos de área/dormitorios como rangos estructurados;
2. normalizar abreviaturas de direcciones sin perder los textos originales;
3. añadir revisión humana para diferencias materiales y datos de menor precisión;
4. obtener la autorización operativa correspondiente antes de programar una ingesta recurrente;
5. promover únicamente observaciones revisadas al read model que consume la aplicación.

## Estado del siguiente paso

El 10 de septiembre de 2026 se incorporó al dominio y al read model una comparación semántica que:

- conserva los textos originales de Nexo y de la web oficial;
- normaliza abreviaturas comunes de dirección solo para decidir equivalencia;
- compara rangos estructurados de área, dormitorios y precio sin reducirlos al valor mínimo;
- separa coincidencias, aportes y datos que requieren revisión;
- rechaza como coincidencia las cadenas concatenadas o no interpretables;
- muestra en la ficha exclusivamente observaciones ya publicadas en el snapshot.

Este avance no cambia el carácter no publicable de los artefactos del piloto ni autoriza una captura
recurrente. Su eventual promoción sigue sujeta al flujo controlado de ingesta.

## Evidencia técnica

Los artefactos detallados se generan en `data/staging/pilots` y están excluidos de Git por contener
salidas temporales de una prueba no publicable. Los informes validados fueron:

- `versia.validation.report.json` — SHA-256
  `c18ae89023c143776d14ccd89eed5334d9684bdeb9e771cde1e4103e00a1fff4`.
- `monterosso.validation.report.json` — SHA-256
  `722a6fe537343441c363ec46a030323bf46e726293e7dd9cb8f69327d2e25965`.

La suite de ingesta aprobó 137 pruebas después de generar y validar los artefactos.
