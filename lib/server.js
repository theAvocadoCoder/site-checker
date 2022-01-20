/**
 * Server-Related
 */
// Dependencies
const http = require("http");
const https = require("https");
const url = require("url");
const { StringDecoder } = require("string_decoder");
const config = require("./config");
const fs = require("fs");
const handlers = require("./handlers");
const helpers = require("./helpers");
const path = require("path");

// Instantiate the server module object

const server = {};

// Instantiate the HTTP server

server.httpServer = http.createServer((req,res) => {
  // Pass the request and response to the unified Server
  server.unifiedServer(req, res);
});

// Instantiate the HTTPS server
server.httpsServerOptions = {
  "key": fs.readFileSync(path.join(__dirname, "/../https/key.pem")),
  "cert": fs.readFileSync(path.join(__dirname, "/../https/cert.pem"))
};
server.httpsServer = https.createServer(server.httpsServerOptions, (req, res) => {
  // Pass the request and response to the unified server
  server.unifiedServer(req, res);
});


// All the server logic for both the http and the https ports
server.unifiedServer = function (req, res) {

  // Get the URL and url.parse it
  const parsedUrl = url.parse(req.url, true);

  // Get the path (trimmed)
  const path = parsedUrl.pathname;
  const trimmedPath = path.replace(/^\/+|\/+$/g, "");

  // Get the query string as an object
  const queryStringObject = parsedUrl.query;

  // Get the HTTP method
  const method = req.method.toLowerCase();

  // Get the headers as an object
  const headers = req.headers;

  // Get the payload if any
  const decoder = new StringDecoder("utf-8");
  let buffer = "";

  req.on("data", (data) => {
    buffer += decoder.write(data);
  });

  req.on("end", () => {
    buffer += decoder.end();

    // Choose the handler this request should go to. If one is not found, use the notFound handler
    const chosenHandler = typeof(server.router[trimmedPath]) !== 'undefined' ? server.router[trimmedPath] : handlers.notFound;

    // Construct the data object to send to the handler
    const data = {
      "trimmedPath": trimmedPath,
      "queryStringObject": queryStringObject,
      "method": method,
      "header": headers,
      "payload": helpers.parseJsonToObject(buffer),
    };

    // Route the request to the handler specified in the router
    chosenHandler(data, (statusCode, payload) => {
      // use the status code called back by handler or default to 200
      statusCode = typeof(statusCode) == 'number'? statusCode : 200;

      // use the payload called back by handler or default to an empty object
      payload = typeof(payload) == "object"? payload : {};

      // Convert the payload to a string
      const payloadString = JSON.stringify(payload);

      // Return the response
      res.setHeader("Content-Type", "application/json");
      res.writeHead(statusCode);
      res.end(payloadString);

      // Log the response
      console.log("Returning this response:", statusCode, payloadString);

    });
  });
};

// Define a request router
server.router = {
  "ping": handlers.ping,
  "users": handlers.users,
  "tokens": handlers.tokens,
  "checks": handlers.checks
}; 

// Init script
server.init = function() {
  // Start the HTTP server
  server.httpServer.listen(config.httpPort, () => {
    console.log(`The server is listening on port ${config.httpPort} now`);
  });

  // Start the HTTPS server
  server.httpsServer.listen(config.httpsPort, () => {
    console.log(`The server is listening on port ${config.httpsPort} now`);
  });
}


module.exports = server;