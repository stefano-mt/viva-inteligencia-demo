# Flujo de selección y comparación

## Objetivo

Permitir que el equipo comercial revise la ficha de cada proyecto, elija conscientemente entre dos y tres comparables y contraste sus diferencias en una pantalla común.

## Alcance

- La selección inicia vacía al cambiar de escenario.
- Solo los proyectos del universo comparable activo pueden seleccionarse.
- La bandeja de Proyectos muestra tres posiciones, el avance y una acción única para abrir el Comparador.
- La selección se conserva al navegar entre Proyectos y Comparador durante la sesión actual; no se almacena ni se envía como preferencia de usuario.
- La ficha permite añadir o retirar el proyecto visible.
- El Comparador presenta los proyectos en columnas, destaca filas diferentes y conserva los estados de evidencia en lenguaje comercial.
- Los hallazgos, exclusiones y límites proceden del dominio y del contrato 2.4; la interfaz no decide qué alternativa es mejor.

## Criterios de aceptación

1. Con menos de dos proyectos la acción de comparar permanece deshabilitada.
2. Con dos o tres proyectos la acción abre `#compare` y conserva el orden elegido.
3. No se permite una cuarta selección.
4. Retirar un proyecto recalcula la comparación; con menos de dos vuelve al estado de orientación.
5. Precio, área, producto, ubicación, entrega, áreas comunes, acabados, estacionamientos y fuentes aparecen en la matriz cuando el contrato los entrega.
6. Los datos ausentes y los cocientes orientativos se distinguen sin exponer códigos internos.
7. Proyectos, ficha y comparación no generan desbordamiento horizontal en 1440×900 ni 390×844.

## Límites

- La selección es estado de interacción local y se pierde al recargar la aplicación.
- “Diferencia” significa que los valores publicados no coinciden; no equivale a ventaja comercial.
- Los precios son publicados. No son precios reales de cierre.
- La ausencia de un dato no significa que la característica no exista.

## Rollback

Revertir el commit del flujo restaura el comparador mínimo anterior sin alterar contratos, snapshot, API ni motores del dominio.
