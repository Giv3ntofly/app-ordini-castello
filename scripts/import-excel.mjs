import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { join } from "node:path";
const bundled = join(
  process.env.USERPROFILE || "",
  ".cache/codex-runtimes/codex-primary-runtime/dependencies/python/python.exe",
);
const python = process.env.PYTHON || (existsSync(bundled) ? bundled : "python");
const result = spawnSync(
  python,
  ["scripts/import_sheet.py", ...process.argv.slice(2)],
  { stdio: "inherit" },
);
if (result.error)
  console.error(
    "Python non disponibile. Installare Python e scripts/requirements.txt oppure impostare PYTHON.",
    result.error.message,
  );
process.exit(result.status ?? 1);
