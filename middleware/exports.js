let checkToken = require('./jwt.js').checkToken
let jsonErrorInBody = require('./handleErrors.js').jsonErrorInBody

module.exports = {
    checkToken, jsonErrorInBody
}