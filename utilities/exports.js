//Get the connection to Heroku Database
const pool = require('./sql_conn.js');

//Get the crypto utility functions
const credUtils = require('./credentialingUtils');
const generateHash = credUtils.generateHash;
const generateSalt = credUtils.generateSalt;

const validation = require('./validationUtils.js');

const sendEmail = require('./email.js').sendEmail;
const emailTemplate = require('./email.js').emailTemplate;
let messaging = require('./pushy_utilities.js');
const weatherUtils = require('./weatherUtils');

module.exports = {
    pool,
    generateHash,
    generateSalt,
    validation,
    sendEmail,
    emailTemplate,
    messaging,
    weatherUtils,
};
