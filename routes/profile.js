/**
 * Returns the current profile of a given user.
 * routes: GET /:email? to search an unfriended user by Email address
 * routes: GET /:username? to display a friend by Username.
 */

//express is the framework we're going to use to handle requests
const express = require('express')

//Access the connection to Heroku Database
const pool = require('../utilities/exports').pool

const validation = require('../utilities/exports').validation
let isStringProvided = validation.isStringProvided

const router = express.Router()

/**
 * @apiDefine JSONError
 * @apiError (400: JSON Error)
 */

/**
 * @api {get} /email:?  search for an existing user by email address.
 * @apiName GetProfile
 * @apiGroup Profile
 * 
 * @apiDescription Request profile information for an unfriended user to display
 * 
 * @apiParam {String} email the email to retrieve the profile from.
 * 
 * @apiSuccess {Object} the profile returned.
 * @apiSuccess {Number} rowCount the number of users found (should always be 1 for found, 0 for does not exist);
 * 
 * @apiError (404: userId not found) {String} message "userId not found"
 * @apiError (400: SQL Error) {String} the reported SQL error details
 * 
 * @apiUse JSONError
 */
router.get("/:email?", (request, response, next) => {
        // validate userId of user requesting friends list
        if(request.params.email === undefined) {
            response.status(400).send({
                message: "no email request sent!"
            })
        } else {
            next()
        }
    }, (request, response) => {
        // Search for User by Email
        let query = `SELECT FirstName, LastName FROM Members WHERE Email=$1`
        let values = [request.params.email]

        pool.query(query, values)
        .then(result => {
            response.status(200).send({
                rows: result.rows
            });
        }).catch(err => {
            console.log(err)
            response.status(400).send({
                result: "ERROR",
                error: err
            });
        });
    });

/**
 * @api {get} /userId:?  search for an existing user by userName.
 * @apiName GetProfile
 * @apiGroup Profile
 * 
 * @apiDescription Request profile information for a friended user by Username
 * 
 * @apiParam {String} username the username to retrieve the profile from.
 * 
 * @apiSuccess {Object} the profile returned.
 * @apiSuccess {Number} rowCount the number of users found (should always be 1 for found, 0 for does not exist);
 * 
 * @apiError (404: userId not found) {String} message "userId not found"
 * @apiError (400: SQL Error) {String} the reported SQL error details
 * 
 * @apiUse JSONError
 */
 router.get("/:username?", (request, response, next) => {
    // validate userId of user requesting friends list
    if(request.params.email === undefined) {
        response.status(400).send({
            message: "no Username request sent!"
        })
    } else {
        next()
    }
}, (request, response) => {
    // Search for User by Email
    let query = `SELECT FirstName, LastName, Username 
                FROM Members JOIN Contacts ON Members.MemberID = Contacts.MemberID_A 
                WHERE Username=$1`
    let values = [request.params.email]

    pool.query(query, values)
    .then(result => {
        response.status(200).send({
            rows: result.rows
        });
    }).catch(err => {
        console.log(err)
        response.status(400).send({
            result: "ERROR",
            error: err
        });
    });
});


module.exports = router;