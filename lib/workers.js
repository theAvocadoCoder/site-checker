/**
 * Worker-Related Tasks
 */

// Dependencies
const path = require("path");
const fs = require("fs");
const _data = require("./data");
const https = require("https");
const http = require("http");
const helpers = require("./helpers");
const url = require("url");

// Instantiate the workers object
const workers = {};

// Look up all checks, get their data and send to a validator
workers.gatherAllChecks = function() {
  // Get all the checks
  _data.list("checks", (err, checks) => {
    if (!err && checks && checks.length > 0) {
      checks.forEach(check=>{
        // Read the check data
        _data.read("checks", check, (err, originalCheckData) => {
          if (!err && originalCheckData) {
            // Pass the data to the check validator and let that function continue or log errors as needed
            workers.validateCheckData(originalCheckData);
          } else {
            console.log("Error reading one of the check's data")
          }
        });
      });
    } else {
      console.log("Error: Could not find any checks to process ")
    }
  });
}

// Sanity checking the check data
workers.validateCheckData = function(originalCheckData) {
  originalCheckData = typeof(originalCheckData) == "object"
    && originalCheckData != null
    ? originalCheckData
    : {};
  originalCheckData.id = typeof(originalCheckData.id) == "string"
    && originalCheckData.id.trim().length == 20
    ? originalCheckData.id.trim()
    : false
  originalCheckData.userPhone = typeof(originalCheckData.userPhone) == "string"
    && originalCheckData.userPhone.trim().length == 10
    ? originalCheckData.userPhone.trim()
    : false
  originalCheckData.protocol = typeof(originalCheckData.protocol) == "string"
    && ["https", "http"].indexOf(originalCheckData.protocol) > -1
    ? originalCheckData.protocol
    : false
  originalCheckData.url = typeof(originalCheckData.url) == "string"
      && originalCheckData.url.trim().length > 0
      ? originalCheckData.url.trim()
      : false
  originalCheckData.method = typeof(originalCheckData.method) == "string"
        && ["post", "get", "put", "delete"].indexOf(originalCheckData.method) > -1
        ? originalCheckData.method
        : false
  originalCheckData.successCodes = typeof(originalCheckData.successCodes) == "object"
    && originalCheckData.successCodes instanceof Array
    && originalCheckData.successCodes.length > 0
    ? originalCheckData.successCodes
    : false
  originalCheckData.timeOutSeconds = typeof(originalCheckData.timeOutSeconds) == "number"
    && originalCheckData.timeOutSeconds % 1 === 0
    && originalCheckData.timeOutSeconds >= 1
    && originalCheckData.timeOutSeconds <= 5
    ? originalCheckData.timeOutSeconds
    : false

  // Set the keys that may not be set if the workers have never seen this check before
  originalCheckData.state = typeof(originalCheckData.state) == "string"
  && ["up", "down"].indexOf(originalCheckData.state) > -1
  ? originalCheckData.state
  : "down"

  originalCheckData.lastChecked = typeof(originalCheckData.lastChecked) == "number"
    && originalCheckData.lastChecked > 0
    ? originalCheckData.lastChecked
    : false

  // If all the checks passed, pass the data along to the next step in the process
  if (
    originalCheckData.id
    && originalCheckData.userPhone
    && originalCheckData.protocol
    && originalCheckData.url
    && originalCheckData.method
    && originalCheckData.successCodes
    && originalCheckData.timeOutSeconds
  ) {
    workers.performCheck(originalCheckData);
  } else {
    console.log("Error: One of the checks is not properly formatted. Skipping it")
  }
};

// Perform the check, send the originalCheckData and the outcome of the check process tot he next step in the process
workers.performCheck = function(originalCheckData) {
  // Prepare the initial check outcome
  let checkOutcome = {
    'err': false,
    'responseCode': false
  }

  // Mark that the outcome has not been sent yet
  let outcomeSent = false;

  // Parse the host name and the path out of the original check data
  const parsedUrl = url.parse(`${originalCheckData.protocol}://${originalCheckData.url}`, true);
  const hostName = parsedUrl.hostname;
  const path = parsedUrl.path; //using path not pathname in order to get query string

  // Construct the request
  const requestDetails = {
    'protocol': originalCheckData.protocol+':',
    'hostname': hostName,
    'method': originalCheckData.method.toUpperCase(),
    'path': path,
    'timeout': originalCheckData.timeOutSeconds * 1000,
  };

  // Instantiate the request object using either the http or https module
  const _moduleToUse = originalCheckData.protocol === 'http' ? http : https;
  const req = _moduleToUse.request(requestDetails, (res) => {
    // Grab the status of the sent request
    const status = res.statusCode;

    // Update the check outcome and pass the data along
    checkOutcome.responseCode = status;
    if (!outcomeSent) {
      workers.processCheckOutcome(originalCheckData, checkOutcome);
      outcomeSent = true;
    }
  });

  // Bind to the error event so it doesn't get thrown
  req.on('error', (e) => {
    // Update the check outcome and pass the data along
    checkOutcome.error = {
      'error': true,
      'value': e
    };
    if (!outcomeSent) {
      workers.processCheckOutcome(originalCheckData, checkOutcome);
      outcomeSent = true;
    }
  });

  // Bind to the timeout event
  req.on('timeout', (e) => {
    // Update the check outcome and pass the data along
    checkOutcome.error = {
      'error': true,
      'value': 'timeout'
    };
    if (!outcomeSent) {
      workers.processCheckOutcome(originalCheckData, checkOutcome);
      outcomeSent = true;
    }
  });

  // End the request 
  req.end();
}

// Process the check outcome and update the check data as needed and trigger an alert to the user if needed 
// Special logic for accomodating a check that has never been tested before (don't alert that one)
workers.processCheckOutcome = function(originalCheckData, checkOutcome) {
  // Decide if the check is up or down in its current state
  const state = !checkOutcome.error 
    && checkOutcome.responseCode 
    && originalCheckData.successCodes.indexOf(checkOutcome.responseCode) > -1 
    ? 'up'
    : 'down';

  // Decide if an alert is warranted
  const alertWarranted = originalCheckData.lastChecked && originalCheckData.state !== state ? true : false;

  // Update the check data
  const newCheckData = originalCheckData;
  newCheckData.state = state;
  newCheckData.lastChecked = Date.now();

  // Save updates to disk
  _data.update('checks', newCheckData.id, newCheckData, (err) => {
    if (!err) {
      // Send the new check data to the next phase in the process if needed
      if (alertWarranted) {
        workers.alertUserToStatusChange(newCheckData);
      } else {
        console.log("Check outcome has not changed, therefore no alert needed");
      }
    } else {
      console.log("Error trying to save updates to one of the checks");
    }
  })
};

// Alert the user as to a change in their check status
workers.alertUserToStatusChange = function(newCheckData) {
  const msg = `Alert: Your check for ${newCheckData.method.toUpperCase()} ${newCheckData.protocol}://${newCheckData.url} is currently ${newCheckData.state}`;
  helpers.sendTwilioSms(newCheckData.userPhone, msg, (e) => {
    if (!e) {
      console.log("Success! User was alerted to a status change in their check via sms: "+msg)
    } else {
      console.log("Error! Could not send SMS alert to user who had a state change in their check")
    }
  })
}

// Timer to execute the worker process once per minute
workers.loop = function() {
  setInterval(() => {
    workers.gatherAllChecks()
  }, 1000 * 60);
}

// Init script
workers.init = function() {
  // Execute all the checks
  workers.gatherAllChecks();

  // Call a loop so that the checks continue to execute on their own
  workers.loop();
}

// Export the module
module.exports = workers;
