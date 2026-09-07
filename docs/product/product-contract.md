# Contrato funcional del MVP

## Usuarios y objetivo

El usuario principal es el equipo comercial de Viva Inmobiliaria. Debe poder reconocer el mercado observable, ubicar competencia, revisar calidad, comparar alternativas y preparar una conversación en pocos minutos.

## Superficies vigentes

- Seis etapas: Escala, Geografía, Calidad, Profundidad, Movimiento y Decisión.
- Ocho herramientas: Panorama, Proyectos, Inspector, Benchmark, Comparador, Checklist, Decidir y Seguimiento.

Las URLs hash, el escenario en query string, `Ctrl/Cmd+K`, navegación por teclado y reinicio reproducible forman parte del contrato.

## Capacidades

- Escenario por distrito, zona analítica interna o radio; tipología, dormitorios, entrega, área y precio objetivo.
- Proyectos paginados y detalle con trazabilidad.
- Catálogo completo y vista del escenario, con ficha multifuente, características, zonas comunes y financiamiento cuando la fuente los informa.
- Inspector de conflictos entre fuentes y elegibilidad por campo.
- Benchmark cuantitativo y cualitativo explicable.
- Comparación determinista, señales históricas y asistente sin LLM.

## Límites

La aplicación es pública, de solo lectura y no almacena acciones del usuario. No incluye autenticación, CRM, scraping u OCR durante una consulta, geolocalización personal ni LLM. Los `POST` públicos calculan y no persisten.

La actualización de información pertenece a un plano operativo separado y no público. Cada fuente debe tener autorización, política de acceso, captura, método y fecha auditables antes de ingresar. Nexo y las webs propias conservan observaciones independientes; una discrepancia se muestra como conflicto y no se resuelve sobrescribiendo datos.

Los importes de portales y webs propias son precios publicados. El producto no los denomina precios reales de cierre: esa métrica solo puede existir cuando se incorpore una fuente transaccional autorizada. Las cuatro zonas internas del mapa son una segmentación analítica por medianas de coordenadas y no se presentan como oficiales; una delimitación comercial u oficial futura deberá identificar su fuente, responsable y versión.

El contrato de datos inicial es 2.4.0. Cada respuesta API incluye `contractVersion` y `datasetVersion`; un frontend incompatible debe detenerse con un estado explícito.
