# Arquitectura de información comercial

## Decisión

La experiencia principal se organiza por el trabajo que realiza el equipo comercial, no por los motores técnicos que respaldan cada resultado. La navegación queda reducida a Panorama, Proyectos, Comparar, Seguimiento y Decidir.

Esta decisión simplifica la experiencia sin retirar capacidades ni contratos. Referencias, Inspector y Checklist pasan a ser información contextual en el momento en que resulta útil.

## Mapa de tareas

| Pregunta del usuario | Destino principal | Capacidad integrada |
| --- | --- | --- |
| ¿Qué ocurre en este distrito o zona? | Panorama | Oferta, cobertura, distribución y referencias de precio. |
| ¿Qué proyectos existen y qué se sabe de cada uno? | Proyectos | Ficha multifuente y verificación de datos. |
| ¿En qué se diferencian los proyectos que elegí? | Comparar | Matriz, diferencias prioritarias y límites de comparabilidad. |
| ¿Qué cambió y qué debo revisar? | Seguimiento | Nuevas observaciones, cambios publicados y evidencia. |
| ¿Qué puedo presentar y qué falta validar? | Decidir | Respuesta comercial y estado único de preparación. |

## Capacidades absorbidas

### Referencias dentro de Panorama

Panorama incluye la sección “Precios y oferta de la zona” con tamaño de muestra, rango, mediana publicada, distribución y atributos frecuentes. Los métodos estadísticos y reglas de elegibilidad quedan disponibles como detalle secundario y no forman parte de la lectura inicial.

### Verificación dentro de la ficha

La ficha presenta “Verificación de datos” junto a la comparación Nexo, web oficial y otras fuentes autorizadas. La sección muestra el valor observado, su fuente, su calidad, si puede utilizarse y qué debe revisarse. Cuando las fuentes coinciden, se resume; cuando discrepan, muestra ambas observaciones sin resolver el conflicto por sobrescritura.

La ficha conserva solo la verificación que corresponde al proyecto abierto. Los casos generales para capacitación quedan en la etapa opcional “Calidad” del Recorrido; no son un destino cotidiano del equipo comercial ni se mezclan con la ficha de otro proyecto.

### Checklist dentro de Decidir

Decidir muestra un solo estado de preparación:

- **Listo para presentar:** no existen bloqueos para el uso declarado.
- **Requiere validación:** se enumeran únicamente los bloqueos y sus acciones concretas.

Las condiciones de privacidad y límites de interpretación siguen evaluándose, pero no se muestran como tareas artificiales que el usuario no puede completar.

### Asistente guiado dentro de Decidir

Las preguntas se presentan por cuatro decisiones comerciales: mercado y precio, competencia, movimientos y preparación del argumento. Cada respuesta comienza con una lectura directa, muestra hasta tres datos clave, explica qué significa y ofrece una acción navegable. Las fuentes y fechas permanecen disponibles bajo demanda.

Las preguntas de comparación se habilitan solo después de seleccionar entre dos y tres proyectos. Las consultas sobre nuevas unidades, promociones, financiamiento, desempeño de ventas o CRM no se presentan como disponibles hasta integrar esas fuentes. La evolución hacia conversación y consultas de datos de solo lectura se documenta en [Evolución del asistente comercial](../architecture/conversational-assistant-roadmap.md).

### Comparar como destino principal

Comparar es la continuación de Proyectos. La selección visible admite entre dos y tres proyectos, conserva el orden elegido durante la sesión y permite volver a modificarla. La interfaz destaca diferencias observadas, pero no declara automáticamente un ganador.

## Compatibilidad y transición

| Ruta histórica | Comportamiento compatible |
| --- | --- |
| `#market` | Abre Panorama en la sección de precios y oferta. |
| `#inspector` | Abre la etapa opcional “Calidad” del Recorrido, donde permanecen los casos generales de verificación. |
| `#trust` | Abre Decidir y enfoca el estado de preparación. |
| `#compare` | Se mantiene y se incorpora a la navegación principal. |

Los endpoints, schemas y motores de referencias, inspección y checklist permanecen vigentes. La arquitectura de información cambia su presentación y composición, no el contrato 2.4.0 ni la trazabilidad de los resultados.

## Principio de lenguaje

La lectura principal utiliza precio publicado, proyectos utilizados, dato por validar, diferencia observada y fuente. Términos como benchmark, pairing, cuantiles, elegibilidad o códigos de expediente solo aparecen en metodología, diagnóstico técnico o auditoría.
