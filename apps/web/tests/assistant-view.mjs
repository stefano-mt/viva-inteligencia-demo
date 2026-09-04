import assert from "node:assert/strict";
import fs from "node:fs/promises";
import {
  generateAssistantResponse,
  initializeScenarioData,
  setAssistantDraft,
  state,
} from "../public/js/state.js";
import {
  renderAssistant,
  renderTraceableAssistantResponse,
} from "../public/js/views/assistant.js";

const data = JSON.parse(
  await fs.readFile(
    new URL("../public/demo-data/viva-platform-demo.json", import.meta.url),
    "utf8",
  ),
);
const styles = await fs.readFile(
  new URL("../public/styles/59-assistant.css", import.meta.url),
  "utf8",
);
const manifest = await fs.readFile(
  new URL("../public/styles.css", import.meta.url),
  "utf8",
);

initializeScenarioData(data, { boundaryArtifactStatus: "valid" });
const before = JSON.stringify(state);
const idleMarkup = renderAssistant();
assert.equal(JSON.stringify(state), before, "render must remain pure");
assert.match(idleMarkup, /data-scenario-consumer="assistant"/u);
assert.match(idleMarkup, /data-assistant-status="idle"/u);
assert.match(idleMarkup, /Respuesta basada en los datos visibles/u);
assert.match(idleMarkup, /La consulta no se guarda/u);
assert.match(idleMarkup, /Ctrl \+ Enter/u);
assert.match(idleMarkup, /maxlength="500"/u);
assert.match(idleMarkup, /aria-describedby="assistant-input-help assistant-input-count assistant-input-error"/u);
assert.match(idleMarkup, /id="assistant-live" aria-live="polite"/u);
assert.equal(
  (idleMarkup.match(/class="assistant-question(?: is-active)?"/gu) ?? []).length,
  7,
);
assert.equal(
  idleMarkup.indexOf("Ver preguntas compatibles") <
    idleMarkup.indexOf("Atributos documentados"),
  true,
  "only three questions must remain visible before progressive disclosure",
);
assert.match(idleMarkup, /La respuesta aparecerá aquí/u);
assert.doesNotMatch(idleMarkup, /data-assistant-block=/u);

const marketIntent = data.assistant.intents.find(
  ({ intent_id: intentId }) => intentId === "intent:market-changes",
);
setAssistantDraft(
  marketIntent.suggested_questions[0],
  marketIntent.intent_id,
);
const response = generateAssistantResponse();
const responseMarkup = renderAssistant();
assert.match(responseMarkup, /data-assistant-status="ready"/u);
assert.match(responseMarkup, /id="assistant-response-title" tabindex="-1"/u);
assert.equal(
  (responseMarkup.match(/data-assistant-block=/gu) ?? []).length,
  6,
);
for (const title of [
  "Respuesta breve",
  "Datos usados",
  "Lectura",
  "Límites",
  "Referencias",
  "Siguiente paso",
]) {
  assert.match(responseMarkup, new RegExp(title, "u"));
}
assert.match(responseMarkup, /Anterior/u);
assert.match(responseMarkup, /Publicado/u);
assert.match(responseMarkup, /Variación/u);
assert.match(responseMarkup, /data-assistant-reference=/u);
assert.match(responseMarkup, /data-assistant-reference-route="activity"/u);
assert.match(responseMarkup, /data-assistant-route="activity"/u);
assert.match(responseMarkup, /Nueva pregunta/u);

const malicious = structuredClone(response);
malicious.blocks[0].items[0].text = '<img src=x onerror="alert(1)">';
malicious.blocks[4].items[0].label = "<script>pwned()</script>";
const safeMarkup = renderTraceableAssistantResponse(malicious);
assert.doesNotMatch(safeMarkup, /<img src=x|<script>/u);
assert.match(safeMarkup, /&lt;img src=x/u);
assert.match(safeMarkup, /&lt;script&gt;pwned/u);

setAssistantDraft("¿Cuál es la velocidad del viento?", null);
generateAssistantResponse();
assert.match(renderAssistant(), /data-assistant-status="unknown_intent"/u);
assert.match(renderAssistant(), /Pregunta fuera del catálogo/u);

assert.match(manifest, /\.\/styles\/59-assistant\.css/u);
assert.ok(
  manifest.indexOf("./styles/58-history-signals.css") <
    manifest.indexOf("./styles/59-assistant.css"),
);
assert.ok(
  manifest.indexOf("./styles/59-assistant.css") <
    manifest.indexOf("./styles/60-states.css"),
);
assert.match(styles, /--assistant-spine:\s*#00943b/iu);
assert.match(styles, /\.assistant-ledger::before/u);
assert.match(styles, /min-height:\s*(?:44|48|54|56|58)px/iu);
assert.match(styles, /@media\s*\(max-width:\s*900px\)/u);
assert.match(styles, /@media\s*\(max-width:\s*620px\)/u);
assert.match(styles, /@media\s*\(prefers-reduced-motion:\s*reduce\)/u);
assert.doesNotMatch(styles, /font-size:\s*(?:10|11|12|13)px/iu);
assert.doesNotMatch(styles, /transition:\s*all/iu);

console.log(
  "Assistant view OK: guided questions, deterministic disclosure, six-block ledger, navigation hooks, escaping and responsive CSS verified.",
);
