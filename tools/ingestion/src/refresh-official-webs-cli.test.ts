import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
const script = path.join(path.dirname(fileURLToPath(import.meta.url)), "refresh-official-webs.js");

test("CLI refuses --pilot unless execution is explicit", async () => {
  await assert.rejects(
    execFileAsync(process.execPath, [script, "--pilot"], { encoding: "utf8" }),
    (error: unknown) => error instanceof Error && /--pilot requiere --execute/u.test(error.message),
  );
});

test("CLI refuses pilot output outside its non-publishable staging directory", async () => {
  await assert.rejects(
    execFileAsync(process.execPath, [
      script,
      "--execute",
      "--pilot",
      "--source",
      "agency-pilot",
      "--target",
      "https://pilot.example/project/demo/",
      "--product-owner-authorization",
      "PO-DEMO-PILOT-001",
      "--output",
      "data/staging/official-web-refresh.json",
    ], { encoding: "utf8" }),
    (error: unknown) => error instanceof Error && /INGESTION_PILOT_OUTPUT_INVALID/u.test(error.message),
  );
});
