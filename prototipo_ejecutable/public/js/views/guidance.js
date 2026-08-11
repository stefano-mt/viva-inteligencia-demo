import { journeyGuides, sectionGuides } from "../config.js";

const GUIDANCE_LABELS = Object.freeze({
  purpose: "Para qué sirve",
  action: "Cómo usarla",
  outcome: "Qué obtienes",
  limitation: "Qué debes tener en cuenta",
  nextStep: "Siguiente paso",
});

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function escapeAttr(value) {
  return escapeHtml(value).replaceAll("`", "&#096;");
}

function renderAction(guide) {
  if (!guide.steps?.length) return `<p>${escapeHtml(guide.action)}</p>`;
  return `
    <p>${escapeHtml(guide.action)}</p>
    <ol class="guide-steps">
      ${guide.steps.map((step) => `<li>${escapeHtml(step)}</li>`).join("")}
    </ol>
  `;
}

function renderGuidance(guide) {
  return `
    <details
      class="section-guide"
      data-guidance-kind="${escapeAttr(guide.kind)}"
      data-guidance-id="${escapeAttr(guide.id)}"
    >
      <summary>
        <span class="guide-icon" aria-hidden="true">i</span>
        <span class="guide-summary">
          <strong>Cómo usarla</strong>
          <small>${escapeHtml(guide.purpose)}</small>
        </span>
        <span class="guide-toggle" aria-hidden="true">Abrir guía</span>
      </summary>
      <div class="section-guide-body">
        <dl class="guidance-ledger">
          <div>
            <dt>${GUIDANCE_LABELS.purpose}</dt>
            <dd><p>${escapeHtml(guide.purpose)}</p></dd>
          </div>
          <div>
            <dt>${GUIDANCE_LABELS.action}</dt>
            <dd>${renderAction(guide)}</dd>
          </div>
          <div>
            <dt>${GUIDANCE_LABELS.outcome}</dt>
            <dd><p>${escapeHtml(guide.outcome)}</p></dd>
          </div>
          <div class="guidance-ledger__limit">
            <dt>${GUIDANCE_LABELS.limitation}</dt>
            <dd><p>${escapeHtml(guide.limitation)}</p></dd>
          </div>
          <div class="guidance-ledger__next">
            <dt>${GUIDANCE_LABELS.nextStep}</dt>
            <dd>
              <p>${escapeHtml(guide.nextStep)}</p>
              <a
                class="guidance-next-link"
                href="${escapeAttr(guide.nextHref)}"
                data-journey-return="${escapeAttr(guide.returnStageId ?? guide.nextStageId)}"
              >${escapeHtml(guide.nextLabel)}</a>
            </dd>
          </div>
        </dl>
      </div>
    </details>
  `;
}

export function renderSectionGuide(viewId) {
  const guide = sectionGuides[viewId] ?? sectionGuides.dashboard;
  return renderGuidance(guide);
}

export function renderJourneyGuide(stageId) {
  const guide = journeyGuides[stageId] ?? journeyGuides.scale;
  return renderGuidance(guide);
}

export function componentHelp(title, copy) {
  return `
    <details class="component-help">
      <summary aria-label="Información sobre ${escapeAttr(title)}">i</summary>
      <div class="component-help-popover" role="note">
        <strong>${escapeHtml(title)}</strong>
        <p>${escapeHtml(copy)}</p>
      </div>
    </details>
  `;
}

export function panelActions(content, helpTitle, helpCopy) {
  return `
    <div class="panel-header-actions">
      ${content || ""}
      ${componentHelp(helpTitle, helpCopy)}
    </div>
  `;
}
