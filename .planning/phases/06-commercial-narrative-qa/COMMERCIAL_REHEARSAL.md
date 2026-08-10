# P6-14 — Ensayo comercial humano

## Estado

**PENDIENTE DE EJECUCIÓN HUMANA INDEPENDIENTE.**

Este documento prepara el ensayo comercial bloqueante de la Fase 6. No constituye evidencia de ejecución ni autoriza declarar `PASS` sin una sesión real y sus archivos de respaldo.

## Candidato bajo prueba

- Rama: `feat/phase-6-commercial-narrative-qa`
- SHA candidato: **PENDIENTE DE REGISTRAR DESDE LA COPIA LIMPIA**
- Comando de servidor: `npm.cmd run dev`
- Ruta inicial: `http://127.0.0.1:<puerto>/#journey/scale`
- Origen requerido: copia local limpia y fijada en el commit que se desea validar.

El protocolo no fija el hash dentro de este documento porque el propio paquete forma parte del candidato. Antes de iniciar, el observador debe ejecutar y registrar:

```powershell
git status --short
git rev-parse HEAD
git rev-parse --short=12 HEAD
git remote get-url origin
```

La primera instrucción no debe producir salida. Los dos SHA obtenidos deben copiarse sin alteración a `session-metadata.json` y a `rubric.md`.

## Roles y restricciones

### Lector

- No participó en la definición, diseño, implementación ni pruebas de esta fase.
- No recibió una demostración previa del recorrido.
- Explora la interfaz sin consultar código, documentación interna ni al maker.
- Puede pensar en voz alta, hacer preguntas sobre lo que ve y decidir cuándo su recomendación está justificada.

### Observador

- Prepara la copia limpia, inicia el servidor, comparte la URL y controla el tiempo.
- Lee únicamente el prompt establecido.
- No explica controles, contenido, navegación, respuesta correcta ni significado de los datos.
- Registra acciones, respuestas y ayudas solicitadas sin reinterpretarlas durante la sesión.

### Maker

- No participa durante el ensayo.
- No responde preguntas ni interviene ante errores de navegación.
- Solo revisa el paquete de evidencia después de finalizada la sesión.

Stefano y quienes participaron en esta conversación o en el desarrollo no califican como lectores independientes; sí pueden actuar como observadores si respetan el protocolo.

## Preparación

1. Obtener una copia limpia del repositorio y fijarla en el commit que se desea validar.
2. Ejecutar los cuatro comandos de preflight y registrar sus resultados.
3. Crear `evidence/rehearsal/run-AAAA-MM-DD-alias/`; si ya existe, usar otro alias o sufijo. No sobrescribir una sesión anterior.
4. Copiar las tres plantillas dentro de la nueva carpeta y retirar `.template` de sus nombres.
5. Abrir `prototipo_ejecutable`.
6. Ejecutar `npm.cmd run dev` y registrar el puerto mostrado.
7. Abrir una ventana nueva del navegador en `http://127.0.0.1:<puerto>/#journey/scale`.
8. Confirmar que la pantalla inicial corresponde a `Etapa 1 de 6 · Escala`.
9. Preparar cronómetro y registrar solo alias o iniciales del lector; no guardar datos personales innecesarios.
10. Iniciar captura o grabación únicamente con consentimiento del lector.

## Prompt literal

El observador debe leer exactamente lo siguiente y después iniciar el cronómetro:

> Explora la demo y prepara una recomendación comercial prudente para el escenario visible. Avísame cuando puedas justificarla.

No se permiten aclaraciones posteriores. Si el lector solicita ayuda, el observador responde: `Registra qué te resulta ambiguo y continúa como lo harías por tu cuenta.` La solicitud se contabiliza, pero no se explica la solución.

## Tarea esperada

El lector debe recorrer la demo hasta poder formular y justificar una recomendación comercial prudente. La sesión debe incluir, sin intervención del maker:

1. Lectura de cobertura y denominadores.
2. Comprensión del alcance geográfico.
3. Inspección del caso Tipo 7 y su exclusión.
4. Comprensión de la diferencia respaldada por evidencia.
5. Lectura de un cambio observado sin atribuir causalidad.
6. Cierre de una decisión verificable.

## Rúbrica bloqueante

El ensayo obtiene `PASS` únicamente si satisface todos los criterios:

| Criterio | Umbral | Evidencia requerida |
| --- | --- | --- |
| Tiempo | `≤ 10:00` desde el prompt hasta “puedo justificarla” | Inicio, fin y duración registrados |
| Respuestas esperadas | `5/5` correctas | Respuesta textual literal y rubricado |
| Claims prohibidos | `0` | Transcripción o notas completas |
| Ayudas del maker | `0` | Declaración del observador |
| Recorrido crítico | Completa mapa, evidencia Tipo 7 y decisión | Capturas o grabación con orden temporal |

### Cinco respuestas esperadas

1. **Cobertura y denominadores:** distingue la oferta observada, los comparables y la profundidad de evidencia; no suma universos distintos.
2. **Alcance geográfico:** reconoce distrito, cuadrante o radio como alcance analítico del escenario y no como límite legal oficial.
3. **Tipo 7:** identifica la discrepancia `104.15 m²` frente a `53.37 m²`, conserva ambas fuentes y excluye el caso del benchmark.
4. **Diferencia respaldada:** explica que `50.78 m²` es una diferencia derivada y documentada, no una nueva área certificada.
5. **Movimiento y causalidad:** describe el cambio publicado observado, su vigencia y evidencia, y declara que la causa y el precio de cierre no están observados.

### Claims prohibidos

Cualquiera de los siguientes produce `FAIL`:

- Afirmar o estimar un precio real de cierre como dato observado.
- Atribuir causalidad a un cambio sin evidencia explícita.
- Presentar la muestra como exhaustiva del mercado inmobiliario.
- Certificar una fuente o atributo que la demo marca como no certificado.
- Mezclar o sumar `184` con `30/22/5` como si fueran un único universo.
- Presentar Tipo 7 como integrante elegible del escenario activo o del benchmark.

## Evidencia obligatoria

Guardar todos los archivos dentro de una carpeta nueva `evidence/rehearsal/run-AAAA-MM-DD-alias/` usando las plantillas incluidas:

- `session-metadata.json`: origen, SHA completo y corto, árbol limpio, comando, URL exacta, navegador, fecha, duración y alias de roles.
- `reader-response.md`: respuesta final literal y notas cronológicas.
- `rubric.md`: evaluación de cada criterio, claims prohibidos y resultado.
- Capturas o grabación consentida que demuestre inicio, mapa, Tipo 7, decisión y cierre.

No se deben subir correos, teléfonos, nombres completos, rostros ni audio sin consentimiento y necesidad explícita. Las capturas deben limitarse a la demo y al cronómetro.

## Regla de decisión

- `PASS`: cumple todos los umbrales y el paquete está completo.
- `FAIL`: incumple cualquier umbral, aparece un claim prohibido o falta evidencia.
- `INVALID`: el lector participó previamente, el SHA no coincide, la copia no estaba limpia, hubo ayuda explicativa o la sesión fue interrumpida.

Un `FAIL` o `INVALID` solo puede repetirse con un lector nuevo y una nueva carpeta de evidencia. No se reemplaza, sobrescribe ni elimina la evidencia anterior.

## Cierre pendiente

P6-14 solo se cierra cuando un revisor puede reproducir la decisión a partir de los archivos guardados y confirmar que la rúbrica fue firmada por lector y observador mediante alias o iniciales.
