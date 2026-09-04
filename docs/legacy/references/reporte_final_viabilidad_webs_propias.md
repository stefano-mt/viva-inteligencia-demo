# Reporte final de viabilidad de webs propias inmobiliarias

Run ID: webs_propias_phase10_2026-06-14T20-44-02-169Z

Fuente Fase 9: webs_propias_phase9_2026-06-14T20-43-58-350Z

Fuente Fase 8: webs_propias_phase8_2026-06-14T20-43-53-961Z

## 1. Resumen ejecutivo

Nexo queda como fuente base del MVP y las webs propias se recomiendan como fuente complementaria para enriquecer y contrastar informacion publica. Con la evidencia disponible, el alcance inicial productizable es acotado: 1 inmobiliaria entra como MVP automatizable y 4 quedan como MVP condicionado/enriquecimiento. El resto requiere completar muestra Fase 5, confirmar dominio oficial o queda fuera por bloqueo tecnico/legal.

## 2. Universo evaluado

- Proyectos Nexo base: 714
- Inmobiliarias Nexo: 192
- Distritos: 45
- Dominios oficiales/candidatos auditados: 171
- URLs candidatas de proyecto: 2273
- Muestras Fase 5: 269
- Dominios con muestra Fase 5: 134

## 3. Cobertura total

| Nivel de alcance | Cantidad |
|---|---:|
| MVP condicionado / enriquecimiento | 128 |
| Fuera de alcance | 34 |
| Backlog posterior | 20 |
| MVP automatizable | 10 |

- Score promedio del universo: 59
- Cobertura critica promedio en dominios muestreados: 53%
- Filas de cobertura por campo: 3404

## 4. Resultado por decision

| Decision | Cantidad |
|---|---:|
| Go condicionado | 128 |
| No-go técnico | 32 |
| Discovery pendiente | 20 |
| Go | 10 |
| No-go legal/operativo | 2 |

## 5. Resultado por arquetipo

| Arquetipo | Cantidad |
|---|---:|
| wordpress_sitemap_rest_html | 127 |
| embedded_json_html | 33 |
| discovery_pending | 14 |
| playwright_rendered_html | 9 |
| static_html_sitemap | 6 |
| blocked_or_restricted | 3 |

## 6. Cobertura por campo

| Campo critico | Cobertura promedio | Evidencia promedio | Primario | Enriquecimiento | Revision | No recomendado |
|---|---:|---:|---:|---:|---:|---:|
| agency_name | 100% | 100% | 136 | 0 | 0 | 12 |
| project_name | 100% | 100% | 118 | 0 | 18 | 12 |
| source_url | 100% | 100% | 136 | 0 | 0 | 12 |
| district | 88% | 89% | 101 | 1 | 30 | 16 |
| address | 80% | 84% | 80 | 7 | 37 | 24 |
| typology | 80% | 83% | 113 | 10 | 0 | 25 |
| unit_status | 57% | 67% | 70 | 29 | 0 | 49 |
| total_area | 51% | 61% | 62 | 28 | 0 | 58 |
| bedrooms | 50% | 55% | 65 | 17 | 0 | 66 |
| delivery_date | 12% | 16% | 12 | 12 | 0 | 124 |
| delivery_year | 12% | 16% | 12 | 11 | 0 | 125 |
| unit_count | 3% | 3% | 3 | 2 | 0 | 143 |
| currency | 1% | 1% | 1 | 0 | 0 | 147 |
| list_price_avg | 0% | 0% | 0 | 0 | 0 | 148 |

## 7. Diferencias Nexo vs web propia

| Clase de matching | Cantidad |
|---|---:|
| unmatched_nexo | 531 |
| unmatched_web | 163 |
| match_medium | 47 |
| match_low | 33 |
| match_high | 26 |

- Matches medios/altos: 73
- Dominios con match medio/alto: 53
- Filas que requieren revision humana: 774

| Inmobiliaria | Proyecto web | Proyecto Nexo | Score | Clase |
|---|---|---|---:|---|
| ABRIL GRUPO INMOBILIARIO | Roble | Roble | 90 | match_high |
| VIENNA GRUPO INMOBILIARIO | Sukha | Residencial Sukha | 90 | match_high |
| Grupo Magbis | Duplex 801 – Parque NU | PARQUE NU | 90 | match_high |
| Grupo Magbis | Típico 2 502 – Parque NU | PARQUE NU | 90 | match_high |
| Gratto Inmobiliaria | Benavides 1361 – | Benavides 1361 | 90 | match_high |
| BRAZIL GRUPO INMOBILIARIO | Santorini | Santorini | 90 | match_high |
| ENACORP | Proyecto Valles de Lurín | VALLES DE LURÍN 2 | 90 | match_high |
| MAXX GRUPO INMOBILIARIO | Beyond Residencial | BEYOND | 90 | match_high |
| ASTER HOMES | Proyecto Reducto | ASTER REDUCTO | 90 | match_high |
| ODIMA INMOBILIARIA | Eiko | EIKO | 90 | match_high |
| ROSIAM | Los Tucanes | Los Tucanes | 90 | match_high |
| PRAGA DESARROLLO INMOBILIARIO | Parque Acosta 131 – San Isidro | Parque Acosta 131 | 90 | match_high |

## 8. Riesgos tecnicos

- 30 inmobiliarias quedan como No-go tecnico.
- Las webs con muestra limitada no deben tratarse como cobertura global de la web completa.
- Playwright queda reservado para casos condicionados de alto valor; no es la estrategia base del MVP.
- Campos de precio, inventario y fechas de entrega muestran cobertura desigual y deben mantenerse como enriquecimiento o revision cuando no tengan evidencia suficiente.

## 9. Riesgos legales/operativos

| Flag legal/operativo | Cantidad |
|---|---:|
| clear_preliminary | 156 |
| review_required | 17 |
| not_official_or_unconfirmed | 14 |
| blocked_access | 3 |
| robots_disallow_relevant_paths | 1 |
| tos_restrictive | 1 |

No se recomienda evadir CAPTCHA, login, paywalls, bloqueos activos ni restricciones explicitas. Las filas No-go legal/operativo deben pasar por revision legal antes de cualquier automatizacion.

## 10. Alcance recomendado del MVP

| Inmobiliaria | Dominio | Arquetipo | Proyectos web | Match >= medio | Cobertura critica | Score | Condicion |
|---|---|---|---:|---:|---:|---:|---|
| HL DESARROLLOS INMOBILIARIOS | hldi.pe | wordpress_sitemap_rest_html | 22 | 0 | 79% | 80 | Incluido en MVP automatizable con muestra Fase 5, trazabilidad y score suficientes. |
| INVENT INMOBILIARIA | invent.com.pe | embedded_json_html | 24 | 1 | 71% | 84 | Incluido en MVP automatizable con muestra Fase 5, trazabilidad y score suficientes. |
| CANTABRIA | inmobiliariacantabria.com | wordpress_sitemap_rest_html | 35 | 2 | 79% | 94 | Incluido en MVP automatizable con muestra Fase 5, trazabilidad y score suficientes. |
| INHOUSE | inhouse.com.pe | embedded_json_html | 9 | 0 | 71% | 70 | Incluido en MVP automatizable con muestra Fase 5, trazabilidad y score suficientes. |
| TORATTO GRUPO INMOBILIARIO | grupotoratto.com | wordpress_sitemap_rest_html | 30 | 2 | 71% | 92 | Incluido en MVP automatizable con muestra Fase 5, trazabilidad y score suficientes. |
| MULTIURBE | multiurbe.com | wordpress_sitemap_rest_html | 35 | 2 | 75% | 93 | Incluido en MVP automatizable con muestra Fase 5, trazabilidad y score suficientes. |
| LA MURALLA | lamuralla.com.pe | wordpress_sitemap_rest_html | 3 | 0 | 79% | 72 | Incluido en MVP automatizable con muestra Fase 5, trazabilidad y score suficientes. |
| PROYEC INMOBILIARIA | proyec.com.pe | wordpress_sitemap_rest_html | 18 | 1 | 75% | 84 | Incluido en MVP automatizable con muestra Fase 5, trazabilidad y score suficientes. |
| VERDANT INMOBILIARIA | verdant.pe | wordpress_sitemap_rest_html | 6 | 0 | 75% | 73 | Incluido en MVP automatizable con muestra Fase 5, trazabilidad y score suficientes. |
| ARQUIMIA | arquimia.pe | wordpress_sitemap_rest_html | 12 | 1 | 71% | 81 | Incluido en MVP automatizable con muestra Fase 5, trazabilidad y score suficientes. |

## 11. Alcance excluido

| Motivo | Cantidad |
|---|---:|
| No-go técnico | 32 |
| No-go legal/operativo | 2 |

## 12. Backlog

| Backlog | Cantidad |
|---|---:|
| Dominio oficial pendiente | 14 |
| Muestra Fase 5 pendiente | 6 |

## 13. Proximos pasos

1. Productivizar primero Invent como extractor MVP automatizable.
2. Resolver condiciones de Padova, Pionero, Edifica y Constructora Mallorca.
3. Ejecutar Fase 5 por lotes para los 138 casos con muestra pendiente.
4. Confirmar dominios oficiales de los 17 casos aun pendientes.
5. Mantener fuera del MVP las 32 filas No-go hasta que cambie la evidencia tecnica/legal.

## Anexo: MVP condicionado

| Inmobiliaria | Dominio | Arquetipo | Proyectos web | Match >= medio | Cobertura critica | Score | Condicion |
|---|---|---|---:|---:|---:|---:|---|
| BRAZIL GRUPO INMOBILIARIO | brazilgrupoinmobiliario.com | wordpress_sitemap_rest_html | 20 | 2 | 64% | 91 | Inclusion condicionada: 1 campos requieren revision humana; 5 campos criticos no observados en muestra. |
| ACTUAL | actual.pe | wordpress_sitemap_rest_html | 40 | 2 | 64% | 90 | Inclusion condicionada: 1 campos requieren revision humana; 5 campos criticos no observados en muestra. |
| Grupo Magbis | magbisconstrucciones.com | wordpress_sitemap_rest_html | 35 | 2 | 64% | 90 | Inclusion condicionada: 5 campos criticos no observados en muestra. |
| ORTIZ INMOBILIARIA | oiperu.com | wordpress_sitemap_rest_html | 33 | 2 | 64% | 90 | Inclusion condicionada: 1 campos requieren revision humana; 5 campos criticos no observados en muestra. |
| COSAPI | cosapiinmobiliaria.com.pe | wordpress_sitemap_rest_html | 32 | 2 | 64% | 88 | Inclusion condicionada: 2 campos requieren revision humana; 5 campos criticos no observados en muestra. |
| GRANADERO INMOBILIARIA | granadero.com.pe | wordpress_sitemap_rest_html | 23 | 2 | 46% | 86 | Inclusion condicionada: 1 campos requieren revision humana; 7 campos criticos no observados en muestra. |
| GRUPO SOL | gruposol.com.pe | wordpress_sitemap_rest_html | 27 | 2 | 57% | 86 | Inclusion condicionada: 1 campos requieren revision humana; 6 campos criticos no observados en muestra. |
| TER INMOBILIARIA | terinmobiliaria.com | wordpress_sitemap_rest_html | 14 | 2 | 64% | 86 | Inclusion condicionada: 2 campos requieren revision humana; 5 campos criticos no observados en muestra. |
| LA VENTUROSA | laventurosa.com | wordpress_sitemap_rest_html | 11 | 2 | 50% | 85 | Inclusion condicionada: 1 campos requieren revision humana; 7 campos criticos no observados en muestra. |
| MS INMOBILIARIA | msinmobiliaria.pe | wordpress_sitemap_rest_html | 14 | 2 | 61% | 85 | Inclusion condicionada: 1 campos requieren revision humana; 5 campos criticos no observados en muestra. |
| NEXO INGENIERÍA | nexoingenieria.com | wordpress_sitemap_rest_html | 28 | 2 | 46% | 85 | Inclusion condicionada: 1 campos requieren revision humana; 6 campos criticos no observados en muestra. |
| ODIMA INMOBILIARIA | odima.pe | wordpress_sitemap_rest_html | 9 | 2 | 57% | 84 | Inclusion condicionada: 6 campos criticos no observados en muestra. |
| VITAIN | vitain.pe | wordpress_sitemap_rest_html | 27 | 1 | 61% | 84 | Inclusion condicionada: 3 campos requieren revision humana; 5 campos criticos no observados en muestra. |
| ENACORP | enacorp.pe | wordpress_sitemap_rest_html | 8 | 2 | 61% | 83 | Inclusion condicionada: 2 campos requieren revision humana; 5 campos criticos no observados en muestra. |
| VIENNA GRUPO INMOBILIARIO | vienna.pe | wordpress_sitemap_rest_html | 20 | 1 | 61% | 83 | Inclusion condicionada: 4 campos criticos no observados en muestra. |
| DKASA | dkasa.com.pe | wordpress_sitemap_rest_html | 38 | 1 | 64% | 82 | Inclusion condicionada: 1 campos requieren revision humana; 5 campos criticos no observados en muestra. |
| GDC INMOBILIARIA | gdcinmobiliaria.pe | wordpress_sitemap_rest_html | 36 | 1 | 64% | 82 | Inclusion condicionada: 1 campos requieren revision humana; 5 campos criticos no observados en muestra. |
| GHS CONSTRUCTORA | ghsconstructora.com | wordpress_sitemap_rest_html | 21 | 1 | 54% | 82 | Inclusion condicionada: 5 campos criticos no observados en muestra. |
| Gratto Inmobiliaria | grattoinmobiliaria.com | wordpress_sitemap_rest_html | 21 | 1 | 57% | 81 | Inclusion condicionada: 6 campos criticos no observados en muestra. |
| 2K INMOBILIARIA | 2kinmobiliaria.com | wordpress_sitemap_rest_html | 10 | 0 | 64% | 80 | Inclusion condicionada: 2 campos requieren revision humana; 5 campos criticos no observados en muestra. |
| AURORA GRUPO INMOBILIARIO | grupoaurora.pe | wordpress_sitemap_rest_html | 35 | 0 | 57% | 80 | Inclusion condicionada: 2 campos requieren revision humana; 5 campos criticos no observados en muestra. |
| EVERGRAN GRUPO INMOBILIARIO | evergran.pe | embedded_json_html | 13 | 1 | 64% | 80 | Inclusion condicionada: 2 campos requieren revision humana; 5 campos criticos no observados en muestra. |
| INMOBILIARIA ARES | inmobiliariaares.pe | wordpress_sitemap_rest_html | 4 | 1 | 64% | 80 | Inclusion condicionada: 5 campos criticos no observados en muestra. |
| MYE GRUPO INMOBILIARIO | myegrupoinmobiliario.com | wordpress_sitemap_rest_html | 6 | 1 | 57% | 80 | Inclusion condicionada: 2 campos requieren revision humana; 5 campos criticos no observados en muestra. |
| OLED INMOBILIARIA | oledinmobiliaria.com | wordpress_sitemap_rest_html | 15 | 1 | 50% | 79 | Inclusion condicionada: 1 campos requieren revision humana; 5 campos criticos no observados en muestra. |
| PADOVA | padovasac.com | static_html_sitemap | 2 | 2 | 64% | 79 | Inclusion condicionada: 2 campos requieren revision humana; 5 campos criticos no observados en muestra. |
| ROSIAM | rosiam.com | wordpress_sitemap_rest_html | 7 | 1 | 57% | 79 | Inclusion condicionada: 2 campos requieren revision humana; 6 campos criticos no observados en muestra. |
| CASAIDEAL INMOBILIARIA | casaideal.com.pe | wordpress_sitemap_rest_html | 5 | 1 | 64% | 78 | Inclusion condicionada: 1 campos requieren revision humana; 5 campos criticos no observados en muestra. |
| URBALIMA | urbalima.pe | wordpress_sitemap_rest_html | 31 | 0 | 61% | 78 | Inclusion condicionada: 2 campos requieren revision humana; 5 campos criticos no observados en muestra. |
| CHECOR INMOBILIARIA | checor.com | wordpress_sitemap_rest_html | 8 | 1 | 64% | 77 | Inclusion condicionada: 1 campos requieren revision humana; 5 campos criticos no observados en muestra. |
| DITRENZZO | ditrenzzo.com | wordpress_sitemap_rest_html | 6 | 1 | 64% | 77 | Inclusion condicionada: 1 campos requieren revision humana; 5 campos criticos no observados en muestra. |
| FRONTERA | frontera.pe | wordpress_sitemap_rest_html | 31 | 1 | 43% | 77 | Inclusion condicionada: 1 campos requieren revision humana; 6 campos criticos no observados en muestra. |
| MY HOME | myhomeoi.com | wordpress_sitemap_rest_html | 11 | 1 | 57% | 77 | Inclusion condicionada: 1 campos requieren revision humana; 5 campos criticos no observados en muestra. |
| RB GRUPO INMOBILIARIO | rbgrupoinmobiliario.pe | wordpress_sitemap_rest_html | 11 | 1 | 57% | 77 | Inclusion condicionada: 1 campos requieren revision humana; 5 campos criticos no observados en muestra. |
| V&V GRUPO INMOBILIARIO | vyv.pe | wordpress_sitemap_rest_html | 40 | 1 | 43% | 77 | Inclusion condicionada: 2 campos requieren revision humana; 7 campos criticos no observados en muestra. |
| ALBAMAR GRUPO INMOBILIARIO | albamar.com.pe | wordpress_sitemap_rest_html | 29 | 0 | 50% | 76 | Inclusion condicionada: 1 campos requieren revision humana; 7 campos criticos no observados en muestra. |
| GRUPO MG | grupomg.pe | wordpress_sitemap_rest_html | 40 | 2 | 43% | 76 | Inclusion condicionada: 1 campos requieren revision humana; 16 campos criticos no observados en muestra. |
| MAXX GRUPO INMOBILIARIO | grupomaxx.pe | wordpress_sitemap_rest_html | 9 | 1 | 50% | 76 | Inclusion condicionada: 7 campos criticos no observados en muestra. |
| ASTER HOMES | aster-homes.com | embedded_json_html | 6 | 1 | 61% | 75 | Inclusion condicionada: 3 campos criticos no observados en muestra. |
| BECA INMOBILIARIA | beca.pe | wordpress_sitemap_rest_html | 46 | 0 | 64% | 75 | Inclusion condicionada: 5 campos criticos no observados en muestra. |
| LUGANO | luganosac.com | wordpress_sitemap_rest_html | 45 | 0 | 61% | 75 | Inclusion condicionada: 5 campos criticos no observados en muestra. |
| Morada | morada.pe | wordpress_sitemap_rest_html | 16 | 0 | 57% | 75 | Inclusion condicionada: 2 campos requieren revision humana; 6 campos criticos no observados en muestra. |
| VITTORIA INMOBILIARIA | vittoriainmobiliaria.com | wordpress_sitemap_rest_html | 8 | 1 | 64% | 75 | Inclusion condicionada: 1 campos requieren revision humana; 5 campos criticos no observados en muestra. |
| Grupo Santa Maria | gruposantamaria.com | wordpress_sitemap_rest_html | 29 | 0 | 54% | 74 | Inclusion condicionada: 5 campos criticos no observados en muestra. |
| INMOVISION | inmovision.pe | wordpress_sitemap_rest_html | 12 | 0 | 43% | 74 | Inclusion condicionada: 1 campos requieren revision humana; 8 campos criticos no observados en muestra. |
| NOI INMOBILIARIA | noi.pe | wordpress_sitemap_rest_html | 34 | 0 | 57% | 74 | Inclusion condicionada: 6 campos criticos no observados en muestra. |
| VIBRANT | albamar.com.pe | wordpress_sitemap_rest_html | 11 | 0 | 50% | 74 | Inclusion condicionada: 1 campos requieren revision humana; 7 campos criticos no observados en muestra. |
| EE INMOBILIARIA | eeinmobiliaria.com | wordpress_sitemap_rest_html | 30 | 2 | 41% | 73 | Inclusion condicionada: 2 campos requieren revision humana; 16 campos criticos no observados en muestra. |
| FRANCA INMOBILIARIA | francainmobiliaria.pe | wordpress_sitemap_rest_html | 9 | 0 | 50% | 73 | Inclusion condicionada: 2 campos requieren revision humana; 6 campos criticos no observados en muestra. |
| Galeon Inmobiliaria | galeon.com.pe | wordpress_sitemap_rest_html | 20 | 0 | 57% | 73 | Inclusion condicionada: 6 campos criticos no observados en muestra. |
| GRV CORPORATIVA | grvcorp.com | wordpress_sitemap_rest_html | 29 | 0 | 50% | 73 | Inclusion condicionada: 2 campos requieren revision humana; 7 campos criticos no observados en muestra. |
| MC INVERSIONES INMOBILIARIAS | mcinversionesinmobiliarias.pe | wordpress_sitemap_rest_html | 12 | 0 | 64% | 73 | Inclusion condicionada: 4 campos criticos no observados en muestra. |
| PIONERO INMOBILIARIA | pionero.pe | wordpress_sitemap_rest_html | 3 | 2 | 57% | 73 | Inclusion condicionada: 2 campos requieren revision humana; 5 campos criticos no observados en muestra. |
| SEMBRA INMOBILIARIA | sembra.pe | wordpress_sitemap_rest_html | 31 | 0 | 57% | 73 | Inclusion condicionada: 6 campos criticos no observados en muestra. |
| ABRIL GRUPO INMOBILIARIO | abril.pe | wordpress_sitemap_rest_html | 50 | 1 | 39% | 72 | Inclusion condicionada: 2 campos requieren revision humana; 16 campos criticos no observados en muestra. |
| ANDEN | anden.com.pe | wordpress_sitemap_rest_html | 12 | 0 | 43% | 72 | Inclusion condicionada: 1 campos requieren revision humana; 6 campos criticos no observados en muestra. |
| ANDIAMO | andiamo.com.pe | embedded_json_html | 8 | 1 | 54% | 72 | Inclusion condicionada: 1 campos requieren revision humana; 5 campos criticos no observados en muestra. |
| BAUMHAUS | optimainmobiliaria.com | wordpress_sitemap_rest_html | 56 | 0 | 46% | 72 | Inclusion condicionada: 7 campos criticos no observados en muestra. |
| CALICANTO | grupocalicanto.pe | wordpress_sitemap_rest_html | 3 | 1 | 61% | 72 | Inclusion condicionada: 1 campos requieren revision humana; 3 campos criticos no observados en muestra. |
| EFRON ARQUITECTOS | efronarq.com | embedded_json_html | 7 | 1 | 57% | 72 | Inclusion condicionada: 1 campos requieren revision humana; 5 campos criticos no observados en muestra. |
| EUREKA | inmobiliariaeureka.com | wordpress_sitemap_rest_html | 7 | 0 | 57% | 72 | Inclusion condicionada: 1 campos requieren revision humana; 6 campos criticos no observados en muestra. |
| GRATIA CONSTRUCTORA | gratia.com.pe | wordpress_sitemap_rest_html | 4 | 1 | 46% | 72 | Inclusion condicionada: 6 campos criticos no observados en muestra. |
| INMGENIO | inmgenio.pe | wordpress_sitemap_rest_html | 32 | 0 | 54% | 72 | Inclusion condicionada: 2 campos requieren revision humana; 6 campos criticos no observados en muestra. |
| ARTECO | arteco.pe | wordpress_sitemap_rest_html | 13 | 0 | 50% | 71 | Inclusion condicionada: 5 campos criticos no observados en muestra. |
| BARQUEROS INMOBILIARIA | barqueros.com | wordpress_sitemap_rest_html | 10 | 0 | 57% | 71 | Inclusion condicionada: 6 campos criticos no observados en muestra. |
| EDIFICA | edifica.com.pe | embedded_json_html | 29 | 0 | 57% | 71 | Inclusion condicionada: 6 campos criticos no observados en muestra. |
| FAI INMOBILIARIA | flesan.com.pe | wordpress_sitemap_rest_html | 21 | 0 | 43% | 71 | Inclusion condicionada: 8 campos criticos no observados en muestra. |
| GRUPO T&C | grupotyc.com | wordpress_sitemap_rest_html | 30 | 0 | 45% | 71 | Inclusion condicionada: 1 campos requieren revision humana; 14 campos criticos no observados en muestra. |
| INMOBILIARIA CESIA | icesia.com | wordpress_sitemap_rest_html | 9 | 0 | 43% | 71 | Inclusion condicionada: 1 campos requieren revision humana; 8 campos criticos no observados en muestra. |
| MAAS INMOBILIARIA | maas.com.pe | wordpress_sitemap_rest_html | 30 | 0 | 43% | 71 | Inclusion condicionada: 8 campos criticos no observados en muestra. |
| MADRID INMOBILIARIA | madridinmobiliaria.pe | embedded_json_html | 13 | 0 | 64% | 71 | Inclusion condicionada: 5 campos criticos no observados en muestra. |
| SAN CHARBEL EDIFICACIONES | sancharbel.pe | embedded_json_html | 34 | 0 | 57% | 71 | Inclusion condicionada: 6 campos criticos no observados en muestra. |
| REDBAY INMOBILIARIA | redbayperu.pe | wordpress_sitemap_rest_html | 18 | 0 | 50% | 70 | Inclusion condicionada: 7 campos criticos no observados en muestra. |
| SENDA | senda.pe | wordpress_sitemap_rest_html | 43 | 0 | 43% | 70 | Inclusion condicionada: 8 campos criticos no observados en muestra. |
| TECTONICA GRUPO INMOBILIARIO | tectonica.com.pe | wordpress_sitemap_rest_html | 13 | 0 | 50% | 70 | Inclusion condicionada: 7 campos criticos no observados en muestra. |
| VIDARQ | performanceperu.pe | wordpress_sitemap_rest_html | 33 | 0 | 43% | 70 | Inclusion condicionada: 8 campos criticos no observados en muestra. |
| Alegra Inmobiliaria | marverde.pe | wordpress_sitemap_rest_html | 9 | 0 | 61% | 69 | Inclusion condicionada: 4 campos criticos no observados en muestra. |
| GRUPO TyC | grupotyc.com | wordpress_sitemap_rest_html | 10 | 1 | 45% | 69 | Inclusion condicionada: 1 campos requieren revision humana; 14 campos criticos no observados en muestra. |
| NADLAN | nadlan.com.pe | wordpress_sitemap_rest_html | 5 | 0 | 57% | 69 | Inclusion condicionada: 6 campos criticos no observados en muestra. |
| PRAGA DESARROLLO INMOBILIARIO | pragadi.com.pe | embedded_json_html | 7 | 1 | 61% | 69 | Inclusion condicionada: 5 campos criticos no observados en muestra. |
| AVENIR GRUPO INMOBILIARIO | avenir.pe | embedded_json_html | 10 | 0 | 46% | 68 | Inclusion condicionada: 1 campos requieren revision humana; 7 campos criticos no observados en muestra. |
| FLAT | flat-peru.com | wordpress_sitemap_rest_html | 2 | 0 | 43% | 68 | Inclusion condicionada: 1 campos requieren revision humana; 8 campos criticos no observados en muestra. |
| MARTE | constructoramartesa.com | wordpress_sitemap_rest_html | 2 | 0 | 50% | 68 | Inclusion condicionada: 1 campos requieren revision humana; 5 campos criticos no observados en muestra. |
| QUARK GRUPO INMOBILIARIO | quarkgrupoinmobiliario.com | wordpress_sitemap_rest_html | 10 | 0 | 39% | 68 | Inclusion condicionada: 8 campos criticos no observados en muestra. |
| Val Grupo Inmobiliario | val.com.pe | embedded_json_html | 10 | 0 | 50% | 68 | Inclusion condicionada: 7 campos criticos no observados en muestra. |
| VERONES GRUPO INMOBILIARIO | grupo-verones.com | embedded_json_html | 6 | 0 | 54% | 68 | Inclusion condicionada: 1 campos requieren revision humana; 6 campos criticos no observados en muestra. |
| YOPLAC ASOCIADOS | yoplacasociados.com | wordpress_sitemap_rest_html | 4 | 0 | 64% | 68 | Inclusion condicionada: 5 campos criticos no observados en muestra. |
| CONSTRUCTORA INARCO | inarco.com.pe | wordpress_sitemap_rest_html | 7 | 0 | 50% | 67 | Inclusion condicionada: 7 campos criticos no observados en muestra. |
| EFICAXX GRUPO INMOBILIARIO | eficaxx.pe | wordpress_sitemap_rest_html | 1 | 0 | 64% | 67 | Inclusion condicionada: 5 campos criticos no observados en muestra. |
| ORIZZONTE GRUPO INMOBILIARIO | orizzonte.pe | static_html_sitemap | 8 | 0 | 57% | 67 | Inclusion condicionada: 6 campos criticos no observados en muestra. |
| CASA BONITA | casabonita.com.pe | wordpress_sitemap_rest_html | 6 | 0 | 43% | 66 | Inclusion condicionada: 8 campos criticos no observados en muestra. |
| CONSTRUCTORA MALLORCA | constructoramallorca.com | wordpress_sitemap_rest_html | 2 | 0 | 57% | 66 | Inclusion condicionada: 5 campos criticos no observados en muestra. |
| Cresiente | esparq.com | static_html_sitemap | 6 | 0 | 50% | 66 | Inclusion condicionada: 7 campos criticos no observados en muestra. |
| DALIA INMOBILIARIA | daliainmobiliaria.com | wordpress_sitemap_rest_html | 9 | 0 | 43% | 66 | Inclusion condicionada: 7 campos criticos no observados en muestra. |
| ELSVAN CONSTRUCCIONES INMOBILIARIAS | elsvan.pe | embedded_json_html | 14 | 0 | 43% | 66 | Inclusion condicionada: 8 campos criticos no observados en muestra. |
| ESPARQ EOM | esparq.com | static_html_sitemap | 9 | 0 | 50% | 66 | Inclusion condicionada: 7 campos criticos no observados en muestra. |
| GRUPO BROCKSA | grupobrocksa.com | wordpress_sitemap_rest_html | 21 | 0 | 36% | 66 | Inclusion condicionada: 18 campos criticos no observados en muestra. |
| KALLPA | constructorakallpa.pe | wordpress_sitemap_rest_html | 4 | 0 | 64% | 66 | Inclusion condicionada: 4 campos criticos no observados en muestra. |
| LOS PORTALES | losportales.com.pe | wordpress_sitemap_rest_html | 2 | 0 | 54% | 66 | Inclusion condicionada: 6 campos criticos no observados en muestra. |
| LOS PORTALES DEPARTAMENTOS | losportales.com.pe | wordpress_sitemap_rest_html | 2 | 0 | 54% | 66 | Inclusion condicionada: 6 campos criticos no observados en muestra. |
| PAQARI INMOBILIARIA | grupopaqari.pe | wordpress_sitemap_rest_html | 2 | 0 | 61% | 66 | Inclusion condicionada: 5 campos criticos no observados en muestra. |
| PUERTA DE TIERRA | puertadetierra.pe | wordpress_sitemap_rest_html | 19 | 0 | 36% | 66 | Inclusion condicionada: 9 campos criticos no observados en muestra. |
| ANTARES CONTRATISTAS | antares.pe | wordpress_sitemap_rest_html | 2 | 0 | 50% | 65 | Inclusion condicionada: 7 campos criticos no observados en muestra. |
| INFINITY GROUP | infinitygroup.pe | embedded_json_html | 5 | 0 | 57% | 65 | Inclusion condicionada: 5 campos criticos no observados en muestra. |
| AKAMAI | alpunto.com.pe | wordpress_sitemap_rest_html | 1 | 0 | 57% | 64 | Inclusion condicionada: 6 campos criticos no observados en muestra. |
| CC17 | cc17.pe | embedded_json_html | 8 | 0 | 46% | 64 | Inclusion condicionada: 7 campos criticos no observados en muestra. |
| CONFORTA INMOBILIARIA | confortainmobiliaria.com | wordpress_sitemap_rest_html | 1 | 0 | 50% | 64 | Inclusion condicionada: 7 campos criticos no observados en muestra. |
| IN URBAN | inurban.pe | wordpress_sitemap_rest_html | 5 | 0 | 36% | 64 | Inclusion condicionada: 9 campos criticos no observados en muestra. |
| INMOBILIARIA HUANWIL | alpunto.com.pe | wordpress_sitemap_rest_html | 1 | 0 | 57% | 64 | Inclusion condicionada: 6 campos criticos no observados en muestra. |
| Mohëm Inmobiliaria | fcmconstrucciones.pe | wordpress_sitemap_rest_html | 7 | 0 | 36% | 64 | Inclusion condicionada: 9 campos criticos no observados en muestra. |
| VIVE PLM | viveplm.com | embedded_json_html | 7 | 0 | 46% | 64 | Inclusion condicionada: 7 campos criticos no observados en muestra. |
| MUNDO VERDE | inmobiliariamundoverde.com | wordpress_sitemap_rest_html | 12 | 0 | 39% | 63 | Inclusion condicionada: 17 campos criticos no observados en muestra. |
| REYNA INMOBILIARIA | reynainmobiliaria.pe | wordpress_sitemap_rest_html | 7 | 1 | 32% | 63 | Inclusion condicionada: 1 campos requieren revision humana; 18 campos criticos no observados en muestra. |
| CP BUILDING | cpbuilding.com.pe | wordpress_sitemap_rest_html | 4 | 0 | 43% | 62 | Inclusion condicionada: 8 campos criticos no observados en muestra. |
| INVERSIONES TIERRA BLANCA | tierrablanca.pe | wordpress_sitemap_rest_html | 2 | 0 | 46% | 62 | Inclusion condicionada: 5 campos criticos no observados en muestra. |
| JOPESA | jopesa.pe | wordpress_sitemap_rest_html | 2 | 0 | 43% | 62 | Inclusion condicionada: 8 campos criticos no observados en muestra. |
| PALACE | palacepropertiesperu.com | embedded_json_html | 4 | 1 | 50% | 62 | Inclusion condicionada: 1 campos requieren revision humana; 6 campos criticos no observados en muestra. |
| BALANCE GRUPO INMOBILIARIO | balance.pe | wordpress_sitemap_rest_html | 13 | 0 | 21% | 61 | Inclusion condicionada: 11 campos criticos no observados en muestra. |
| MAHPSA  CORPORACION INMOBILIARIA | mahpsa.com.pe | embedded_json_html | 2 | 0 | 71% | 61 | Inclusion condicionada: 3 campos criticos no observados en muestra. |
| STELLA INMOBILIARIA | stellainmobiliaria.pe | wordpress_sitemap_rest_html | 2 | 0 | 36% | 60 | Inclusion condicionada: 9 campos criticos no observados en muestra. |
| TRIADA | triada.com.pe | embedded_json_html | 3 | 0 | 64% | 60 | Inclusion condicionada: 5 campos criticos no observados en muestra. |
| INITALIA | initalia.pe | embedded_json_html | 1 | 0 | 43% | 59 | Inclusion condicionada: 8 campos criticos no observados en muestra. |
| Becamm Inversiones SAC | becamm.com | static_html_sitemap | 4 | 0 | 57% | 57 | Inclusion condicionada: 6 campos criticos no observados en muestra. |
| CONSTRUCTORA ATLAS | constructoraatlas.com.pe | static_html_sitemap | 2 | 0 | 50% | 56 | Inclusion condicionada: 6 campos criticos no observados en muestra. |
| GRUPO TOSCANA | constructoratoscana.com | wordpress_sitemap_rest_html | 2 | 0 | 21% | 56 | Inclusion condicionada: 11 campos criticos no observados en muestra. |
| PROMSAL | promsal.com | embedded_json_html | 1 | 0 | 29% | 54 | Inclusion condicionada: 10 campos criticos no observados en muestra. |
| ILUMINA INMOBILIARIA | ilumina.com.pe | wordpress_sitemap_rest_html | 9 | 0 | 21% | 52 | Inclusion condicionada: 11 campos criticos no observados en muestra. |
| GRUPO CHACARILLA SUR | grupochacarillasur.com | wordpress_sitemap_rest_html | 2 | 0 | 21% | 49 | Inclusion condicionada: 11 campos criticos no observados en muestra. |

## Archivos clave

- data/service_scope_matrix.csv
- reports/service_scope_final.md
- reports/webs_propias_viability_report.md
- reports/webs_propias_phase10_final_report_latest.md
- reports/backlog_mvp_webs_propias.md
