# Ingesta controlada

Este workspace prepara fuentes y políticas; no realiza scraping al ejecutar los gates normales.

```powershell
npm run ingestion:plan
npm run ingestion:test
```

`ingestion:plan` es offline: lee el registro y la auditoría ya versionada, informa qué fuentes siguen bloqueadas y realiza cero solicitudes de red. Un collector futuro debe invocar `evaluateSource(..., "collect")` antes de cualquier descarga y fallar cerrado si falta dominio oficial, robots permitido, revisión aprobada o referencia de autorización.

Las capturas crudas, documentos originales y credenciales pertenecen a almacenamiento privado, no a este repositorio ni al API público. Consulta `docs/data/continuous-ingestion.md` y ADR-0004.
