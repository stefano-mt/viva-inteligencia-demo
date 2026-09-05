# Panel de seguimiento comercial

## Objetivo

Permitir que el equipo comercial reconozca cambios publicados en el distrito y alcance activo, comprenda su magnitud y abra el proyecto o la evidencia antes de tomar una decisión.

## Alcance de P8-08B

- Recupera la lectura comercial de la versión estática sobre el frontend Vite y el API vigentes.
- Traduce identificadores, campos y estados técnicos a nombres y mensajes orientados al usuario.
- Muestra territorio, corte, cobertura de alertas, señal más reciente, filtros y una lista vertical de cambios.
- Permite cambiar el territorio, filtrar por movimiento y vigencia, abrir el proyecto y preparar una decisión.
- Conserva el contrato 2.4.0, el snapshot y las reglas de negocio existentes.

El dataset actual solo demuestra cambios de precio publicado. Nuevas unidades y descuentos se muestran como cobertura no disponible; nunca como cero eventos del mercado.

## Reglas de presentación

- Un cambio de precio publicado no es un precio de cierre ni demuestra una venta.
- Una reducción de precio no se presenta como descuento salvo que la fuente publique explícitamente la promoción.
- La ausencia de señales no demuestra estabilidad; puede representar falta de dos observaciones compatibles.
- Los cuadrantes actuales son alcances analíticos. No se denominan zonas oficiales.
- Cada acción visible debe abrir una vista, modificar un filtro o llevar a un destino funcional.

## Evolución prevista

El siguiente contrato de monitoreo deberá incorporar eventos tipados para nuevas unidades, cambios de precio y descuentos publicados. También deberá registrar el alcance territorial, el objeto afectado, ambas observaciones, fuentes, evidencia, calidad y versión del dataset.

Las notificaciones automáticas requieren corridas periódicas autorizadas, persistencia privada, deduplicación y entrega auditable. No se simulan en el runtime público de solo lectura.

## Criterios de aceptación

- No aparecen IDs de proyecto, nombres de campos ni estados internos en la lectura principal.
- Las cinco señales actuales conservan valores, fechas y evidencia.
- Los filtros actualizan la lista y pueden reiniciarse.
- El proyecto puede abrirse desde la señal prioritaria y desde cualquier fila.
- La pantalla no desborda a 1440×900 ni 390×844.
- Teclado, foco visible, contraste, zoom 200% y ausencia de hosts externos continúan cubiertos por la verificación integral.

## Rollback

Revertir el commit de P8-08B restaura la tabla anterior. No requiere migraciones ni cambios del snapshot porque esta entrega no modifica contratos ni datos.
