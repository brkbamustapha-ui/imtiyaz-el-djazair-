/**
 * Startup file for hosts that run the app themselves — cPanel's "Setup Node.js
 * App" (Phusion Passenger), or any VPS where you run `node server.js`.
 *
 * Passenger requires a file it can `require()`, decides the port itself and
 * passes it in PORT; `next start` is a CLI and cannot be pointed at that, which
 * is why this exists. It is the same request handler `next start` runs, so the
 * site behaves identically — routes, middleware, the headers from
 * next.config.ts, server actions and the admin all work as they do now.
 *
 * Not used by the current host, which starts the app its own way.
 */

const { createServer } = require("node:http");
const path = require("node:path");
const fs = require("node:fs");

const dir = __dirname;
const port = Number.parseInt(process.env.PORT ?? "", 10) || 3000;
const hostname = process.env.HOSTNAME || "0.0.0.0";

// A standalone build ships its own server with the module paths already
// resolved. Handing over to it keeps this file working for both layouts:
// upload the standalone bundle, or upload the project and build in place.
const standalone = path.join(dir, ".next", "standalone", "server.js");
if (fs.existsSync(standalone) && !process.env.__NEXT_PRIVATE_STANDALONE_CONFIG) {
  process.chdir(path.dirname(standalone));
  require(standalone);
  return;
}

if (!fs.existsSync(path.join(dir, ".next", "BUILD_ID"))) {
  console.error(
    "No production build found. Run `npm run build` in this folder before starting.",
  );
  process.exit(1);
}

const next = require("next");
const app = next({ dev: false, dir, hostname, port });
const handle = app.getRequestHandler();

app
  .prepare()
  .then(() => {
    createServer((req, res) => {
      handle(req, res).catch((error) => {
        console.error("request failed:", error);
        res.statusCode = 500;
        res.end("Internal Server Error");
      });
    }).listen(port, () => {
      console.log(`Imtiyaz El Djazair listening on http://${hostname}:${port}`);
    });
  })
  .catch((error) => {
    console.error("failed to start:", error);
    process.exit(1);
  });
