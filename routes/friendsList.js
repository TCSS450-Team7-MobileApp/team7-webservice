/**
 * Returns the current friends list for a given user.
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
 * @api {get} /friendsList Display existing friends in database.
 * @apiName GetFriends
 * @apiGroup Friends
 * 
 * @apiDescription Request a list of all current friends from the server
 * with a given userId. If no friends, should still return an empty list.
 * 
 * @apiParam {Number} userId the userId to get the friends list from.
 * 
 * @apiSuccess {Number} friendsCount the number of friends returned.
 * @apiSuccess {Object[]} friendsList the list of friends in the friends table.
 * 
 * @apiError (404: userId not found) {String} message "userId not found"
 * @apiError (400: SQL Error) {String} the reported SQL error details
 * 
 * @apiUse JSONError
 * 
 * Call this query with BASE_URL/friendsList/USERNAME
 */
router.get('/:memberid?', (request, response, next) => {
        // validate memberid of user requesting friends list
        if(request.params.memberid === undefined) {
            response.status(400).send({
                message: "no memberid request sent!"
            })
        } else {
            next()
        }
    }, (request, response, next) => {
        // validate that the memberid exists
        let query = `SELECT * FROM Credentials WHERE MemberID=$1`
        let values = [request.params.memberid]

        pool.query(query, values)
            .then(result => {
                next()
            }).catch(error => {
                response.status(400).send({
                    message: "SQL Error",
                    error: error
                })
            })  
    }, (request, response) => {
        // perform the Select*
        let query = `SELECT Members.FirstName AS FirstName, Members.LastName AS LastName, Members.NickName AS NickName, Members.Email AS Email
                        FROM Contacts INNER JOIN Members ON Members.MemberID = Contacts.MemberID_A 
                        WHERE MemberID_A=$1
                        ORDER BY LastName ASC`
        let values = [request.params.memberid]

        pool.query(query, values)
            .then(result => {
                response.send({
                    userId: request.params.memberid,
                    rowCount: result.rowCount,
                    rows: result.rows
                    })
                }).catch(err => {
                    response.status(400).send({
                        message: "SQL Error",
                        error: err
                    })
                })
            });

module.exports = router;