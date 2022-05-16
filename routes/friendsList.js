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
                        FROM Contacts LEFT JOIN Members ON Members.MemberID = Contacts.MemberID_B 
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
 * @api {post} /friendsList/request/:username? Send a friend request
 * @apiName friendRequest
 * @apiGroup Friends
 * 
 * @apiParam {String} MemberA the username of the Member requesting a friend
 * @apiParam {String} MemberB the username of the user being requested as a friend
 * 
 * @apiDescription a post to initiate a friend request
 * 
 * @apiSuccess (200) {String} message "friend request sent"
 * 
 * @apiError (404: username not found) {String} message: "username not found"
 * 
 * To use this query, the URL should be BASE_URL/friendsList/request/:username?
 * where :username? is the current user
 */
router.post("/request/:username?", middleware.checkToken, (request, response, next) => {
    // middleware will check that the requester is using a valid token

    // verify that the requester is a valid user
    let query = "SELECT Username FROM Members WHERE Username=$1"
    let values = [request.body.username]

    pool.query(query, values)
    .then(result => {
        next()
        }).catch(err => {
            console.log("error finding user: " + err)
            response.status(400).send({
                message: 'Current username does not exist'
            })
        })
}), (request, response, next) => {
    // get memeberIDs
    let query = `SELECT MemberID FROM Members WHERE Username=$1 OR Username=$2`
    let values = [request.params.username, request.body.username]

    pool.query(query, values)
    .then(result => {
        //stash the memberid's into the request object to be used in the next function
        request.memberid_a = result.rows[0].memberid_a
        request.memberid_b = result.rows[1].memberid_b
        if (result.rows < 2) {
            response.status(400).send({
                message: 'One or both usernames are invalid'
            })
        } else {
            next()
        }}).catch(err => {
            console.log("error getting users: " + err)
            response.status(400).send({
                message: 'SQL Error getting users for friend request'
            })
        })
}, (request, response) => {
    // insert new unverified friend 
    let query = 'INSERT into Contacts (PrimaryKey, MemberID_A, MemberID_B, Verified) VALUES (DEFAULT, $1, $2, 0)'
    let values = [request.memberid_a, request.memberid_b]

    pool.query(query, values)
    .then(result => {
        response.status(200).send({
            message: "Friend request successfully sent"
        }).catch(err => {
            console.log("error adding: " + err)
            response.status(400).send({
                message: 'SQL Error: Insert failed'
            });
        });
    })
}

/** 
 * @api {post} /friendsList/verify/:username? Verify
 * @apiName friendRequest
 * @apiGroup Friends
 * 
 * @apiParam {String} MemberA the username of the Member requesting a friend
 * @apiParam {String} MemberB the username of the user being requested as a friend
 * 
 * @apiDescription a post to initiate a friend request
 * 
 * @apiSuccess (200) {String} message "friend request sent"
 * 
 * @apiError (404: username not found) {String} message: "username not found"
 * 
 * To use this query, the URL should be BASE_URL/friendsList/verify/:username?
 * where :username? is the current user
 * 
 * Verified: 0=pending, 1=verified
 */
 router.post("/verify/:username?", middleware.checkToken, (request, response, next) => {
    // middleware will check that the requester is using a valid token

    // verify that the requester is a valid user
    let query = "SELECT Username FROM Members WHERE Username=$1"
    let values = [request.body.username]

    pool.query(query, values)
    .then(result => {
        next()
        }).catch(err => {
            console.log("error deleting: " + err)
            response.status(400).send({
                message: 'Current username does not exist'
            })
        })
}), (request, response, next) => {
    // verify that a pending friend request currently exists
    let query = `SELECT MemberID_A, MemberID_B, Verified FROM Contacts WHERE MemberID_A= 
                (SELECT Memberid FROM Members WHERE Username=$1) AND MemberID_B= 
                (SELECT Memberid FROM Members WHERE Username=$2)`
    let values = [request.params.username, request.body.username]
    
    pool.query(query, values)
    .then(result => {
        //stash the memberid's into the request object to be used in the next function
        request.memberid_a = result.rows[0].memberid_a
        request.memberid_b = result.rows[1].memberid_b
        request.verified = result.rows[2].verified
        if (result.rows == 0) {
            response.status(400).send({
                message: 'No pending friend request found'
            })
        }
        else if (request.verified!=0) {
            response.status(400).send({
                message: 'Users have already been verified'
            })
        } else {
            next()
        }}).catch(err => {
            console.log("error deleting: " + err)
            response.status(400).send({
                message: 'Current username does not exist'
            })
        })
}, (request, response, next) => {
    // insert new unverified friend 
    let query = 'INSERT into Contacts (PrimaryKey, MemberID_A, MemberID_B, Verified) VALUES (DEFAULT, $2, $1, 1)'  //NOTE: This is intentionally backwards since both friends are an A and a B for the other.
    let values = [request.memberid_a, request.memberid_b]

    pool.query(query, values)
    .then(result => {
        next()
        }).catch(err => {
            console.log("error adding: " + err)
            response.status(400).send({
                message: 'SQL Error: Insert failed'
            });
        });
}, (request, response) => {
    // update the existing friend
    let query = 'UPDATE Contacts SET Verified=1 WHERE MemberID_A=$1 AND MemberID_B=$2'
    let values = [request.memberid_a, request.memberid_b]

    pool.query(query, values)
    .then(result => {
        response.status(200).send({
            message: 'Friend verification successful'
        }).catch(err => {
            console.log("SQL Error verifying friend")
            response.status(400).send({
                message: 'SQL error updating verification in Contacts table'
            })
        })
    })
}


/**
 * NOTE: THIS QUERY DOES NOT REQUIRE AUTHORIZATION
 * sl
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
router.delete("/delete/:username?",  middleware.checkToken, (request, response) => {

    // middleware.checkToken will verify that MemberID_A is the requester
    
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