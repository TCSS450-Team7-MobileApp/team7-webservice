/**
 * Returns the current friends list for a given user.
 */

//express is the framework we're going to use to handle requests
const { response } = require('express')
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
        let query = `SELECT Members.FirstName AS FirstName, Members.LastName AS LastName, Members.Username AS Username, Members.Email AS Email
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

/**
 * @api {put} /friendsList/delete/:username? Remove a friend from friend's list
 * @apiName deleteFriends
 * @apiGroup Friends
 * 
 * @apiParam {String} MemberA the username of the Member requesting deletion
 * @apiParam {String} MemberB the username of the user being deleted from MemberA's friendsList
 * 
 * @apiDescription a query to delete a friend from friendsList
 * 
 * @apiSuccess (200) {String} message "user deleted from friendsList"
 * 
 *  @apiError (404: username not found) {String} message "username not found"
 * 
 * NOTE: To use this query, the URL should be BASE_URL/friendsList/delete/:username? 
 * where :username? is the current user. The app should pass in the body the username of the user to be removed.
 */
router.put("/delete/:username?", (request, response) => {
    let query = `DELETE FROM Contacts WHERE 
                MemberID_A=(SELECT MemberID FROM Members WHERE Username=$1) 
                AND MemberID_B=(SELECT MemberID FROM Members WHERE Username=$2)`
    let values = [request.params.username, request.body.MemberB]

    pool.query(query, values)
    .then(result => {
        response.status(200).send({
            message: "Friend successfully deleted"
        }).catch(err => {
            console.log("error deleting: " + err)
            response.status(400).send({
                message: 'Error deleting user from friendsList'
            });
        });
    });
});


module.exports = router;