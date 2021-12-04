/**
 * Helpers for various tasks
 */

// Dependencies
const crypto = require("crypto");
const config = require("./config");

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

// Export the module
module.exports = helpers;