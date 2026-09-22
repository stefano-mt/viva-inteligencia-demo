import { describe, expect, it } from "vitest";
import { createRequestSequencer, filterCommandDestinations, normalizeCommandQuery } from "./interaction-state.js";

describe("request sequencing", () => {
  it("accepts only the latest response within a channel", () => {
    const requests = createRequestSequencer<"projects" | "detail">();
    const first = requests.begin("projects");
    const second = requests.begin("projects");
    expect(requests.isCurrent(first)).toBe(false);
    expect(requests.isCurrent(second)).toBe(true);
  });

  it("keeps independent channels current", () => {
    const requests = createRequestSequencer();
    const projects = requests.begin("projects");
    const detail = requests.begin("detail");
    expect(requests.isCurrent(projects)).toBe(true);
    expect(requests.isCurrent(detail)).toBe(true);
  });

  it("invalidates requests on context changes without reviving old tickets", () => {
    const requests = createRequestSequencer();
    const beforeReset = requests.begin("assistant");
    const oldDetail = requests.begin("detail");
    requests.invalidateAll();
    const afterReset = requests.begin("assistant");
    expect(requests.isCurrent(beforeReset)).toBe(false);
    expect(requests.isCurrent(oldDetail)).toBe(false);
    expect(requests.isCurrent(afterReset)).toBe(true);
    expect(afterReset.sequence).toBeGreaterThan(beforeReset.sequence);
  });

  it("invalidates one channel without affecting others", () => {
    const requests = createRequestSequencer();
    const assistant = requests.begin("assistant");
    const detail = requests.begin("detail");
    requests.invalidate("detail");
    expect(requests.isCurrent(detail)).toBe(false);
    expect(requests.isCurrent(assistant)).toBe(true);
  });

  it("does not accept a cloned ticket or one from another sequencer", () => {
    const first = createRequestSequencer();
    const second = createRequestSequencer();
    const ticket = first.begin("projects");
    const foreign = second.begin("projects");
    expect(first.isCurrent({ ...ticket })).toBe(false);
    expect(first.isCurrent(foreign)).toBe(false);
    expect(Object.isFrozen(ticket)).toBe(true);
  });

  it("drops an older successful response even when it finishes last", async () => {
    const requests = createRequestSequencer();
    let finishOld: (value: string) => void = () => {};
    const oldResponse = new Promise<string>((resolve) => { finishOld = resolve; });
    const committed: string[] = [];
    const oldTicket = requests.begin("detail");
    const oldResult = oldResponse.then((value) => { if (requests.isCurrent(oldTicket)) committed.push(value); });
    const newTicket = requests.begin("detail");
    if (requests.isCurrent(newTicket)) committed.push(await Promise.resolve("project B"));
    finishOld("project A");
    await oldResult;
    expect(committed).toEqual(["project B"]);
  });

  it("keeps a stale error and completion from replacing the newest request state", async () => {
    const requests = createRequestSequencer();
    let rejectOld: (error: Error) => void = () => {};
    const oldResponse = new Promise<never>((_resolve, reject) => { rejectOld = reject; });
    const oldTicket = requests.begin("projects");
    let error: string | null = null;
    let busy = true;
    const oldResult = oldResponse.catch((failure: Error) => {
      if (requests.isCurrent(oldTicket)) error = failure.message;
    }).finally(() => {
      if (requests.isCurrent(oldTicket)) busy = false;
    });
    const newTicket = requests.begin("projects");
    rejectOld(new Error("late timeout"));
    await oldResult;
    expect(error).toBeNull();
    expect(busy).toBe(true);
    expect(requests.isCurrent(newTicket)).toBe(true);
  });
});

describe("command destination filtering", () => {
  const destinations = [
    { hash: "#dashboard", label: "Panorama", hint: "Zona, precios y oferta" },
    { hash: "#projects", label: "Proyectos", hint: "Catálogo y fichas" },
    { hash: "#assistant", label: "Decidir", hint: "Argumento comercial", keywords: "decisión estrategia" },
    { hash: "#journey/quality", label: "Recorrido · Calidad", hint: "¿Qué dato puede utilizarse?" },
  ];

  it("normalizes accents, casing and repeated whitespace", () => {
    expect(normalizeCommandQuery("  DECISIÓN\t  COMERCIAL\n")).toBe("decision comercial");
    expect(normalizeCommandQuery("CatA\u0301logo")).toBe("catalogo");
  });

  it("finds labels, descriptions and synonyms with unaccented input", () => {
    expect(filterCommandDestinations(destinations, "catalogo")).toEqual([destinations[1]]);
    expect(filterCommandDestinations(destinations, "DECISION")).toEqual([destinations[2]]);
    expect(filterCommandDestinations(destinations, "calidad")).toEqual([destinations[3]]);
  });

  it("requires all query terms and does not interpret regular expressions", () => {
    expect(filterCommandDestinations(destinations, "oferta zona")).toEqual([destinations[0]]);
    expect(filterCommandDestinations(destinations, "oferta fichas")).toEqual([]);
    expect(filterCommandDestinations(destinations, ".*")).toEqual([]);
  });

  it("keeps destination order and objects without mutating input", () => {
    const frozen = Object.freeze(destinations.map((destination) => Object.freeze({ ...destination })));
    const result = filterCommandDestinations(frozen, "  ");
    expect(result).toEqual(frozen);
    expect(result).not.toBe(frozen);
    expect(result[0]).toBe(frozen[0]);
  });

  it("supports destinations without optional search metadata", () => {
    expect(filterCommandDestinations([{ label: "Comparar" }], "COMPARAR")).toEqual([{ label: "Comparar" }]);
    expect(filterCommandDestinations([], "proyectos")).toEqual([]);
  });
});
