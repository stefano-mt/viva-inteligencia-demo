# Reporte post-merge — Fase 8

## Identidad de la entrega

- PR: [#22 — feat: productize Viva demo with lean frontend/backend architecture](https://github.com/stefano-mt/viva-inteligencia-demo/pull/22)
- Merge: `65334e7fb2acbff0ca1fd0e225690c16269a4bf1`
- Fecha de merge: `2026-09-04T22:09:56Z`
- Contrato: `2.4.0`
- Dataset: snapshot 2.4 backend-only

## Verificación automática y artefactos

- [CI de `main` 33924328654](https://github.com/stefano-mt/viva-inteligencia-demo/actions/runs/33924328654): `success` para verificación e imágenes.
- [Publicación OCI 33924328603](https://github.com/stefano-mt/viva-inteligencia-demo/actions/runs/33924328603): `success`.
- `npm.cmd ci`: PASS, 190 paquetes auditados, 0 vulnerabilidades.
- `npm.cmd run verify`: PASS sobre una copia limpia del merge.
- Compose productivo: configuración válida.
- Despliegue Compose con el tag SHA del merge: PASS; `web` y `api` en estado `healthy`.
- E2E sobre las imágenes desplegadas: 14 superficies, sin errores de consola, hosts externos ni descarga del snapshot.
- Rendimiento `/api/v1/meta`: p95 `6.43 ms` en 40 muestras.

| Servicio | Imagen inmutable | Digest |
|---|---|---|
| Web | `ghcr.io/stefano-mt/viva-inteligencia-web:sha-65334e7fb2acbff0ca1fd0e225690c16269a4bf1` | `sha256:2d538fcfc35f0e4e97188dc12725ec575ba91eb78affccce48d2b83b86ad4c12` |
| API | `ghcr.io/stefano-mt/viva-inteligencia-api:sha-65334e7fb2acbff0ca1fd0e225690c16269a4bf1` | `sha256:db10415b53de38ee85fd1c1f67e92f76e7d7396f6afef765ce5f8f38a563c3d9` |

## Controles confirmados

- Monorepo npm/TypeScript, frontend y backend separados.
- Contratos, dominio y snapshot con fronteras ejecutables.
- Snapshot ausente de `apps/web/public` y no transferido al navegador.
- CT-A–I/P, 14 superficies, responsive, teclado, zoom 200%, privacidad y determinismo en PASS.
- Health checks, OpenAPI, seguridad, observabilidad y fallbacks cubiertos por pruebas.
- Health y metadata confirmados por el mismo origen en `http://localhost:8080`; contrato `2.4.0` y dataset esperado.
- Imágenes ejecutadas como usuarios no-root (`101` para web y `node` para API).
- Rollback sin migraciones mediante SHA anterior o tag histórico `demo-static-v1`.

## Actividades pendientes

| Actividad | Estado | Razón |
|---|---|---|
| Prueba humana integral independiente | PENDING | Debe ser realizada por una persona real; no se simula ni se infiere. |

## Veredicto vigente

**PASS técnico integral y despliegue verificado / aceptación humana pendiente.**

La arquitectura, el código y el despliegue de referencia están verificados. La Fase 8 solo pasa a `FINAL — deployed and human validated` cuando la rúbrica humana quede completa y sin campos pendientes.
