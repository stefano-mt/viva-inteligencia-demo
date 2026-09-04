import type { Route } from "./types.js";

export const JOURNEY_STAGES = [
  { id: "scale", position: 1, label: "Escala", question: "¿Qué mercado observable sostiene la lectura?" },
  { id: "geography", position: 2, label: "Geografía", question: "¿Dónde compite el proyecto?" },
  { id: "quality", position: 3, label: "Calidad", question: "¿Qué dato puede utilizarse?" },
  { id: "depth", position: 4, label: "Profundidad", question: "¿Cómo se diferencia la oferta?" },
  { id: "movement", position: 5, label: "Movimiento", question: "¿Qué cambió en el mercado?" },
  { id: "decision", position: 6, label: "Decisión", question: "¿Qué hacemos y qué no podemos afirmar?" },
] as const;

export const MODULES = new Set([
  "dashboard",
  "projects",
  "inspector",
  "market",
  "compare",
  "trust",
  "assistant",
  "activity",
]);

export function parseRoute(hash = window.location.hash): Route {
  const value = hash.replace(/^#/u, "");
  if (value.startsWith("journey/")) {
    const requested = value.split("/")[1] ?? "scale";
    return {
      kind: "journey",
      id: JOURNEY_STAGES.some(({ id }) => id === requested) ? requested : "scale",
    };
  }
  return { kind: "module", id: MODULES.has(value) ? value : "dashboard" };
}

export function routeHash(route: Route): string {
  return route.kind === "journey" ? `#journey/${route.id}` : `#${route.id}`;
}
