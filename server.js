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
 * Both successful responses carry two defensive headers — `X-Content-Type-Options: nosniff`
 * and `X-Frame-Options: DENY` — set inline in each handler (no middleware) as defense in
 * depth against MIME-sniffing and clickjacking. See {@link SECURITY_HEADERS}.
 */

'use strict';

const express = require('express');

/**
 * The Express application instance. Routes are registered inline below, keeping the
 * server to a single minimal CommonJS entrypoint with no routers, controllers, or
 * middleware beyond what Express provides by default.
 * @type {import('express').Express}
 */
const app = express();

// Disable Express's default `X-Powered-By: Express` response header so the underlying
// framework is not disclosed to clients on any response (successful routes or 404s).
// This is defense-in-depth against framework fingerprinting (CWE-200) and is a built-in
// Express application setting — it introduces no middleware, route, or architectural layer.
app.disable('x-powered-by');

/**
 * Defensive HTTP response headers applied to the successful (200) responses of both
 * routes. These are set inline within each handler via `res.set(...)` — deliberately
 * NOT as `app.use(...)` middleware — so the server remains a single CommonJS entrypoint
 * with inline handlers and no added middleware layer, per the project's minimalism
 * constraint (AAP §0.6.2 lists "middleware" as out of scope; §0.7 mandates inline
 * handlers only). Defining them once as a shared constant keeps the two responses
 * byte-identical in their header set and avoids drift.
 *
 *   - `X-Content-Type-Options: nosniff` instructs browsers not to MIME-sniff the
 *     response body away from its declared Content-Type (CWE-430 / CWE-16).
 *   - `X-Frame-Options: DENY` forbids the response from being embedded in a frame,
 *     providing clickjacking protection (CWE-1021).
 *
 * They alter response headers only and never modify the response body, so the exact
 * greeting contracts ("Hello World" / "Good evening") remain byte-for-byte unchanged.
 * @type {{'X-Content-Type-Options': string, 'X-Frame-Options': string}}
 */
const SECURITY_HEADERS = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
};

/**
 * The TCP port the HTTP server binds to. Resolved from the PORT environment variable
 * when present, otherwise defaulting to the conventional local port 3000 so that
 * `npm start` runs without any configuration.
 * @type {number|string}
 */
const PORT = process.env.PORT || 3000;

/**
 * Root endpoint. Returns the preserved baseline greeting.
 * Applies the shared defensive security headers, then sends the exact body.
 * @param {express.Request} req - The incoming HTTP request.
 * @param {express.Response} res - The HTTP response used to send the reply.
 * @returns {void} Sends the plain-text body "Hello World".
 */
app.get('/', (req, res) => {
  res.set(SECURITY_HEADERS);
  res.send('Hello World');
});

/**
 * Good-evening endpoint.
 * Applies the shared defensive security headers, then sends the exact body.
 * @param {express.Request} req - The incoming HTTP request.
 * @param {express.Response} res - The HTTP response used to send the reply.
 * @returns {void} Sends the plain-text body "Good evening".
 */
app.get('/good-evening', (req, res) => {
  res.set(SECURITY_HEADERS);
  res.send('Good evening');
});

/**
 * Start the HTTP server, binding to the configured port (PORT env var or 3000).
 * @returns {void}
 */
app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
