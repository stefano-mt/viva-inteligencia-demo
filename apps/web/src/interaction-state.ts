/** Local interaction helpers; none of these functions decides commercial eligibility. */
export interface RequestTicket<Channel extends string> {
  readonly channel: Channel;
  readonly sequence: number;
}

/** Guard success, catch AND finally commits. This discards stale work; it does not abort network I/O. */
export function createRequestSequencer<Channel extends string = string>() {
  let sequence = 0;
  const current = new Map<Channel, RequestTicket<Channel>>();
  return {
    begin(channel: Channel): RequestTicket<Channel> {
      const ticket = Object.freeze({ channel, sequence: ++sequence });
      current.set(channel, ticket);
      return ticket;
    },
    isCurrent(ticket: RequestTicket<Channel>): boolean {
      return current.get(ticket.channel) === ticket;
    },
    invalidate(channel: Channel): void {
      current.delete(channel);
    },
    invalidateAll(): void {
      current.clear();
    },
  };
}

export interface CommandDestination {
  readonly label: string;
  readonly hint?: string;
  readonly keywords?: string;
}

export function normalizeCommandQuery(text: string): string {
  return text.normalize("NFD").replace(/\p{M}/gu, "").toLocaleLowerCase("es").trim().replace(/\s+/gu, " ");
}

/** All query words must match; destination order and identity remain unchanged. */
export function filterCommandDestinations<T extends CommandDestination>(destinations: readonly T[], query: string): T[] {
  const terms = normalizeCommandQuery(query).split(" ").filter(Boolean);
  return destinations.filter((destination) => {
    const searchable = normalizeCommandQuery(`${destination.label} ${destination.hint ?? ""} ${destination.keywords ?? ""}`);
    return terms.every((term) => searchable.includes(term));
  });
}

type DraftControl = HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement;

interface TextSelection {
  start: number;
  end: number;
  direction: "forward" | "backward" | "none";
}

interface FocusSnapshot {
  selector: string;
  selection: TextSelection | null;
}

interface DraftSnapshot {
  selector: string;
  tagName: string;
  value: string;
  checked: boolean | null;
  selectedValues: string[] | null;
  disabled: boolean;
}

export interface InteractionSnapshot {
  readonly focus: FocusSnapshot | null;
  readonly drafts: readonly DraftSnapshot[];
  readonly openDialogs: readonly string[];
  readonly details: readonly { selector: string; open: boolean }[];
  readonly scroll: readonly { selector: string; top: number; left: number }[];
}

export interface CaptureInteractionOptions {
  /** Explicit opt-in only. Never include state-owned assistant text or credentials. */
  draftSelector?: string;
  /** Give scroll containers an id or data-continuity-key. Open dialogs are automatic. */
  scrollSelector?: string;
}

export interface RestoreInteractionOptions {
  restoreFocus?: boolean;
  restoreDrafts?: boolean;
  restoreDialogs?: boolean;
  restoreDetails?: boolean;
  restoreScroll?: boolean;
}

/**
 * Capture immediately before replacing the view, and restore synchronously afterwards.
 * Use only for the SAME route/scenario/project context. A context change or explicit
 * reset must not restore its old snapshot. Draft restoration is deliberately opt-in.
 * Give disclosures stable data-continuity-key values, including their project identity.
 */
export function captureInteractionSnapshot(root: HTMLElement, options: CaptureInteractionOptions = {}): InteractionSnapshot {
  const active = root.ownerDocument.activeElement;
  const focusSelector = active && root.contains(active) ? stableSelector(root, active) : null;
  const focus = focusSelector && active ? { selector: focusSelector, selection: readTextSelection(active) } : null;
  const drafts: DraftSnapshot[] = [];
  if (options.draftSelector) {
    for (const element of root.querySelectorAll<HTMLElement>(options.draftSelector)) {
      if (!isDraftControl(element) || isSensitiveOrActionInput(element)) continue;
      const selector = stableSelector(root, element);
      if (!selector) continue;
      drafts.push({
        selector,
        tagName: element.tagName,
        value: element.value,
        checked: element.tagName === "INPUT" && ["checkbox", "radio"].includes((element as HTMLInputElement).type)
          ? (element as HTMLInputElement).checked : null,
        selectedValues: element.tagName === "SELECT" && (element as HTMLSelectElement).multiple
          ? Array.from((element as HTMLSelectElement).selectedOptions, (option) => option.value) : null,
        disabled: element.disabled,
      });
    }
  }
  const openDialogs = Array.from(root.querySelectorAll<HTMLDialogElement>("dialog[open]"))
    .map((dialog) => stableSelector(root, dialog)).filter((selector): selector is string => selector !== null);
  const details = Array.from(root.querySelectorAll<HTMLDetailsElement>("details[id], details[data-continuity-key]"))
    .flatMap((element) => {
      const selector = stableSelector(root, element);
      return selector ? [{ selector, open: element.open }] : [];
    });
  const scrollElements = new Set<HTMLElement>(root.querySelectorAll<HTMLElement>("dialog[open]"));
  if (options.scrollSelector) root.querySelectorAll<HTMLElement>(options.scrollSelector).forEach((element) => scrollElements.add(element));
  const scroll = Array.from(scrollElements).flatMap((element) => {
    const selector = stableSelector(root, element);
    return selector ? [{ selector, top: element.scrollTop, left: element.scrollLeft }] : [];
  });
  return { focus, drafts, openDialogs, details, scroll };
}

/** Returns whether the prior focus was restored; the caller owns any fallback target. */
export function restoreInteractionSnapshot(root: HTMLElement, snapshot: InteractionSnapshot, options: RestoreInteractionOptions = {}): boolean {
  if (options.restoreDrafts !== false) {
    for (const draft of snapshot.drafts) {
      const element = uniqueElement(root, draft.selector);
      if (!element || !isDraftControl(element) || element.tagName !== draft.tagName || isSensitiveOrActionInput(element)) continue;
      if (draft.selectedValues && element.tagName === "SELECT") {
        for (const option of (element as HTMLSelectElement).options) option.selected = draft.selectedValues.includes(option.value);
      } else element.value = draft.value;
      if (draft.checked !== null && element.tagName === "INPUT") (element as HTMLInputElement).checked = draft.checked;
      element.disabled = draft.disabled;
    }
  }
  if (options.restoreDetails !== false) {
    for (const detail of snapshot.details) {
      const element = uniqueElement(root, detail.selector);
      if (element?.tagName === "DETAILS") (element as HTMLDetailsElement).open = detail.open;
    }
  }
  if (options.restoreDialogs !== false) {
    for (const selector of snapshot.openDialogs) {
      const element = uniqueElement(root, selector);
      if (element?.tagName === "DIALOG" && !(element as HTMLDialogElement).open && element.isConnected) {
        (element as HTMLDialogElement).showModal();
      }
    }
  }
  let focusRestored = false;
  if (options.restoreFocus !== false && snapshot.focus) {
    const element = uniqueElement(root, snapshot.focus.selector);
    if (element && !element.matches(":disabled") && !element.closest("[hidden], [inert], dialog:not([open])")) {
      element.focus({ preventScroll: true });
      focusRestored = root.ownerDocument.activeElement === element;
      if (focusRestored && snapshot.focus.selection && readTextSelection(element)) {
        const selection = snapshot.focus.selection;
        (element as HTMLInputElement | HTMLTextAreaElement).setSelectionRange(selection.start, selection.end, selection.direction);
      }
    }
  }
  if (options.restoreScroll !== false) {
    for (const scroll of snapshot.scroll) {
      const element = uniqueElement(root, scroll.selector);
      if (element) { element.scrollTop = scroll.top; element.scrollLeft = scroll.left; }
    }
  }
  return focusRestored;
}

function isDraftControl(element: Element): element is DraftControl {
  return ["INPUT", "TEXTAREA", "SELECT"].includes(element.tagName);
}

function isSensitiveOrActionInput(element: DraftControl): boolean {
  return element.tagName === "INPUT" && ["password", "file", "hidden", "submit", "reset", "button", "image"].includes((element as HTMLInputElement).type);
}

function readTextSelection(element: Element): TextSelection | null {
  if (!["INPUT", "TEXTAREA"].includes(element.tagName)) return null;
  const field = element as HTMLInputElement | HTMLTextAreaElement;
  return field.selectionStart === null || field.selectionEnd === null ? null : {
    start: field.selectionStart,
    end: field.selectionEnd,
    direction: field.selectionDirection ?? "none",
  };
}

function attributeSelector(name: string, value: string): string {
  const escaped = value.replace(/\\/gu, "\\\\").replace(/"/gu, '\\"').replace(/\n/gu, "\\a ").replace(/\r/gu, "\\d ").replace(/\f/gu, "\\c ");
  return `[${name}="${escaped}"]`;
}

function uniqueElement(root: HTMLElement, selector: string): HTMLElement | null {
  const matches = root.querySelectorAll<HTMLElement>(selector);
  return matches.length === 1 ? matches[0]! : null;
}

/** Prefer semantic identities; never restore focus by row index after filtering. */
function stableSelector(root: HTMLElement, element: Element): string | null {
  const attributes = ["id", "data-continuity-key", "data-compare-id", "data-project-detail", "data-project-remove", "data-project-page", "data-map-project", "data-assistant-category", "data-assistant-intent", "data-action", "href"];
  for (const name of attributes) {
    const value = element.getAttribute(name);
    if (!value) continue;
    const selector = `${element.tagName.toLowerCase()}${attributeSelector(name, value)}`;
    if (uniqueElement(root, selector) === element) return selector;
    const dialog = element.closest("dialog[id]");
    if (dialog) {
      const scoped = `dialog${attributeSelector("id", dialog.id)} ${selector}`;
      if (uniqueElement(root, scoped) === element) return scoped;
    }
  }
  if (isDraftControl(element) && element.name && element.form?.id) {
    const selector = `form${attributeSelector("id", element.form.id)} ${element.tagName.toLowerCase()}${attributeSelector("name", element.name)}`;
    if (uniqueElement(root, selector) === element) return selector;
  }
  if (element.tagName === "SUMMARY" && element.parentElement?.tagName === "DETAILS") {
    const disclosureSelector = stableSelector(root, element.parentElement);
    if (disclosureSelector) {
      const selector = `${disclosureSelector} > summary`;
      if (uniqueElement(root, selector) === element) return selector;
    }
  }
  return null;
}
