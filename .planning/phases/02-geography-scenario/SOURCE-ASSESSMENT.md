# Fase 2 — Evaluación de fuente cartográfica

## Estado

`PREFLIGHT COMPLETE — fuente técnica identificada; redistribución pendiente de autorización`

Fecha de revisión: 2026-07-28.

Este documento evalúa fuentes; no descarga, transforma ni incorpora geometría al repositorio.

## Decisión recomendada

Usar la capa distrital 2023 del INEI como **fuente técnica primaria candidata** y RENLIM como referencia legal de contraste. No se autoriza todavía publicar en GitHub Pages un GeoJSON derivado: las páginas oficiales revisadas promueven acceso, descarga y uso, pero no exponen una licencia de redistribución suficientemente explícita para este artefacto.

La implementación vigente solo puede comenzar si HUMAN-GATE-A aprueba la ruta 1 o 2 y la evidencia confirma redistribución. Las rutas posibles son:

1. confirmar por escrito con INEI la reutilización y redistribución del subconjunto simplificado, con su atribución;
2. localizar metadata oficial que declare una licencia compatible y registrar una copia o URL estable;
3. proponer una fuente alternativa con licencia explícita;
4. proponer retirar el polígono distrital de F2 y usar únicamente puntos, cuadrantes y radios analíticos derivados del snapshot.

Elegir 3 o 4 no habilita P2-01. Obliga a volver a P2-00B, actualizar `CONTEXT.md`, `UI-SPEC.md`, `PLAN.md` y este assessment, ejecutar un checker del delta y solicitar una nueva HUMAN-GATE-A. Toda aprobación favorable debe persistirse después en `APPROVAL.md` mediante P2-00C antes de P2-01. Así se evita ejecutar un plan que todavía exige polígonos después de haberlos retirado o depender de una aprobación solo conversacional.

El acceso público o la posibilidad técnica de descargar no se interpreta como permiso automático para redistribuir.

## Fuente primaria candidata

| Campo | Valor revisado |
|---|---|
| Productor | Instituto Nacional de Estadística e Informática (INEI) |
| Portal | `https://ide.inei.gob.pe/` |
| Recurso | Límites — Distrital, actualizado al 2023 |
| Descarga enlazada | `https://ide.inei.gob.pe/files/Distrito.rar` |
| Formato declarado | GeoPackage (GPKG), empaquetado por el portal |
| Cobertura | Nacional |
| Año declarado | 2023 |
| Uso previsto | Extraer solo siete distritos, reproyectar a EPSG:4326 si corresponde, simplificar y publicar un GeoJSON derivado |
| Ejecución en runtime | Ninguna; el artefacto sería estático y versionado |
| Estado legal | Pendiente de licencia/permiso de redistribución verificable |

El portal:

- ofrece descarga de geometría y tabla de atributos;
- declara la capa distrital actualizada al 2023;
- advierte que la información territorial puede contener diferencias o inconsistencias;
- no muestra, en la página revisada, una licencia expresa para republicar un derivado dentro de otro producto.

Antes de P2-01 se debe guardar evidencia de la respuesta o licencia aplicable, junto con el texto de atribución requerido.

## Referencia legal de contraste

| Campo | Valor revisado |
|---|---|
| Registro | Registro Nacional de Límites (RENLIM) |
| Responsable | PCM — Secretaría de Demarcación y Organización Territorial |
| URL | `https://www.gob.pe/98535-acceder-al-registro-nacional-de-limites-renlim` |
| Carácter | Instrumento técnico oficial, vinculante y de cumplimiento obligatorio |
| Uso en F2 | Contrastar nombres, UBIGEO y discrepancias; no asumir que su visor autoriza extracción o redistribución |

RENLIM prevalece como referencia legal de límites. Una diferencia entre la geometría candidata y RENLIM debe registrarse; no puede resolverse ocultando el problema ni llamando “oficial” al archivo derivado.

## Alternativa técnica candidata

| Campo | Valor revisado |
|---|---|
| Productor del servicio | IDEP/IGN |
| Servicio | `DATOS_GEOESPACIALES/LÍMITES/FeatureServer/5` |
| URL | `https://www.idep.gob.pe/geoportal/rest/services/DATOS_GEOESPACIALES/L%C3%8DMITES/FeatureServer/5` |
| Tipo | Feature Layer — Límite Distrital |
| Formatos de consulta | JSON, GeoJSON y PBF |
| CRS declarado | EPSG:4326 |
| Claves útiles | `UBIGEO`, `NOMBDEP`, `NOMBPROV`, `NOMBDIST`, `FUENTE` |
| Carácter mostrado | Capa padre “LÍMITES REFERENCIALES” |
| Estado legal | No aprobado: la ficha revisada no declara copyright ni licencia de redistribución |

Esta alternativa es técnicamente consumible, pero es referencial y no resuelve por sí sola el permiso de republicación. No es un fallback automático.

## Subconjunto requerido

La adquisición debe contener exactamente estos siete distritos del snapshot, identificados por UBIGEO y no por coincidencia aproximada:

| Orden por carga | Distrito de UI | Nombre administrativo esperado | UBIGEO | Proyectos observados |
|---:|---|---|---|---:|
| 1 | Miraflores | MIRAFLORES | 150122 | 90 |
| 2 | Santiago De Surco | SANTIAGO DE SURCO | 150140 | 88 |
| 3 | Jesus Maria | JESÚS MARÍA | 150113 | 67 |
| 4 | San Miguel | SAN MIGUEL | 150136 | 63 |
| 5 | Cercado de lima | LIMA | 150101 | 43 |
| 6 | Magdalena Del Mar | MAGDALENA DEL MAR | 150120 | 42 |
| 7 | San Isidro | SAN ISIDRO | 150131 | 40 |

Los nombres de UI permanecen como alias. Si algún UBIGEO no existe o no corresponde al distrito esperado, P2-01 se detiene.

## Preflight técnico que deberá ejecutar P2-01

1. Reconfirmar URL, año, términos y atribución el día de descarga.
2. Descargar una sola vez y registrar SHA-256 del archivo original.
3. Inspeccionar CRS real, nombre de capa, encoding, validez geométrica y campos.
4. Comprobar los siete UBIGEO y sus nombres esperados.
5. Comparar visual y documentalmente con RENLIM; registrar diferencias.
6. Transformar a EPSG:4326 solo mediante operación determinista documentada.
7. Conservar `Polygon` y `MultiPolygon`, huecos y orientación válida.
8. Simplificar con tolerancia máxima de `0.00005°`, desplazamiento ≤10 m y cambio de área <0.5%.
9. Publicar únicamente el subconjunto aprobado y su manifiesto de fuente.
10. Ejecutar validación de privacidad y ausencia de rutas locales.

El CRS de origen y el tamaño exacto no se congelan hasta inspeccionar el archivo descargado. Inventarlos en este preflight sería una falsa precisión.

## Atribución provisional

Hasta recibir condiciones explícitas, la UI y el manifiesto reservarán espacio para:

> Fuente cartográfica candidata: INEI, límites distritales actualizados al 2023. Geometría simplificada para visualización analítica. Verificación legal de límites: RENLIM. Los cuadrantes son analíticos y no oficiales.

Este texto es una propuesta de producto, no reemplaza la atribución o aviso que exija el titular.

## Riesgos y decisión humana

| Riesgo | Impacto | Mitigación exigida |
|---|---|---|
| Licencia de redistribución no visible | Bloquea incluir GeoJSON derivado en GitHub Pages | Permiso escrito, metadata con licencia o fuente alternativa aprobada |
| Diferencias entre INEI 2023 y RENLIM | El borde puede no representar el límite legal vigente | Mostrar carácter referencial y documentar la discrepancia |
| Servicio IDEP referencial y sin licencia visible | No sirve como sustituto legal automático | Repetir assessment y HUMAN-GATE-A |
| Nombres legacy distintos de nombres administrativos | Asignación territorial errónea | Reconciliar por UBIGEO y tabla explícita de alias |
| Simplificación excesiva | Puntos cerca del borde cambian de inclusión | Límites de desplazamiento/área y fixtures de borde |
| Dependencia de red en la demo | Fallo o cambio no controlado | Cero llamadas externas en runtime |

## Resultado del gate

- Fuente técnica primaria: **identificada**.
- Fuente legal de contraste: **identificada**.
- Formato de salida propuesto: **definido**.
- Siete distritos: **definidos**.
- Permiso de redistribución: **no confirmado**.
- Autorización para descargar/versionar: **bloqueada hasta contar con evidencia de reutilización y una HUMAN-GATE-A favorable**.

Si no se obtiene una licencia verificable, la recomendación es proponer la ruta 4 y activar el loop formal P2-00B → checker → nueva HUMAN-GATE-A; no publicar silenciosamente geometría de procedencia incierta.
