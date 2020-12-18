/* eslint-env node */
const server = require('./server.js');
const throng = require('throng'); // Dead-simple one-liner for clustered Node.js apps.
// Runs X workers and respawns them if they go down. Correctly handles signals from the OS.
throng({
	workers: process.env.MODE_CLOUD_SERVER||1, // Number of workers (cpu count) 
	// lifetime: 10000 // ms to keep cluster alive (Infinity) 
	grace: 5000, // ms grace period after worker SIGTERM (5000) 
	start: server
});