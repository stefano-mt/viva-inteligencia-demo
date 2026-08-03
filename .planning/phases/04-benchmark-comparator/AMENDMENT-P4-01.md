# Enmienda técnica P4-01

**Autorizada:** 2026-07-31T11:36:09.8204568-05:00  
**Decisión:** D-029  
**Motivo:** el checker independiente demostró que las reglas semánticas existían solo como oracle privado de test y no eran ejecutadas por `validateRootDocument`.

## Cambio de write set

Se añade:

```text
prototipo_ejecutable/scripts/data/validate.js
```

El cambio permitido se limita a:

1. exportar una validación semántica de `benchmark`;
2. invocarla desde `validateRootDocument` cuando existen `benchmark` y `model`;
3. validar referencias y pertenencia por proyecto;
4. exigir pairing `source_paired` documentado y hechos compatibles;
5. validar unicidad y colisiones del catálogo de atributos;
6. validar por indicador la partición `input = used + missing + excluded` y que precio/m² use solo proyectos `source_paired`.

## Exclusiones

La enmienda no permite modificar writer, build, dataset público, fingerprints, runtime territorial fuera del allowlist 2.3 ni materializar datos. La divergencia temporal del SHA del schema permanece prevista hasta P4-04.

## Revalidación

P4-01 no puede cerrarse hasta que el checker independiente repita su revisión sobre el reader real y emita PASS.
