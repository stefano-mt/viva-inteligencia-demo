# Contrato funcional del MVP

## Usuarios y objetivo

El usuario principal es el equipo comercial de Viva Inmobiliaria. Debe poder reconocer el mercado observable, ubicar competencia, revisar calidad, comparar alternativas y preparar una conversación en pocos minutos.

## Arquitectura de información comercial

La navegación principal se organiza por cinco tareas que el equipo comercial reconoce:

1. **Panorama:** entender la zona, la oferta y las referencias de precio.
2. **Proyectos:** explorar el inventario y abrir una ficha multifuente.
3. **Comparar:** contrastar entre dos y tres proyectos seleccionados.
4. **Seguimiento:** revisar cambios publicados que requieren atención.
5. **Decidir:** preparar una lectura comercial y comprobar si está lista para utilizarse.

Las capacidades técnicas no desaparecen, pero dejan de competir como herramientas independientes:

- **Referencias** se integra en Panorama como “Precios y oferta de la zona”.
- **Inspector** se integra en cada ficha como “Verificación de datos” y solo cobra protagonismo cuando existe una discrepancia o una fuente que revisar.
- **Checklist** se resume en Decidir como un único estado “Listo para presentar” o “Requiere validación”, acompañado por las acciones pendientes.
- **Comparar** deja de estar oculto bajo “Profundizar” y pasa a ser un destino principal enlazado desde la selección de Proyectos.

Las seis etapas históricas —Escala, Geografía, Calidad, Profundidad, Movimiento y Decisión— se conservan como recorrido guiado, no como una segunda taxonomía de herramientas. La relación completa se documenta en `commercial-information-architecture.md`.

Las URLs hash, el escenario en query string, `Ctrl/Cmd+K`, navegación por teclado y reinicio reproducible forman parte del contrato.

### Compatibilidad técnica

La simplificación de navegación no elimina contratos, motores ni rutas históricas. `#market`, `#inspector` y `#trust` se conservan como aliases compatibles hacia la sección integrada correspondiente; `#compare` conserva su identidad y se promueve. Los endpoints de referencias, expediente y evaluación permanecen disponibles para la composición de las nuevas vistas. Cualquier retiro técnico futuro requiere una deprecación independiente.

## Capacidades

- Escenario por distrito, zona analítica interna o radio; tipología, dormitorios, entrega, área y precio objetivo.
- Proyectos paginados y detalle con trazabilidad.
- Catálogo completo y vista del escenario, con ficha multifuente, características, zonas comunes y financiamiento cuando la fuente los informa.
- Verificación contextual de conflictos entre fuentes y posibilidad de uso de cada campo dentro de la ficha.
- Referencias cuantitativas y cualitativas explicables dentro de Panorama, con la metodología disponible bajo demanda.
- Comparación determinista como continuación directa de Proyectos, señales históricas y asistente sin LLM.
- Un estado de preparación comercial en Decidir que resume bloqueos y siguientes acciones sin exigir recorrer una lista técnica separada.
- Panorama de cobertura por fuente, inmobiliaria y distrito sobre el snapshot publicado. El baseline de la demo comprende 7 distritos, 433 proyectos y 157 inmobiliarias; 433 proyectos tienen observación Nexo, 15 observación estructurada de web oficial y 0 de redes sociales.

## Límites

La experiencia comercial es pública, de solo lectura y no almacena acciones del usuario. No incluye autenticación, CRM, scraping u OCR durante una consulta, geolocalización personal ni LLM. Los `POST` públicos de evaluación calculan y no persisten. El control operativo `Actualizar Data` es una excepción protegida y deshabilitada por defecto: solo despacha a un worker privado autorizado y no extrae ni publica datos dentro de la petición.

La actualización de información pertenece a un plano operativo separado y no público. Cada fuente debe tener autorización, política de acceso, captura, método y fecha auditables antes de ingresar. Nexo y las webs propias conservan observaciones independientes; una discrepancia se muestra como conflicto y no se resuelve sobrescribiendo datos.

Las cifras de cobertura describen un `datasetVersion`, no una lectura en vivo ni una promesa de vigencia. Una URL oficial vinculada no es un dato observado. El feed Nexo y las redes sociales permanecen sin soporte operativo hasta contar con autorización y canal aprobados; el sitio público de Nexo no se recolecta automáticamente.

Los importes de portales y webs propias son precios publicados. El producto no los denomina precios reales de cierre: esa métrica solo puede existir cuando se incorpore una fuente transaccional autorizada. Las cuatro zonas internas del mapa son una segmentación analítica por medianas de coordenadas y no se presentan como oficiales; una delimitación comercial u oficial futura deberá identificar su fuente, responsable y versión.

El contrato de datos inicial es 2.4.0. Cada respuesta API incluye `contractVersion` y `datasetVersion`; un frontend incompatible debe detenerse con un estado explícito.
