/**
 * Create and export configuration variables
 */

// Container for all the environments
const environments = {};

// Staging environment for development {default}
environments.staging = {
  "httpPort": 3000,
  "httpsPort": 3001,
  "envName": "staging",
  "hashingSecret": "thisIsASecret"
};

// Production environment
environments.production = {
  "httpPort": 5000,
  "httpsPort": 5001,
  "envName": "production",
  "hashingSecret": "thisIsAlsoASecret"
};

// Determine which environment gets passed as a command line argument
const currentEnvironment = typeof(process.env.NODE_ENV) == "string" ? process.env.NODE_ENV.toLowerCase() : "";

// Check that the local environmentis set to one of the keys on our environments object, or default to staging
const environmentToExport = typeof(environments[currentEnvironment]) == "object" ? environments[currentEnvironment] : environments.staging;

// Export the module
module.exports = environmentToExport;
