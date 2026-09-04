import { escapeAttr, escapeHtml } from "../domain.js";

export function normalizeCommandQuery(value = "") {
  return String(value)
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLocaleLowerCase("es")
    .trim()
    .replace(/\s+/gu, " ");
}

export function filterCommandDestinations(destinations, query = "") {
  const normalizedQuery = normalizeCommandQuery(query);
  if (!normalizedQuery) return [...destinations];
  const tokens = normalizedQuery.split(" ");
  return destinations.filter((destination) => {
    const admittedTerms = destination.terms.map(normalizeCommandQuery);
    return tokens.every((token) =>
      admittedTerms.some((term) => term.includes(token)),
    );
  });
}

function optionId(destinationId) {
  return `command-option-${destinationId}`;
}

export function renderCommandMenu({
  open = false,
  destinations = [],
  query = "",
  activeIndex = 0,
} = {}) {
  if (!open) return "";
  const results = filterCommandDestinations(destinations, query);
  const boundedIndex = results.length
    ? Math.min(Math.max(activeIndex, 0), results.length - 1)
    : -1;
  const activeDestination = results[boundedIndex] ?? null;

  return `
    <dialog
      class="command-menu"
      id="command-menu-dialog"
      aria-labelledby="command-menu-title"
      aria-describedby="command-menu-description"
    >
      <div class="command-menu__shell">
        <header class="command-menu__header">
          <div>
            <span class="command-menu__eyebrow">Navegación local</span>
            <h2 id="command-menu-title">Ir a…</h2>
          </div>
          <button
            class="command-menu__close"
            id="command-menu-close"
            type="button"
            data-command-menu-close
            aria-label="Cerrar Ir a…"
          ><span aria-hidden="true">×</span></button>
        </header>

        <p id="command-menu-description">
          Navega por la demo. Busca una sección por nombre o intención.
        </p>

        <label class="command-menu__search" for="command-menu-input">
          <span class="sr-only">Ir a una sección</span>
          <svg aria-hidden="true" viewBox="0 0 24 24">
            <circle cx="11" cy="11" r="6"></circle>
            <path d="m16 16 4 4"></path>
          </svg>
          <input
            id="command-menu-input"
            type="search"
            role="combobox"
            autocomplete="off"
            spellcheck="false"
            placeholder="Ir a una sección"
            value="${escapeAttr(query)}"
            aria-autocomplete="list"
            aria-controls="command-menu-results"
            aria-expanded="true"
            aria-activedescendant="${activeDestination ? optionId(activeDestination.id) : ""}"
          />
          <kbd aria-hidden="true">Esc</kbd>
        </label>

        <div class="command-menu__results" aria-live="polite">
          <div
            class="command-menu__list"
            id="command-menu-results"
            role="listbox"
            aria-label="Secciones de la demo"
          >
            ${results.map((destination, index) => `
              <div
                class="command-menu__option ${index === boundedIndex ? "is-active" : ""}"
                id="${optionId(destination.id)}"
                role="option"
                tabindex="-1"
                aria-selected="${index === boundedIndex}"
                data-command-destination="${escapeAttr(destination.id)}"
                data-command-index="${index}"
              >
                <span class="command-menu__mark" aria-hidden="true"></span>
                <span class="command-menu__copy">
                  <strong>${escapeHtml(destination.label)}</strong>
                  <small>${escapeHtml(destination.hint)}</small>
                </span>
                <span class="command-menu__tier">${destination.tier === "primary" ? "Trabajo" : "Profundizar"}</span>
                <span class="command-menu__enter" aria-hidden="true">↵</span>
              </div>
            `).join("")}
          </div>
          ${results.length ? "" : `
            <div class="command-menu__empty" role="status">
              <strong>No hay una sección con ese término.</strong>
              <span>Prueba con mapa, proyectos o evidencia.</span>
            </div>
          `}
        </div>

        <footer class="command-menu__footer">
          <span><kbd>↑</kbd><kbd>↓</kbd> Elegir</span>
          <span><kbd>Enter</kbd> Ir</span>
          <span>Solo navega secciones; no busca datos.</span>
        </footer>
      </div>
    </dialog>
  `;
}
