# P6-20 — Protocolo archivado de testing humano integral

## Estado

**WAIVED / NOT RUN por D-044.**

Este documento conserva el protocolo que habría gobernado P6-20. No constituye evidencia de ejecución y no autoriza declarar `PASS` ni aceptación humana.

P6-14 y P6-20 quedaron `WAIVED / NOT RUN` por D-044. `R6-H1 — validación humana diferida` fue aceptado por el Product Owner como riesgo residual externo al cierre del plan. Una eventual aplicación futura de este protocolo será una UAT nueva y separada.

## Artefacto público bajo prueba

| Campo | Valor requerido |
|---|---|
| Repositorio | `stefano-mt/viva-inteligencia-demo` |
| Rama desplegada | `main` |
| PR documental previo | [#18](https://github.com/stefano-mt/viva-inteligencia-demo/pull/18), `MERGED` |
| SHA completo desplegado | `1b33bd682b63673e4bcda5c7a8875142ff351b34` |
| SHA funcional contenido | `12cefbf82a4971d75e1578d962f510b06fc0b457` |
| Workflow Pages | [run 31540605465](https://github.com/stefano-mt/viva-inteligencia-demo/actions/runs/31540605465), `success` |
| URL inicial exacta | `https://stefano-mt.github.io/viva-inteligencia-demo/#journey/scale` |
| Contrato público | `2.4.0` |

El SHA `1b33bd6` corresponde al merge documental de P6-19. Su árbol conserva el runtime funcional de `12cefbf`; GitHub Pages volvió a desplegarlo mediante el run #19. La sesión debe usar la URL pública, no localhost, una rama de feature ni una reconstrucción local.

Si `main` o Pages cambian antes de iniciar la sesión, el observador debe detenerse. Primero se registra el nuevo SHA desplegado y se verifica que el runtime siga siendo el aprobado. No se corrige el SHA de este documento en silencio.

## Roles y restricciones

### Lector

- Es una persona real y nueva para esta fase.
- No participó en definición, diseño, implementación, pruebas técnicas ni conversaciones de desarrollo.
- No recibió una demostración previa del recorrido.
- Explora únicamente la interfaz pública; no consulta código, documentación interna ni al maker.
- Puede pensar en voz alta y decidir cuándo su recomendación está justificada.

Stefano y cualquier persona que haya participado en este desarrollo o en los ensayos anteriores no califican como lectores independientes.

### Observador

- Confirma URL, SHA desplegado, workflow y estado inicial antes de la sesión.
- Comparte únicamente la URL y lee el prompt literal.
- Inicia y detiene el cronómetro.
- No explica controles, contenido, navegación, respuestas ni significado de los datos.
- Registra acciones, citas y solicitudes de ayuda sin reinterpretarlas durante la sesión.
- Puede ser Stefano si respeta estrictamente estas restricciones.

### Maker

- No participa durante la sesión.
- No responde preguntas ni interviene ante errores de navegación.
- Solo revisa el paquete cuando el lector ya terminó y la respuesta literal quedó guardada.

## Preflight obligatorio

El observador completa estos pasos antes de leer el prompt:

1. Abrir el [run 31540605465](https://github.com/stefano-mt/viva-inteligencia-demo/actions/runs/31540605465) y confirmar `success` para `1b33bd682b63673e4bcda5c7a8875142ff351b34`.
2. Abrir `https://stefano-mt.github.io/viva-inteligencia-demo/#journey/scale` en una ventana nueva o perfil sin estado previo de la demo.
3. Confirmar `Etapa 1 de 6 · Escala` y el escenario `Miraflores · Distrito completo`.
4. Confirmar que el lector cumple independencia y que no vio una demostración previa.
5. Crear una carpeta nueva `evidence/rehearsal/run-AAAA-MM-DD-alias/`. Si existe, usar otro alias o sufijo; nunca sobrescribirla.
6. Copiar las plantillas como `session-metadata.json`, `reader-response.md` y `rubric.md` dentro de esa carpeta.
7. En `session-metadata.json`, sustituir el preflight local por URL pública, SHA desplegado, run de Pages y confirmación de estado inicial.
8. Preparar cronómetro y registrar únicamente alias o iniciales; no guardar PII innecesaria.
9. Solicitar consentimiento antes de capturar pantalla o grabar. Sin consentimiento, usar capturas de la demo y notas cronológicas sin voz, rostro o datos personales.
10. Cerrar cualquier documento con respuestas esperadas antes de entregar el control al lector.

## Prompt literal

El observador lee exactamente lo siguiente e inicia el cronómetro al terminar:

> Explora la demo y prepara una recomendación comercial prudente para el escenario visible. Avísame cuando puedas justificarla.

No se permiten aclaraciones posteriores. Si el lector solicita ayuda, el observador responde únicamente:

> Registra qué te resulta ambiguo y continúa como lo harías por tu cuenta.

La solicitud se contabiliza; no se explica la solución.

## Recorrido esperado, no revelado al lector

El lector decide cómo navegar. Para que la sesión sea aprobable, su recorrido y respuesta deben demostrar:

1. Lectura de cobertura y denominadores.
2. Comprensión del alcance geográfico y uso del mapa.
3. Inspección del caso Tipo 7 y su exclusión.
4. Comprensión de la diferencia respaldada por evidencia.
5. Lectura de un cambio observado sin atribuir causalidad.
6. Cierre de una decisión verificable usando Asistente o Checklist.

El observador no comparte esta lista antes ni durante la sesión.

## Rúbrica archivada para una UAT futura

Si este protocolo se reutiliza en una UAT futura, esa sesión obtiene `PASS` únicamente si todos los criterios pasan:

| Criterio | Umbral | Evidencia requerida |
|---|---|---|
| Tiempo | `≤ 10:00` desde el prompt hasta “puedo justificarla” | Inicio, fin y duración |
| Respuestas esperadas | `5/5` correctas | Respuesta final literal y rubricado |
| Claims prohibidos | `0` | Notas completas o transcripción |
| Ayudas del maker | `0` | Declaración del observador |
| Recorrido crítico | Completa mapa, Tipo 7 y decisión | Evidencia con orden temporal |
| Integridad del despliegue | URL y SHA coinciden con el preflight | Metadata y workflow |

### Cinco respuestas esperadas

1. **Cobertura y denominadores:** distingue oferta observada, comparables y profundidad de evidencia; no suma universos distintos.
2. **Alcance geográfico:** reconoce distrito, cuadrante o radio como alcance analítico y no como límite legal oficial.
3. **Tipo 7:** identifica `104.15 m²` frente a `53.37 m²`, conserva ambas fuentes y excluye el caso del benchmark.
4. **Diferencia respaldada:** explica que `50.78 m²` es una diferencia derivada y documentada, no una nueva área certificada.
5. **Movimiento y causalidad:** describe el cambio publicado, su vigencia y evidencia, y declara que causa y precio de cierre no están observados.

### Claims prohibidos

Cualquiera de los siguientes produce `FAIL`:

- afirmar o estimar un precio real de cierre como dato observado;
- atribuir causalidad a un cambio sin evidencia explícita;
- presentar la muestra como exhaustiva del mercado;
- certificar una fuente o atributo marcado como no certificado;
- mezclar o sumar `184` con `30/22/5` como un único universo;
- presentar Tipo 7 como elegible en el escenario activo o benchmark.

## Evidencia obligatoria

Cada sesión usa una carpeta nueva `evidence/rehearsal/run-AAAA-MM-DD-alias/` con:

- `session-metadata.json`: estado, URL, SHA desplegado, workflow, fecha, navegador, alias, independencia, consentimiento, inicio, fin, duración y ayudas;
- `reader-response.md`: registro cronológico, ambigüedades y respuesta final literal sin correcciones;
- `rubric.md`: integridad, siete criterios, seis claims prohibidos y veredicto;
- evidencia visual consentida del inicio, mapa, Tipo 7, decisión y cierre.

No subir correos, teléfonos, nombres completos, rostros ni audio sin consentimiento y necesidad. Las capturas deben limitarse a la demo y al cronómetro.

## Regla de decisión

- `PASS`: cumple todos los umbrales y el paquete es completo y reproducible.
- `FAIL`: incumple cualquier umbral, aparece un claim prohibido o falta evidencia requerida.
- `INVALID`: el lector no es independiente, el SHA/URL no coincide, hubo ayuda explicativa, se usó estado previo no controlado o la sesión fue interrumpida.

Un `FAIL` o `INVALID` solo puede repetirse con otra persona y una carpeta nueva. La evidencia anterior se conserva; no se reemplaza, sobrescribe ni elimina.

## Cierre

Después de la sesión:

1. lector y observador rubrican mediante alias o iniciales;
2. un revisor contrasta metadata, respuesta, rúbrica y evidencia;
3. `FINAL_HUMAN_ACCEPTANCE.md` registra `PASS`, `FAIL` o `INVALID` sin reinterpretar la respuesta;
4. el `PASS` de una UAT futura complementa el cierre técnico con evidencia humana; D-044 ya cerró este plan mediante exención y no debe reescribirse;
5. el resultado se integra mediante una rama y PR documentales separados, con merge humano.
