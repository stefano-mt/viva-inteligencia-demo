# Contrato funcional del MVP

## Usuarios y objetivo

El usuario principal es el equipo comercial de Viva Inmobiliaria. Debe poder reconocer el mercado observable, ubicar competencia, revisar calidad, comparar alternativas y preparar una conversación en pocos minutos.

## Superficies vigentes

- Seis etapas: Escala, Geografía, Calidad, Profundidad, Movimiento y Decisión.
- Ocho herramientas: Panorama, Proyectos, Inspector, Benchmark, Comparador, Checklist, Decidir y Seguimiento.

Las URLs hash, el escenario en query string, `Ctrl/Cmd+K`, navegación por teclado y reinicio reproducible forman parte del contrato.

## Capacidades

- Escenario por distrito, cuadrante o radio; tipología, dormitorios, entrega, área y precio objetivo.
- Proyectos paginados y detalle con trazabilidad.
- Inspector de conflictos entre fuentes y elegibilidad por campo.
- Benchmark cuantitativo y cualitativo explicable.
- Comparación determinista, señales históricas y asistente sin LLM.

## Límites

La aplicación es pública, de solo lectura y no almacena acciones del usuario. No incluye autenticación, CRM, scraping vivo, OCR vivo, geolocalización personal, LLM ni base de datos. Los `POST` calculan y no persisten.

El contrato de datos inicial es 2.4.0. Cada respuesta API incluye `contractVersion` y `datasetVersion`; un frontend incompatible debe detenerse con un estado explícito.
