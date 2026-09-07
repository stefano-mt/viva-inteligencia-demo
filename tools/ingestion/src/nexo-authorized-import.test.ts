import assert from "node:assert/strict";
import test from "node:test";
import { assertAuthorizedNexoFeed, mergeAuthorizedNexoCsv, parseCsvDocument } from "./nexo-authorized-import.js";

const header = "source,captured_at,project_id,project_name,project_email,price_min,amenities";

test("merges an authorized Nexo export without changing the current schema", () => {
  const baseline = `${header}\nNexo,2026-05-01,1,Proyecto Uno,ventas@example.test,100000,Gimnasio\nNexo,2026-05-01,2,Proyecto Dos,,200000,Lobby\n`;
  const incoming = `${header}\nNexo,2026-09-01,1,Proyecto Uno,,110000,\nNexo,2026-09-01,3,Proyecto Tres,nuevo@example.test,300000,Piscina\n`;
  const result = mergeAuthorizedNexoCsv(baseline, incoming);
  const output = parseCsvDocument(result.csv);

  assert.deepEqual(output.headers, header.split(","));
  assert.equal(result.report.updated, 1);
  assert.equal(result.report.inserted, 1);
  assert.equal(result.report.retainedFromBaseline, 1);
  assert.equal(output.rows.find((row) => row.project_id === "1")?.price_min, "110000");
  assert.equal(output.rows.find((row) => row.project_id === "1")?.amenities, "Gimnasio");
  assert.equal(output.rows.find((row) => row.project_id === "2")?.project_name, "Proyecto Dos");
  assert.equal(output.rows.find((row) => row.project_id === "3")?.project_email, "");
  assert.equal(result.report.piiValuesRemoved, 2);
  assert.match(result.report.sha256, /^[a-f0-9]{64}$/);
});

test("rejects exports that do not preserve the canonical schema", () => {
  assert.throws(
    () => mergeAuthorizedNexoCsv(`${header}\nNexo,2026-05-01,1,Uno,,1,X\n`, "project_id,project_name\n1,Uno\n"),
    /NEXO_SCHEMA_MISMATCH/,
  );
});

test("fails closed without an auditable authorization reference", () => {
  assert.throws(
    () => assertAuthorizedNexoFeed({
      sourceId: "nexo-authorized-feed",
      sourceClass: "authorized_feed",
      officialDomainConfirmed: true,
      reviewStatus: "pending",
      robotsStatus: "not_applicable",
    }),
    /NEXO_IMPORT_NOT_AUTHORIZED/,
  );
});
