#!/usr/bin/env node
/**
 * Build all workspace packages required by the Next.js app.
 *
 * Designed to fail loudly on Vercel with diagnostic output if a submodule
 * (Vibe-Workflow) is missing or a build silently produces no dist.
 */

const { execSync } = require("node:child_process");
const fs = require("node:fs");
const path = require("node:path");

const ROOT = process.cwd();

const PACKAGES = [
  {
    name: "workflow-builder",
    dir: "packages/Vibe-Workflow/packages/workflow-builder",
    expect: "dist/tailwind.css",
  },
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
log("Top-level packages/ contents:");
try {
  for (const entry of fs.readdirSync(path.join(ROOT, "packages"))) {
    log("  -", entry);
  }
} catch (e) {
  fail("packages/ directory missing: " + e.message);
}

// Ensure git submodules are checked out. Vercel sometimes does not
// initialize submodules even when they are registered in the git index.
const needsSubmodules = PACKAGES.some(
  (p) => !fs.existsSync(path.join(ROOT, p.dir, "package.json"))
);
if (needsSubmodules) {
  log("\nOne or more submodule packages missing. Running submodule init...");
  try {
    execSync("git submodule sync --recursive", { stdio: "inherit", cwd: ROOT });
    execSync("git submodule update --init --recursive --force", {
      stdio: "inherit",
      cwd: ROOT,
    });
  } catch (e) {
    fail(
      "git submodule update failed: " +
        e.message +
        "\nIf running on Vercel, check that the submodule URLs are publicly reachable " +
        "or that the deploy has access to private submodule repositories."
    );
  }
  log("Re-listing packages/ after submodule init:");
  for (const entry of fs.readdirSync(path.join(ROOT, "packages"))) {
    log("  -", entry);
  }

  // Submodule contents changed — install workspace deps now that they exist.
  log("\nRunning pnpm install to wire up newly-checked-out workspace packages...");
  try {
    execSync("pnpm install --no-frozen-lockfile", {
      stdio: "inherit",
      cwd: ROOT,
    });
  } catch (e) {
    fail("pnpm install after submodule init failed: " + e.message);
  }
}

for (const pkg of PACKAGES) {
  const abs = path.join(ROOT, pkg.dir);
  const pkgJson = path.join(abs, "package.json");

  log(`\n=== ${pkg.name} ===`);
  log("Expected dir:", abs);

  if (!fs.existsSync(abs)) {
    fail(
      `${pkg.dir} does not exist. ` +
        `If this is a submodule (Vibe-Workflow), Vercel did not check it out. ` +
        `Verify the submodule is registered in the git index and that submodule cloning is enabled.`
    );
  }

  if (!fs.existsSync(pkgJson)) {
    fail(`${pkg.dir}/package.json missing — directory exists but is empty (submodule not cloned?).`);
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
