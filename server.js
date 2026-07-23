/**
 * @fileoverview Express.js HTTP server exposing two plain-text GET endpoints.
 *   GET /              -> "Hello World"
 *   GET /good-evening  -> "Good evening"
 * This module is the application entry point, launched via `npm start` (node server.js).
 * It adopts Express.js as the server framework (AAP R1), preserves the baseline root
 * endpoint returning "Hello World" (AAP R2), adds the "/good-evening" endpoint returning
 * "Good evening" (AAP R3), and binds a configurable port so it starts with no additional
 * configuration (AAP R5).
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

/**
 * The TCP port the HTTP server binds to. Resolved from the PORT environment variable
 * when present, otherwise defaulting to the conventional local port 3000 so that
 * `npm start` runs without any configuration.
 * @type {number|string}
 */
const PORT = process.env.PORT || 3000;

/**
 * Root endpoint. Returns the preserved baseline greeting.
 * @param {express.Request} req - The incoming HTTP request.
 * @param {express.Response} res - The HTTP response used to send the reply.
 * @returns {void} Sends the plain-text body "Hello World".
 */
app.get('/', (req, res) => res.send('Hello World'));

/**
 * Good-evening endpoint.
 * @param {express.Request} req - The incoming HTTP request.
 * @param {express.Response} res - The HTTP response used to send the reply.
 * @returns {void} Sends the plain-text body "Good evening".
 */
app.get('/good-evening', (req, res) => res.send('Good evening'));

/**
 * Start the HTTP server, binding to the configured port (PORT env var or 3000).
 * @returns {void}
 */
app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
