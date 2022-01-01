/**
 * Primary file for the API
 * 
 */

// Dependencies
const http = require("http");
const https = require("https");
const url = require("url");
const { StringDecoder } = require("string_decoder");
const config = require("./lib/config");
const fs = require("fs");
const handlers = require("./lib/handlers");
const helpers = require("./lib/helpers");

// Instantiate the HTTP server
const httpServer = http.createServer((req,res) => {
  // Pass the request and response to the unified Server
  unifiedServer(req, res);
});

// Start the HTTP server
httpServer.listen(config.httpPort, () => {
  console.log(`The server is listening on port ${config.httpPort} now`);
});

// Instantiate the HTTPS server
const httpsServerOptions = {
  "key": fs.readFileSync("./https/key.pem"),
  "cert": fs.readFileSync("./https/cert.pem")
};
const httpsServer = https.createServer(httpsServerOptions, (req, res) => {
  // Pass the request and response to the unified server
  unifiedServer(req, res);
});

// Start the HTTPS server
httpsServer.listen(config.httpsPort, () => {
  console.log(`The server is listening on port ${config.httpsPort} now`);
});

// All the server logic for both the http and the https ports
const unifiedServer = function (req, res) {

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
    const chosenHandler = typeof(router[trimmedPath]) !== 'undefined' ? router[trimmedPath] : handlers.notFound;

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
const router = {
  "ping": handlers.ping,
  "users": handlers.users,
  "tokens": handlers.tokens,
  "checks": handlers.checks
}; 
