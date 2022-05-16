//express is the framework we're going to use to handle requests
const express = require('express')

//Access the connection to Heroku Database
const pool = require('../utilities/exports').pool

const router = express.Router()

const middleware = require('../middleware')

/**
 * @api {put} /auth Request to insert a Pushy Token for the user
 * @apiName PutAuth
 * @apiGroup Auth
 * 
 * @apiHeader {String} authorization Valid JSON Web Token JWT
 * @apiParam {String} token the Pushy Token of the user identified in the JWT
 * 
 * @apiSuccess {boolean} success true when the pushy token is inserted
 * 
 * @apiError (400: Missing Parameters) {String} message "Missing required information"
 * 
 * @apiError (404: User Not Found) {String} message "user not found"
 * 
 * @apiError (400: JSON Error) {String} message "malformed JSON in parameters"
 * 
 * @apiError (400: SQL Error) {String} message the reported SQL error details
 */ 
router.put('/', middleware.checkToken, (request, response, next) => {
    //validate on missing parameters
    //don't need to check JWT, it was already checked via middleware.js
    if (!request.body.token) {
        response.status(400).send({
            message: "Missing required information"
        })
    }  else {
        next()
    }
}, (request, response, next) => {
    //the JWT middleware.js function decodes the JWT and stores the email 
    //and memberId in an object called decoded. It adds this object to 
    //the request object. 
    let memberid = request.decoded.memberid

    //validate email exists
    let query = 'SELECT * FROM Members WHERE MemberId=$1'
    let values = [memberid]

    pool.query(query, values)
        .then(result => {
            if (result.rowCount == 0) {
                //this should NOT happen. The memberid is coming from a 
                //JWT created by this service. But, keep the check here
                //anyway.
                response.status(404).send({
                    message: "user not found"
                })
            } else {
                //user found
                next()
            }
        }).catch(error => {
            response.status(400).send({
                message: "SQL Error",
                error: error
            })
        })
}, (request, response) => {
    //ON CONFLICT is a Postgressql syntax. it allows for an extra
    //action when conflicts occur with inserts. This will update 
    //an existing users token. 
    let insert = `INSERT INTO Push_Token(MemberId, Token)
                  VALUES ($1, $2)
                  ON CONFLICT (MemberId) DO UPDATE SET token=$2
                  RETURNING *`
    let values = [request.decoded.memberid, request.body.token]
    pool.query(insert, values)
        .then(result => {
            response.send({
                success: true
            })
        }).catch(err => {
            response.status(400).send({
                message: "SQL Error",
                error: err
            })
        })
})

/**
 * @api {delete} /auth Request to delete a Pushy Token for the user
 * @apiName DeleteAuth
 * @apiGroup Auth
 * 
 * @apiHeader {String} authorization Valid JSON Web Token JWT
 * 
 * @apiSuccess {boolean} success true when the pushy token is deleted
 * 
 * @apiError (400: Missing Parameters) {String} message "Missing required information"
 * 
 * @apiError (404: User Not Found) {String} message "user not found"
 * 
 * @apiError (400: JSON Error) {String} message "malformed JSON in parameters"
 * 
 * @apiError (400: SQL Error) {String} message the reported SQL error details
 */ 
router.delete('/', middleware.checkToken, (request, response, next) => {
    //the JWT middleware.js function decodes the JWT and stores the email 
    //and memberId in an object called decoded. It adds this object to 
    //the request object. 
    let memberid = request.decoded.memberid

    //validate email exists
    let query = 'SELECT * FROM Members WHERE MemberId=$1'
    let values = [memberid]

    pool.query(query, values)
        .then(result => {
            if (result.rowCount == 0) {
                //this should NOT happen. The memberid is coming from a 
                //JWT created by this service. But, keep the check here
                //anyway.
                response.status(404).send({
                    message: "user not found"
                })
            } else {
                //user found
                next()
            }
        }).catch(error => {
            response.status(400).send({
                message: "SQL Error",
                error: error
            })
        })
}, (request, response) => {
    //delete the users pushy token
    let insert = `DELETE FROM Push_Token
                  WHERE MemberId=$1
                  RETURNING *`
    let values = [request.decoded.memberid]
    pool.query(insert, values)
        .then(result => {
            response.send({
                success: true
            })
        }).catch(err => {
            response.status(400).send({
                message: "SQL Error",
                error: err
            })
        })
})

module.exports = router