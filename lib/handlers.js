/**
 * Request Handlers
 */

// Dependencies
const _data = require("./data");
const helpers = require("./helpers");

// Define the handlers
const handlers = {};

// Users Handler
handlers.users = function (data, callback) {
  const acceptableMethods = ["post", "get", "put", "delete"];
  if (acceptableMethods.indexOf(data.method) > -1) {
    handlers._users[data.method](data, callback);
  } else {
    callback(405);
  }
};

// Container for the users submethods
handlers._users = {};

// USERS - POST
/**
 * Requirements:
 * firstName lastName phone password tosAgreement
 */
handlers._users.post = function (data, callback) {
  const firstName = typeof(data.payload.firstName) == "string" 
    && data.payload.firstName.trim().length > 0 
    ? data.payload.firstName.trim() 
    : false;
  const lastName = typeof(data.payload.lastName) == "string" 
    && data.payload.lastName.trim().length > 0 
    ? data.payload.lastName.trim() 
    : false;
  const phone = typeof(data.payload.phone) == "string" 
    && data.payload.phone.trim().length == 10 
    ? data.payload.phone.trim() 
    : false;
  const password = typeof(data.payload.password) == "string" 
    && data.payload.password.trim().length > 0 
    ? data.payload.password.trim() 
    : false;
  const tosAgreement = typeof(data.payload.tosAgreement) == "boolean" 
    && data.payload.tosAgreement == true 
    ? true 
    : false;
  
  if (firstName && lastName && phone && password && tosAgreement) {
    // Check to ensure user doesn't already exist
    _data.read("users", phone, (err, data) => {
      if (err) {
        // Hash the password
        const hashedPassword = helpers.hash(password);

        // Create the user object
        if (hashedPassword) {
          const userObject = {
            "firstName": firstName,
            "lastName": lastName,
            "hashedPassword": hashedPassword,
            "phone": phone, 
            "tosAgreement": true
          };

          // Store the user
          _data.create("users", phone, userObject, (err) => {
            if (!err) {
              callback(200);
            } else {
              console.error(err);
              callback(500, {"Error": "Could not create the new user"});
            }
          });
        } else {
          callback(500, {"Error": "Could not hash password"});
        }
      } else {
        callback(400, {"Error": "This number is already in our system. Try logging in instead"})
      }
    })
  } else {
    callback(400, {"Error": "Required field(s) not provided"})
  }
  
}

// USERS - GET
/**
 * Required data: phone
 * Optional data: none
 */
handlers._users.get = function (data, callback) {
  // Check that the user is valid via phone number
  const phone = typeof(data.queryStringObject.phone) == "string" 
    && data.queryStringObject.phone.trim().length == 10 
    ? data.queryStringObject.phone.trim() 
    : false;
  // Get the token from the headers
  // const token = typeof(data.headers.token) == "string"
  //   ? data.headers.token
  //   : false;

  if (phone) {
    const token = null;
    // Verify that the token is valid for the specified phone number
    handlers._tokens.verifyToken(token, phone, (tokenIsValid)=>{
      if (tokenIsValid) {
        // Lookup the user
        _data.read("users", phone, (err, data)=>{
          if (!err && data) {
            // Remove the hashed password from the user object before returning it to the requester
            delete data.hashedPassword;
            callback(200, data);
          } else {
            callback(404)
          }
        });
      } else {
        callback(403, {"Error": "Missing required token in header or token is invalid", "token":`this is the data: ${Object.hasOwnProperties(data, "headers")}`})
      }
    })
  } else {
    callback(400, {"Error":"Missing required field"})
  }
}

// USERS - PUT
/**
 * Required data: phone
 * Optional data: everything else - firstName, lastName, password (at least one must be specified)
 */
handlers._users.put = function (data, callback) {
  // Check for the required field
  const phone = typeof(data.payload.phone) == "string" 
    && data.payload.phone.trim().length == 10 
    ? data.payload.phone.trim() 
    : false;
  // Check for the optional fields
  const firstName = typeof(data.payload.firstName) == "string" 
  && data.payload.firstName.trim().length > 0
  ? data.payload.firstName.trim() 
  : false;
  const lastName = typeof(data.payload.lastName) == "string" 
    && data.payload.lastName.trim().length > 0 
    ? data.payload.lastName.trim() 
    : false;
  const password = typeof(data.payload.password) == "string" 
    && data.payload.password.trim().length > 0 
    ? data.payload.password.trim() 
    : false;
  
  // Error if the phone is invalid
  if (phone) {
    // Error if nothing is sent to update
    if (firstName || lastName || password) {
      // Get the token from the headers
      const token = typeof(data.headers.token) == "string"
        ? data.headers.token
        : false;
      // Verify that the token is valid for the specified phone number
      handlers._tokens.verifyToken(token, phone, (tokenIsValid)=>{
        if (tokenIsValid) {
          // Lookup the user
          _data.read("users", phone, (err, userData) => {
            if (!err && userData) {
              // Update the necessary fields
              if (firstName) {
                userData.firstName = firstName
              }
              if (lastName) {
                userData.lastName = lastName
              }
              if (password) {
                userData.hashedPassword = helpers.hash(password)
              }
      
              // Store the new updates
              _data.update("users", phone, userData, (err)=>{
                if (!err) {
                  callback(200);
                } else {
                  console.error(err);
                  callback(500, {"Error": "Could not update the user"});
                }
              });
            } else {
              callback(400, {"Error": "This user does not exist"});
            }
          });
        } else {
          callback(403, {"Error": "Missing required token in header or token is invalid"})
        }
      });
    } else {
      callback(400, {"Error":"Missing required field(s)"});
    }
  } else {
    callback(400, {"Error":"Missing required field(s)"})
  }


}

// USERS - DELETE
/**
 * Required field - phone
 * @TODO cleanup (delete) any other files associated with the usere
 */
handlers._users.delete = function (data, callback) {
  // Check that the phone number is valid
  const phone = typeof(data.queryStringObject.phone) == "string" 
    && data.queryStringObject.phone.trim().length == 10 
    ? data.queryStringObject.phone.trim() 
    : false;

  if (phone) {
    // Get the token from the headers
    const token = typeof(data.headers.token) == "string"
      ? data.headers.token
      : false;
    // Verify that the token is valid for the specified phone number
    handlers._tokens.verifyToken(token, phone, (tokenIsValid)=>{
      if (tokenIsValid) {
        // Lookup the user
        _data.read("users", phone, (err, data)=>{
          if (!err && data) {
            // Remove the user object
            _data.delete("users", phone, (err) => {
              if (!err) {
                callback(200)
              } else {
                callback(500, {"Error":"Could not delete the user"})
              }
            });
          } else {
            callback(400, {"Error":"Could not find user"})
          }
        });
      } else {
        callback(403, {"Error": "Missing required token in header or token is invalid"})
      }
    });
  } else {
    callback(400, {"Error":"Missing required field"})
  }
}

// Tokens Handler
handlers.tokens = function (data, callback) {
  const acceptableMethods = ["post", "get", "put", "delete"];
  if (acceptableMethods.indexOf(data.method) > -1) {
    handlers._tokens[data.method](data, callback);
  } else {
    callback(405);
  }
};

// Container for the _tokens submethods
handlers._tokens = {};

// Tokens - POST
/***
 * Required fields - phone, password
 * Optional data - none
 */
handlers._tokens.post = function (data, callback) {
  const phone = typeof(data.payload.phone) == "string" 
    && data.payload.phone.trim().length == 10 
    ? data.payload.phone.trim() 
    : false;
  const password = typeof(data.payload.password) == "string" 
    && data.payload.password.trim().length > 0 
    ? data.payload.password.trim() 
    : false;
  if (phone && password) {
    // Lookup user who matches that phone number
    _data.read("users", phone, (err, userData)=>{
      if (!err && userData) {
        // Hash the sent password and compare it to the password in the json file
        const hashedPassword = helpers.hash(password);
        if (hashedPassword == userData.hashedPassword) {
          // If valid, create new token w random name, set expiration date 1hr in the future
          const tokenId = helpers.createRandomString(20);
          const expires = Date.now() + 1000 * 60 * 60;
          const tokenObject = {
            "phone": phone,
            "id": tokenId,
            "expires": expires
          };

          // Store the object
          _data.create("tokens", tokenId, tokenObject, (err)=>{
            if (!err) {
              callback(200, tokenObject);
            } else {
              callback(500, {"Error": "Could not create the new token"});
            }
          })
        } else {
          callback(400, {"Error": "Incorrect Passsword"})
        }
      } else {
        callback(400, {"Error": "Could not find user"});
      }
    })
  } else {
    callback(400, {"Error": "Missing required fields", "fields": {"phone":phone, "password":password}});
  }
}

// Tokens - GET
/**
 * Required data: id
 * Optional data: none
 */
handlers._tokens.get = function (data, callback) {
  // Check that the id is valid
  const id = typeof(data.queryStringObject.id) == "string" 
    && data.queryStringObject.id.trim().length == 20 
    ? data.queryStringObject.id.trim() 
    : false;
  if (id) {
    // Lookup the user's token
    _data.read("tokens", id, (err, tokenData)=>{
      if (!err && tokenData) {
        // Return the tokenData to the requester
        callback(200, tokenData);
      } else {
        callback(404)
      }
    })
  } else {
    callback(400, {"Error":"Missing required field", "id": data.queryStringObject.id.trim() })
  }
}

// Tokens - PUT
/**
 * Requirement - id, extends
 * Optional - none
 */
handlers._tokens.put = function (data, callback) {
  const id = typeof(data.payload.id) == "string" 
    && data.payload.id.trim().length == 20 
    ? data.payload.id.trim() 
    : false;
  const extend = typeof(data.payload.extend) == "boolean"
    && data.payload.extend == true
    ? true
    : false;
  if (id && extend === true) {
    // Look up token
    _data.read("tokens", id, (err, tokenData)=>{
      if (!err && tokenData) {
        // Check to make sure that token isn't already expired
        if (tokenData.expires > Date.now()) {
          // Set expiration at an hour from now
          tokenData.expires = Date.now() + 1000 * 60 * 60;
          // Store the updates
          _data.update("tokens", id, tokenData, (err)=>{
            if (!err) {
              callback(200);
            } else {
              callback(500, {"Error": "Could not update the token's expiration"})
            }
          })
        } else {
          callback(400, {"Error": "The token has already expired and cannot be extended"})
        }
      } else {
        callback(400, {"Error": "Specified token does not exist"})
      }
    })
  } else {
    callback(400, {"Error": "Missing required field(s) or field(s) are invalid"});
  }
}

// Tokens - DELETE
/**
 * Required data: id
 * Optional data: none
 */
handlers._tokens.delete = function (data, callback) {
  // Check that the id number is valid
  const id = typeof(data.queryStringObject.id) == "string" 
    && data.queryStringObject.id.trim().length == 20 
    ? data.queryStringObject.id.trim() 
    : false;

  if (id) {
    // Lookup the token
    _data.read("tokens", id, (err, data)=>{
      if (!err && data) {
        // Remove the token object
        _data.delete("tokens",id, (err) => {
          if (!err) {
            callback(200)
          } else {
            callback(500, {"Error":"Could not delete the token"})
          }
        })
      } else {
        callback(400, {"Error":"Could not find token"})
      }
    })
  } else {
    callback(400, {"Error":"Missing required field"})
  }
}

// Verify that the token belongs to the user making the request
/**
 * Required data: id, phone
 * Optional data: none
 */
handlers._tokens.verifyToken = function (token, phone, callback) {
  _data.read("tokens", token, (err, tokenData)=>{
    if (!err && tokenData) {
      // Verify that the token is not expired and the phone number given matches what's in the token file
      const tokenIsValid = tokenData.expires > Date.now()
        && tokenData.phone == phone
        ? true
        : false; 
      callback(tokenIsValid);
    } else {
      callback(false);
    }
  })
}

// Ping Handler
handlers.ping = function (data, callback) {
  // Callback a http status code
  callback(200);
};

// Not Found Handler
handlers.notFound = function (data, callback) {
  callback(404);
};

// Export the handlers
module.exports = handlers;
