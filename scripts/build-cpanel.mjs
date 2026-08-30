/**
 * Builds a self-contained bundle for cPanel (or any host where you run
 * `node server.js` yourself), then completes it.
 *
 * `next build` with output: "standalone" writes a server and the modules it
 * reaches, but deliberately leaves out `public/` and `.next/static/` — on a CDN
 * host the edge serves those, not node. On cPanel nothing else serves them, so
 * without the copying below the site starts, renders, and arrives with no CSS,
 * no JavaScript and no images. It is the most common way a standalone
 * deployment goes wrong, which is why this is one command rather than a step
 * someone has to remember.
 *
 * Sets BUILD_STANDALONE itself so it behaves the same on Windows, macOS and
 * Linux without pulling in a package to do it.
 */

import { spawnSync } from "node:child_process";
import { cp, mkdir, stat, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";

const root = process.cwd();
const standalone = path.join(root, ".next", "standalone");

console.log("Building the standalone bundle…\n");
const build = spawnSync("npm", ["run", "build"], {
  cwd: root,
  stdio: "inherit",
  env: { ...process.env, BUILD_STANDALONE: "true" },
  shell: process.platform === "win32",
});

if (build.status !== 0) {
  console.error("\nThe build failed. Nothing was packaged.");
  process.exit(build.status ?? 1);
}

if (!existsSync(standalone)) {
  console.error(
    "\nThe build produced no .next/standalone folder. Check that next.config.ts\n" +
      "still reads BUILD_STANDALONE.",
  );
  process.exit(1);
}

console.log("\nCompleting the bundle:");

async function copyInto(from, to, label) {
  if (!existsSync(from)) {
    console.log(`  – ${label}: nothing to copy`);
    return;
  }
  await mkdir(path.dirname(to), { recursive: true });
  await cp(from, to, { recursive: true, force: true });
  console.log(`  ✓ ${label}`);
}

await copyInto(
  path.join(root, "public"),
  path.join(standalone, "public"),
  "public/ — logo, photographs, videos",
);
await copyInto(
  path.join(root, ".next", "static"),
  path.join(standalone, ".next", "static"),
  ".next/static/ — CSS and JavaScript",
);

// Prisma loads its query engine at runtime by path, and the tracer does not
// always follow it in. Without it the site starts and every page that reads the
// database answers 500.
await copyInto(
  path.join(root, "node_modules", ".prisma", "client"),
  path.join(standalone, "node_modules", ".prisma", "client"),
  "Prisma client and query engine",
);

// Next copies .env files into the bundle. This project's holds the database
// password, the session signing secret and the first admin password, and the
// bundle is a file that gets zipped, emailed and uploaded — so they come out
// again here. cPanel supplies them from its own environment variables panel,
// which is where they belong.
const { rm } = await import("node:fs/promises");
const stripped = [];
for (const name of [".env", ".env.local", ".env.production", ".env.production.local"]) {
  const file = path.join(standalone, name);
  if (existsSync(file)) {
    await rm(file);
    stripped.push(name);
  }
}
if (stripped.length > 0) {
  console.log(`  ✓ removed ${stripped.join(", ")} — set these in cPanel instead`);
}

const entry = path.join(standalone, "server.js");
if (!existsSync(entry) || (await stat(entry)).size === 0) {
  console.error("\nThe bundle has no usable server.js. Build again.");
  process.exit(1);
}

await writeFile(
  path.join(standalone, "START-HERE.txt"),
  [
    "Imtiyaz El Djazair — build ready to upload",
    "",
    "Upload everything in this folder to the application root you set in",
    "cPanel -> Setup Node.js App, then set:",
    "",
    "  Application startup file : server.js",
    "",
    "Add the environment variables listed in DEPLOY-CPANEL.md, then Restart.",
    "Do NOT run npm install here — the modules this server needs are already",
    "in node_modules/.",
    "",
  ].join("\n"),
  "utf8",
);

let files = 0;
const { readdirSync, statSync } = await import("node:fs");
(function count(dir) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) count(full);
    else files += 1;
  }
})(standalone);

console.log(`\nReady: .next/standalone — ${files.toLocaleString()} files.`);
console.log("Upload its contents, set the startup file to server.js, restart.");
