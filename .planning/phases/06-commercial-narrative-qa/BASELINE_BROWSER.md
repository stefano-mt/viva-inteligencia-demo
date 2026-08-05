# Fase 6 — Baseline preimplementación

**Paso:** P6-00D.

**Fecha:** 2026-08-05.

**SHA de partida:** `8e760b6`, commit que contiene HUMAN-GATE-A.

**Veredicto:** `PASS`.

## 1. Alcance

Se verificó el producto de Fase 5 antes de cualquier cambio de runtime F6:

- ocho rutas expertas: `dashboard`, `projects`, `inspector`, `market`, `compare`, `trust`, `assistant`, `activity`;
- tres viewports: desktop 1440×900, laptop 1280×720 y mobile 390×844;
- contratos, datos, determinismo, privacidad, escenarios, inspector, benchmark, histórico y asistente;
- navegación, interacciones, deep-links legacy, consola, errores de página y solicitudes externas;
- landmarks, nombres accesibles, IDs, teclado, foco y navegación móvil.

## 2. Comandos y resultados

Desde `prototipo_ejecutable/`:

```text
npm.cmd run verify
```

Resultado: exit code 0 en 2,121 segundos. Incluyó:

- sintaxis y grafo de 24 módulos: PASS;
- contratos 2.0–2.4, datos, referencias, determinismo y privacidad: PASS;
- CT-C/D/E/F/G/I/P y regresiones F2–F5: PASS;
- E2E de escenario, inspector, benchmark, comparador, actividad y asistente: PASS;
- responsive/reflow existente: PASS;
- smoke 8 rutas × 3 viewports: PASS;
- accesibilidad 8 rutas × 3 viewports: PASS;
- solicitudes externas: 0;
- errores de consola/página: 0.

La evidencia portable se regeneró con el mismo harness:

```text
EVIDENCE_DIR=<fase-6>/evidence/baseline npm.cmd run test:smoke
```

Resultado: exit code 0; 24 capturas y `sha256.json`.

## 3. Evidencia

Directorio: `evidence/baseline/`.

- 8 capturas desktop;
- 8 capturas laptop;
- 8 capturas mobile;
- hashes SHA-256 por archivo en `evidence/baseline/sha256.json`.

Inspección visual representativa:

- `desktop-dashboard.png`: mapa, selector accesible, lente territorial y posicionamiento presentes; contenido muy largo y varios CTA compiten por jerarquía, confirmando el problema F6 sin constituir regresión;
- `laptop-inspector.png`: Tipo 7, discrepancia 104.15/53.37/50.78 m², ledger y decisión visibles; alta densidad vertical preserva evidencia;
- `mobile-assistant.png`: una columna, controles operables y sin corte horizontal; la lente territorial ocupa una parte sustancial antes de la tarea principal;
- `mobile-activity.png`: señales y agenda mantienen orden vertical; longitud considerable confirma la necesidad de recorrido y divulgación progresiva.

No se detectaron solapes, overflow horizontal o texto crítico truncado en las muestras revisadas.

## 4. Baseline de producto congelado

- Contrato público: `2.4.0`.
- Modelo: 676 proyectos y 184 agencias modeladas.
- Piloto: 30 base, 22 enriched y 5 deep.
- Miraflores por defecto: 90 observados, 85 comparables y 5 por revisar.
- Inspector: 10 casos, 15 activos autorizados y Tipo 7 no elegible.
- Benchmark: 397 entradas; 0 parejas elegibles de precio/m².
- Histórico: 36 eventos; causa no observada.
- Asistente: siete intenciones, determinista y sin red.

## 5. Condición para P6-01

P6-00D pasa. P6-01 puede comenzar sobre este baseline siempre que:

1. contrato, dataset, writer, fingerprints y elegibilidad permanezcan intactos;
2. las ocho rutas sigan pasando;
3. cualquier diferencia visual futura se atribuya a un paso F6 autorizado;
4. el recorrido nuevo pase paridad con estas superficies expertas.

No se modificó ningún archivo de runtime durante P6-00C/P6-00D.
