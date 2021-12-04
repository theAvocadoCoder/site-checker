/**
 * library for storing and editing data
 */

// Dependencies
const fs = require("fs");
const path = require("path");
const helpers = require("./helpers");

// Container for the module
const lib = {};

// Define the base directory of the data folder
lib.baseDir = path.join(__dirname, "/../.data/");

// Create a data file
lib.create = function (dir, file, data, callback) {
  // Open the file for writing
  fs.open(`${lib.baseDir+dir}/${file}.json`, "wx", (err, fileDescriptor) => {
    if (!err && fileDescriptor) {
      // Take the data param and convert it to a string
      const stringData = JSON.stringify(data);

      // Write to file and close it
      fs.writeFile(fileDescriptor, stringData, (err) => {
        if (!err) {
          fs.close(fileDescriptor, (err) => {
            if (!err) {
              callback(false);
            } else {
              callback("Error closing new file");
            }
          })
        } else {
          callback("Error writing to new file");
        }
      });
    } else {
      callback("Could not create new file as it may already exist");
    }
  });
};

// Read data from a file
lib.read = function (dir, file, callback) {
  fs.readFile(`${lib.baseDir+dir}/${file}.json`, "utf8", (err, data) => {
    if (!err && data) {
      const parsedData = helpers.parseJsonToObject(data);
      callback(false, parsedData);
    } else {
      callback(err, data);
    }
  })
}

// Update existing file with new data
lib.update = function (dir, file, data, callback) {
  fs.open(`${lib.baseDir+dir}/${file}.json`, "r+", (err, fileDescriptor) => {
    if (!err && fileDescriptor) {
      // Make new object and add data to it, then stringify
      const dataString = JSON.stringify(data);

      // Truncate the file
      fs.ftruncate(fileDescriptor, (err) => {
        if (!err) {
          // Write to file and close it
          fs.writeFile(fileDescriptor, dataString, (err) => {
            if (!err) {
              fs.close(fileDescriptor, (err) => {
                if (!err) {
                  callback(false);
                } else {
                  callback("Error closing the file");
                }
              })
            } else {
              callback("Error writing to existing file");
            }
          });

        } else {
          callback("Error truncating the file");
        }
      });
    } else {
      callback("Could not open the file for updating as it may not exist. Try creating a new one");
    }
  });
}

// Delete a data file
lib.delete = function (dir, file, callback) {
  fs.unlink(`${lib.baseDir+dir}/${file}.json`, (err) => {
    callback(err);
  })
}

// Export the module
module.exports = lib;
