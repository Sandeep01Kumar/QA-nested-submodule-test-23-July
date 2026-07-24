/**
 * @fileoverview Express.js HTTP server exposing two plain-text GET endpoints.
 *   GET /              -> "Hello World"
 *   GET /good-evening  -> "Good evening"
 * This module is the application entry point, launched via `npm start` (node server.js).
 * It adopts Express.js as the server framework (AAP R1), preserves the baseline root
 * endpoint returning "Hello World" (AAP R2), adds the "/good-evening" endpoint returning
 * "Good evening" (AAP R3), and binds a configurable port so it starts with no additional
 * configuration (AAP R5).
 *
 * Behavioral guarantees enforced here:
 *   - Exact route contract (AAP R3 / §0.7): routing is configured case-sensitive and
 *     strict so ONLY the exact paths "/" and "/good-evening" match. Case variants
 *     ("/Good-evening", "/GOOD-EVENING") and trailing-slash forms ("/good-evening/")
 *     no longer alias the greeting — they fall through to the controlled 404 handler.
 *   - Consistent defensive response headers: `X-Content-Type-Options: nosniff` and
 *     `X-Frame-Options: DENY` are applied to EVERY response (both routes, the automatic
 *     HEAD/OPTIONS responses, and the controlled 404) via a single minimal, dependency-free
 *     response-header function, so clickjacking/MIME-sniffing defenses are not limited to
 *     the successful routes.
 *   - Non-reflective errors: a final catch-all returns a fixed "Not Found" 404 body, so no
 *     user-controlled request data (path/query/headers) is echoed back to the client.
 *   - Robust startup: PORT is validated as an integer TCP port; invalid values are rejected
 *     with a concise diagnostic and a non-zero exit (never silently turned into a Unix
 *     socket and never crashing with an uncaught stack trace), and listener bind failures
 *     (e.g. EADDRINUSE) are surfaced explicitly instead of being reported as false success.
 *
 * Scope note: the app.use header setter and the catch-all 404 are minimal, dependency-free
 * response-hardening for the two existing routes — not application/feature middleware,
 * routers, controllers, or new endpoints. They keep the server a single CommonJS entrypoint
 * with inline handlers (AAP §0.1.3 / §0.7 minimalism); the "middleware" excluded by AAP
 * §0.6.2 refers to feature/subsystem middleware (auth, sessions, databases, extra endpoints),
 * none of which are introduced. The exact greeting bodies remain byte-for-byte unchanged.
 */

'use strict';

const express = require('express');

/**
 * The Express application instance. Routes are registered inline below, keeping the
 * server to a single minimal CommonJS entrypoint with no routers, controllers, or
 * external dependencies beyond Express itself.
 * @type {import('express').Express}
 */
const app = express();

// Enforce an EXACT route contract. Express routing is case-insensitive and non-strict by
// default, which would let "/Good-evening", "/GOOD-EVENING", and "/good-evening/" all
// resolve to the "/good-evening" handler. AAP R3 / §0.7 require the new route to be exactly
// "/good-evening", so enable case-sensitive and strict routing BEFORE any route is
// registered. These are built-in Express application settings; they add no middleware
// layer, router, or dependency.
app.set('case sensitive routing', true);
app.set('strict routing', true);

// Disable Express's default `X-Powered-By: Express` response header so the underlying
// framework is not disclosed to clients on any response (successful routes, 404s, or
// automatic method responses). Defense-in-depth against framework fingerprinting (CWE-200);
// a built-in Express setting that introduces no middleware, route, or architectural layer.
app.disable('x-powered-by');

/**
 * Defensive HTTP response headers applied to EVERY response the application produces.
 * Defined once as a shared constant so every response carries an identical header set.
 *
 *   - `X-Content-Type-Options: nosniff` instructs browsers not to MIME-sniff the response
 *     body away from its declared Content-Type (CWE-430 / CWE-16).
 *   - `X-Frame-Options: DENY` forbids the response from being embedded in a frame,
 *     providing clickjacking protection (CWE-1021).
 *
 * @type {{'X-Content-Type-Options': string, 'X-Frame-Options': string}}
 */
const SECURITY_HEADERS = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
};

/**
 * Apply the shared defensive security headers to every response. Registered once with
 * `app.use` ahead of the route handlers so the headers are present uniformly on the two
 * successful routes, on the automatic HEAD/OPTIONS responses, and on the controlled 404 —
 * closing the gap where framework-generated responses previously lacked clickjacking
 * protection. This is a single, dependency-free response-header function: it adds no new
 * framework, router, or application feature, and it never modifies the response body, so
 * the exact greeting contracts ("Hello World" / "Good evening") remain byte-for-byte
 * unchanged.
 * @param {express.Request} req - The incoming HTTP request.
 * @param {express.Response} res - The HTTP response whose headers are set.
 * @param {express.NextFunction} next - Callback passing control to the next handler.
 * @returns {void}
 */
app.use((req, res, next) => {
  res.set(SECURITY_HEADERS);
  next();
});

/**
 * Resolve and validate the TCP port the HTTP server binds to. The port is read from the
 * `PORT` environment variable when present, otherwise it defaults to the conventional
 * local port 3000 so that `npm start` runs without any configuration.
 *
 * `PORT` is validated as a non-negative integer within the supported TCP range (0-65535).
 * A value of 0 is permitted and instructs the OS to assign an ephemeral port. Any other
 * form — non-numeric strings such as "abc" / "127.0.0.1" / "3000abc", negative values, or
 * values above 65535 — is rejected with a concise diagnostic and a non-zero exit. This
 * prevents Node from silently interpreting a non-numeric value as a Unix-domain socket
 * path, and prevents uncaught `RangeError`s (from out-of-range numbers) that would print a
 * stack trace containing absolute workspace paths.
 * @returns {number} The validated TCP port number.
 */
function resolvePort() {
  const raw = process.env.PORT;

  // Unset or empty -> conventional default so `npm start` needs no configuration.
  if (raw === undefined || raw === '') {
    return 3000;
  }

  const trimmed = String(raw).trim();
  const isNonNegativeInteger = /^\d+$/.test(trimmed);
  const parsed = Number(trimmed);

  if (!isNonNegativeInteger || !Number.isInteger(parsed) || parsed < 0 || parsed > 65535) {
    console.error(
      `Invalid PORT value ${JSON.stringify(raw)}: expected an integer between 0 and 65535.`
    );
    process.exit(1);
  }

  return parsed;
}

/**
 * The validated TCP port the server binds to (PORT env var or the default 3000).
 * @type {number}
 */
const PORT = resolvePort();

/**
 * Root endpoint. Returns the preserved baseline greeting exactly as "Hello World".
 * Defensive security headers are applied globally by the app.use handler above.
 * @param {express.Request} req - The incoming HTTP request.
 * @param {express.Response} res - The HTTP response used to send the reply.
 * @returns {void} Sends the plain-text body "Hello World".
 */
app.get('/', (req, res) => {
  res.send('Hello World');
});

/**
 * Good-evening endpoint. Returns exactly "Good evening".
 * Defensive security headers are applied globally by the app.use handler above.
 * @param {express.Request} req - The incoming HTTP request.
 * @param {express.Response} res - The HTTP response used to send the reply.
 * @returns {void} Sends the plain-text body "Good evening".
 */
app.get('/good-evening', (req, res) => {
  res.send('Good evening');
});

/**
 * Exact paths of the two registered GET routes. Referenced by the catch-all below so that
 * Express's automatic OPTIONS discovery response is preserved for these routes only, while
 * OPTIONS (and every other method) on any other path receives the fixed, non-reflective
 * 404. Mirrors the two `app.get(...)` route paths registered above.
 * @type {ReadonlySet<string>}
 */
const ROUTE_PATHS = new Set(['/', '/good-evening']);

/**
 * Controlled catch-all handler for every request that does not match one of the two
 * registered routes. It returns a fixed, generic body ("Not Found") so that no
 * user-controlled request data (path, query, or headers) is reflected back — replacing
 * Express's default 404 page, which echoes the (HTML-escaped) request target. The global
 * security headers set above still apply to this response.
 *
 * For an OPTIONS request targeting one of the two registered routes, the request is passed
 * through with `next()` so that Express's built-in automatic OPTIONS responder (which runs
 * at the end of the router stack) can still emit the standard `Allow: GET, HEAD` discovery
 * response — now also carrying the global clickjacking/MIME-sniffing headers. OPTIONS to any
 * other (unknown) path is answered with the same fixed 404, so no request target is ever
 * reflected.
 * @param {express.Request} req - The incoming HTTP request.
 * @param {express.Response} res - The HTTP response used to send the 404 reply.
 * @param {express.NextFunction} next - Passes registered-route OPTIONS through to the automatic responder.
 * @returns {void} Sends a fixed 404 "Not Found" plain-text body (all non-passthrough requests).
 */
app.use((req, res, next) => {
  if (req.method === 'OPTIONS' && ROUTE_PATHS.has(req.path)) {
    return next();
  }
  res.status(404).type('text/plain').send('Not Found');
});

/**
 * Tracks whether startup failed, so that a `listening` event emitted immediately before a
 * bind error (some platforms emit `listening` and then `EADDRINUSE` under SO_REUSEADDR)
 * does not print a misleading success message once the failure has been surfaced.
 * @type {boolean}
 */
let startupFailed = false;

/**
 * The HTTP server instance. The listener is started here; success and failure are reported
 * via the `listening` and `error` handlers below rather than an inline callback, so the
 * success message is emitted only when the bind is not immediately followed by an error.
 * @type {import('http').Server}
 */
const server = app.listen(PORT);

/**
 * Report a successfully bound listener. Deferred to the next check phase so that a bind
 * error emitted right after `listening` is observed first (via {@link startupFailed}) and
 * suppresses this message. Reports the actual bound port, which reflects the OS-assigned
 * ephemeral port when PORT=0.
 * @returns {void}
 */
server.on('listening', () => {
  setImmediate(() => {
    if (startupFailed) {
      return;
    }
    const address = server.address();
    const boundPort = address && typeof address === 'object' ? address.port : PORT;
    console.log(`Server listening on port ${boundPort}`);
  });
});

/**
 * Surface asynchronous listener errors (e.g. port already in use (EADDRINUSE) or permission
 * denied (EACCES)) with a concise diagnostic and a non-zero exit, so startup never falsely
 * reports success when no listener was bound. The message is intentionally terse and does
 * not print an uncaught stack trace or absolute workspace paths.
 * @param {NodeJS.ErrnoException} err - The listener error emitted by the HTTP server.
 * @returns {void}
 */
server.on('error', (err) => {
  startupFailed = true;
  console.error(`Failed to start server on port ${PORT}: ${err.message}`);
  process.exit(1);
});
