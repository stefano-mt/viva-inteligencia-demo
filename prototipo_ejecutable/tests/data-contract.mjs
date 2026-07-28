import assert from "node:assert/strict";
import fs from "node:fs/promises";

const dataUrl = new URL("../public/demo-data/viva-platform-demo.json", import.meta.url);
const data = JSON.parse(await fs.readFile(dataUrl, "utf8"));

assert.ok(Array.isArray(data.projects), "projects debe ser un arreglo");
assert.ok(data.projects.length >= 700, "La demo debe conservar al menos 700 registros de proyecto/unidad");
assert.equal(data.metadata?.counts?.projects, data.projects.length, "metadata.counts.projects debe coincidir con projects");
assert.ok(Array.isArray(data.sourceScope) && data.sourceScope.length > 0, "sourceScope no puede estar vacío");
assert.ok(Array.isArray(data.pipeline) && data.pipeline.length > 0, "pipeline no puede estar vacío");

const ids = new Set();
const requiredTextFields = ["id", "agency_name", "project_name", "district"];
for (const [index, project] of data.projects.entries()) {
  for (const field of requiredTextFields) {
    assert.equal(typeof project[field], "string", `projects[${index}].${field} debe ser texto`);
    assert.ok(project[field].trim(), `projects[${index}].${field} no puede estar vacío`);
  }
  assert.ok(!ids.has(project.id), `ID duplicado: ${project.id}`);
  ids.add(project.id);
  assert.ok(Array.isArray(project.amenities), `projects[${index}].amenities debe ser un arreglo`);
  assert.ok(Array.isArray(project.missing_required_fields), `projects[${index}].missing_required_fields debe ser un arreglo`);
}

const agencies = new Set(data.projects.map((project) => project.agency_name));
const districts = new Set(data.projects.map((project) => project.district));
assert.ok(agencies.size >= 30, "La demo debe cubrir al menos 30 inmobiliarias");
assert.ok(districts.size >= 10, "La demo debe cubrir al menos 10 distritos");

console.log(`Contrato de datos OK: ${data.projects.length} registros, ${agencies.size} inmobiliarias, ${districts.size} distritos.`);
