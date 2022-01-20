/**
 * Helpers for various tasks
 */

// Dependencies
const crypto = require("crypto");
const config = require("./config");
const https = require("https");
// const URLSearchParams = require("URLSearchParams");

// Container for all the helpers
const helpers = {};

// Create a SHA256 str
helpers.hash = function (str) {
  if (typeof(str) == "string" && str.length > 0) {
    const hash = crypto.createHmac("sha256", config.hashingSecret).update(str).digest("hex");
    return hash;
  } else {
    return false;
  }
}

// Parse JSON to Object in all cases without throwing
helpers.parseJsonToObject = function (str) {
  try {
    const obj = JSON.parse(str);
    return obj;
  } catch (error) {
    return {};
  }
}

// Create a string of random alphanumeric character of a given length
helpers.createRandomString = function (strLength) {
  strLength = typeof(strLength) == "number" 
    && strLength > 0 
    ? strLength 
    : false;
  if (strLength) {
    // Define all the possible characters that could go into a string
    const possibleCharacters = "abcdefghijklmnopqrstuvwxyz0123456789";
    // Start the final string
    let str = "";

    for (let i = 1; i <= strLength; i++) {
      // Get random character from the possibleCharacters string and then append this character to the final string
      const randomCharacter = possibleCharacters.charAt(Math.floor(Math.random() * possibleCharacters.length));
      // Append that to the final string variable
      str += randomCharacter;
    }

    // return the final string 
    return str;
  } else {
    return false;
  }
}

// Send an SMS via Twilio
helpers.sendTwilioSms = function (/*countryCode,*/ phone, msg, callback) {
  // Validate the parameters
  // countryCode = typeof(countryCode) == "string"
  //   && countryCode.trim().length >= 2
  //   && countryCode.trim()[0] == "+"
  //   ? countryCode.trim()
  //   : false;
  phone = typeof(phone) == "string"
    && phone.trim().length == 10
    ? phone.trim()
    : false;
  msg = typeof(msg) == "string"
    && msg.trim().length > 0
    && msg.trim().length <= 1600
    ? msg.trim()
    : false
  
  if (phone && msg) {
    // Configure the request payload being sent to Twilio
    const payload = {
      "From": config.twilio.fromPhone,
      "To": phone,
      "Body": msg
    };

    // Stringify payload
    const stringPayload = URLSearchParams.toString(payload);

    // Configure request details
    const requestDetails = {
      "protocol":"https:",
      "hostname":"api.twilio.com",
      "method": "POST",
      "path":`/2010-04-01/Accounts/${config.twilio.accountSid}/Messages.json`,
      "auth":config.twilio.accountSid+":"+config.twilio.authToken,
      "headers":{
        "Content-Type": "application/x-www-form-urlencoded",
        "Content-Length": Buffer.byteLength(stringPayload)
      }
    };

    // Instantiate the req obj
    const req = https.request(requestDetails, (res)=>{
      // Grab the status of the sent request
      const status = res.statusCode;
      // Callback successfully if response went through
      if (status == 200 || status == 201) {
        callback(false)
      } else {
        callback("Status code returned was "+status)
      }
    });

    // Bind to the error event so it doesn't get thrown
    req.on("error", (e)=>{
      callback(e)
    });

    // Add payload to request
    req.write(stringPayload);

    // End the request
    req.end();
  } else {
    callback("Given parameters were missing or invalid")
  }
}






















// Export the module
module.exports = helpers;