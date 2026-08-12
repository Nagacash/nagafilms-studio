#!/usr/bin/env node
/**
 * Build workspace packages required by the Next.js app.
 */

const { execSync } = require("node:child_process");
const fs = require("node:fs");
const path = require("node:path");

const ROOT = process.cwd();

const PACKAGES = [
  {
    name: "studio",
    dir: "packages/studio",
    expect: "dist/tailwind.css",
  },
];

function log(...args) {
  console.log("[build-packages]", ...args);
}

function fail(msg) {
  console.error("[build-packages] FATAL:", msg);
  process.exit(1);
}

log("CWD:", ROOT);

for (const pkg of PACKAGES) {
  const abs = path.join(ROOT, pkg.dir);
  const pkgJson = path.join(abs, "package.json");

  log(`\n=== ${pkg.name} ===`);
  log("Expected dir:", abs);

  if (!fs.existsSync(abs) || !fs.existsSync(pkgJson)) {
    fail(`${pkg.dir} missing or empty`);
  }

  log("Running: pnpm --filter ./" + pkg.dir + " run build");
  try {
    execSync(`pnpm --filter ./${pkg.dir} run build`, {
      stdio: "inherit",
      cwd: ROOT,
    });
  } catch (e) {
    fail(`build failed for ${pkg.name}: ${e.message}`);
  }

  const expectAbs = path.join(abs, pkg.expect);
  if (!fs.existsSync(expectAbs)) {
    fail(`${pkg.name} build completed but expected output missing: ${expectAbs}`);
  }
  log("OK ->", expectAbs);
}

log("\nAll workspace packages built successfully.");
