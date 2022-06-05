/**
 * Returns the current friends list for a given user.
 */

//express is the framework we're going to use to handle requests
const { response } = require('express');
const express = require('express');
const { CLIENT_MULTI_RESULTS } = require('mysql/lib/protocol/constants/client');

//Access the connection to Heroku Database
const pool = require('../utilities/exports').pool;

// Define the middleware
const middleware = require('../middleware');
const jwt = require('../middleware/jwt');

const validation = require('../utilities/exports').validation;
let isStringProvided = validation.isStringProvided;
const msg_functions = require('../utilities/exports').messaging


const router = express.Router();

/**
 * @api {get} /friendsList/:memberid/:verified Display existing OR pending friends in database.
 * @apiName GetFriends
 * @apiGroup Friends
 *
 * @apiDescription Request a list of all current friends or friend requests from the server
 * with a given memberId. If no friends, should still return an empty list.
 *
 * @apiParam {Number} memberId the userId to get the friends list from.
 * @apiParam {Number} verified to return either verified or friend requests.
 *
 * @apiSuccess {Number} friendsCount the number of friends returned.
 * @apiSuccess {Object[]} friendsList the list of friends in the friends table.
 * @apiSuccess {Number} rowCount the number of rows returned
 *
 * @apiError (404: userId not found) {String} message "no memberid request sent!"
 * @apiError (400: SQL Error) {String} the reported SQL error details
 *
 * Call this query with BASE_URL/friendsList/MemberID
 */
router.get(
    '/:memberid/:verified',
    (request, response, next) => {
        // validate memberid of user requesting friends list
        if (request.params.memberid === undefined) {
            response.status(400).send({
                message: 'no memberid request sent!',
            });
        } else {
            next();
        }
    },
    (request, response, next) => {
        // validate that the memberid exists
        let query = `SELECT * FROM Credentials WHERE MemberID=$1`;
        let values = [request.params.memberid];

        pool.query(query, values)
            .then((result) => {
                next();
            })
            .catch((error) => {
                response.status(400).send({
                    message: 'SQL Error',
                    error: error,
                });
            });
    },
    (request, response) => {
        // perform the Select*
        let query = `SELECT Members.MemberId as id, Members.FirstName AS FirstName, Members.LastName AS LastName, Members.Username AS Username, Members.Email AS Email
                        FROM Contacts LEFT JOIN Members ON Members.MemberID = Contacts.MemberID_A
                        WHERE MemberID_B=$1 AND Contacts.verified = $2
                        ORDER BY LastName ASC`;
        let values = [request.params.memberid, request.params.verified];

        pool.query(query, values)
            .then((result) => {
                response.send({
                    userId: request.params.memberid,
                    rowCount: result.rowCount,
                    rows: result.rows,
                });
            })
            .catch((err) => {
                response.status(400).send({
                    message: 'SQL Error',
                    error: err,
                });
            });
    }
);


/**
 * @api {post} /friendsList/request/:memberid? Send a friend request
 * @apiName friendRequest
 * @apiGroup Friends
 *
 * @apiParam {String} MemberA the memberid of the Member requesting a friend
 * @apiParam {String} MemberB the memberid of the user being requested as a friend
 *
 * @apiDescription a post to initiate a friend request
 *
 * @apiSuccess {String} message success: true after a successful pass to pushy util
 *
 * @apiError (404: memberid not found) {String} message: "memberid not found"
 *
 * To use this query, the URL should be BASE_URL/friendsList/request/:memberid?
 * where :memberid? is the current user
 */
router.post(
    '/request/',
    jwt.checkToken,
    (request, response, next) => {
        // middleware will check that the requester is using a valid token

        // verify that the requested contact is a valid user
        let query = 'SELECT * FROM Members WHERE MemberID=$1';
        let values = [request.body.memberid];

        pool.query(query, values)
            .then((result) => {
                if (result.rowCount == 0) {
                    response.status(400).send({
                        message: 'memberid not found!',
                    });
                } else {
                    response.username = result.rows.username;
                    response.firstname = result.rows.firstname;
                    response.lastname = result.rows.lastname;
                    response.email = result.rows.email;
                    next();
                }
            })
            .catch((err) => {
                console.log('error finding user: ' + err);
                response.status(400).send({
                    message: 'SQL error',
                });
            });
    }, (request, response, next) => {
        // verify that friend does not already exist!
        let query = `SELECT MemberID_B FROM Contacts WHERE (MemberID_A=$1 AND MemberID_B=$2)
                    OR (MemberID_B=$1 AND MemberID_A=$2)`
        let values = [request.decoded.memberid, request.body.memberid];

        pool.query(query, values)
            .then((result) => {
                if (result.rowCount!=0) {
                    response.status(200).send({
                        message: 'pending friend request already exists.'
                    })
                } else {
                    next()
                }
            })
    },(request, response, next) => {
        // insert new unverified friend
        let query =
            `INSERT into Contacts (PrimaryKey, MemberID_A, MemberID_B, Verified) VALUES (DEFAULT, $1, $2, 0)
            RETURNING MemberID_B, Verified`;
        let values = [request.decoded.memberid, request.body.memberid];

        pool.query(query, values)
            .then((result) => {
                if (result.rowCount == 0) {
                    response.status(400).send({
                        message: 'Error inserting friend request!'
                    })
                } else {
                    response.memberid_b = result.rows.memberid_b;
                    response.status = result.rows.verified;
                    next()
                }
            })
            .catch((err) => {
                console.log('error adding: ' + err);
                response.status(400).send({
                    message: 'SQL Error: Insert failed',
                });
            });
    }, (request, response) => {
    // Send a notification of this chat addition to ALL members with registered tokens
    let query = `SELECT token FROM Push_Token
                INNER JOIN Contacts ON
                Push_Token.memberid = Contacts.memberid_a
                WHERE Contacts.memberid_b=$1`
    let values = [request.body.memberid]

    pool.query(query, values)
        .then(result => {
            if (result.rowCount==0) {
                response.status(200).send({
                    message: "No push token found, notification failed."
                })
            } else {
                result.rows.forEach(entry => 
                msg_functions.friendRequest(
                    entry.token, 
                    response.memberid_b,
                    response.username,
                    response.firstname,
                    response.lastname,
                    response.email,
                    response.status
                    ))
                response.status(200).send({
                    message: "Pushy requests sent",
                    success:true
                })
            }
        }).catch(err => {
            response.status(400).send({
            message: "SQL Error on select from push token",
            error: err
        })
    })
});

/**
 * @api {post} /friendsList/verify/:memberid? Verify
 * @apiName friendRequest
 * @apiGroup Friends
 *
 * @apiParam {String} MemberA the memberid of the Member requesting a friend
 * @apiParam {String} MemberB the memberid of the user being requested as a friend
 *
 * @apiDescription a post to initiate a friend request
 *
 * @apiSuccess (200) {String} message "friend verification successful"
 *
 * @apiError (404: memberid not found) {String} message: "memberid not found"
 *
 * To use this query, the URL should be BASE_URL/friendsList/verify/:memberid?
 * where :memberid? is the current user
 *
 * Verified: 0=pending, 1=verified
 */
router.post(
    '/verify/:memberid?',
    middleware.checkToken,
    (request, response, next) => {
        // middleware will check that the requester is using a valid token

        // verify that the requested contact is a valid user
        let query = 'SELECT * FROM Members WHERE MemberID=$1';
        let values = [request.body.memberid];

        pool.query(query, values)
            .then((result) => {
                next();
            })
            .catch((err) => {
                console.log('error getting memberid: ' + err);
                response.status(400).send({
                    message: 'Requested memberid does not exist!',
                });
            });
    },
    (request, response, next) => {
        // verify that a pending friend request currently exists
        let query = `SELECT MemberID_A, MemberID_B, Verified FROM Contacts WHERE MemberID_A=$2 AND MemberID_B=$1`;
        let values = [request.params.memberid, request.body.memberid];

        pool.query(query, values)
            .then((result) => {
                //stash the memberid's into the request object to be used in the next function
                request.memberid_a = result.rows[0].memberid_a;
                request.memberid_b = result.rows[0].memberid_b;
                request.verified = result.rows[0].verified;
                if (result.rows == 0) {
                    response.status(400).send({
                        message: 'No pending friend request found',
                    });
                } else if (request.verified != 0) {
                    console.log(request.verified);
                    response.status(400).send({
                        message: 'Users have already been verified',
                    });
                } else {
                    next();
                }
            })
            .catch((err) => {
                console.log('error getting stashed memberids: ' + err);
                response.status(400).send({
                    message: 'Stashed memberid does not exist',
                });
            });
    },
    (request, response, next) => {
        // update the existing friend
        let query =
            'UPDATE Contacts SET Verified=1 WHERE (MemberID_A=$1 AND MemberID_B=$2)';
        let values = [request.memberid_a, request.memberid_b];

        pool.query(query, values)
            .then((result) => {
                next()
            })
            .catch((err) => {
                console.log('SQL Error verifying friend');
                response.status(400).send({
                    message:
                        'SQL error updating verification in Contacts table',
                });
            });
    },
    (request, response) => {
        // update the existing friend
        let query =
            'INSERT into Contacts (PrimaryKey, MemberID_A, MemberID_B, Verified) VALUES (DEFAULT, $2, $1, 1)';
        let values = [request.memberid_a, request.memberid_b];

        pool.query(query, values)
            .then((result) => {
                response.status(200).send({
                    message: 'Friend verification successful',
                });
            })
            .catch((err) => {
                console.log('SQL Error verifying friend');
                response.status(400).send({
                    message:
                        'SQL error updating verification in Contacts table',
                });
            });
    }
);

/**
 * NOTE: THIS QUERY DOES NOT REQUIRE AUTHORIZATION
 * 
 * @api {put} /friendsList/delete/:memberid? Remove a friend from friend's list
 * @apiName deleteFriends
 * @apiGroup Friends
 *
 * @apiParam {String} MemberA the memberid of the Member requesting deletion
 * @apiParam {String} MemberB the memberid of the user being deleted from MemberA's friendsList
 *
 * @apiDescription a query to delete a friend from friendsList
 *
 * @apiSuccess (200) {String} decoded jwt
 *
 *  @apiError (404: memberid not found) {String} message "memberid not found"
 *
 * NOTE: To use this query, the URL should be BASE_URL/friendsList/delete/:memberid?
 * where :memberid? is the current user. The app should pass in the body the memberid of the user to be removed.
 */
router.delete(
    '/delete/:memberida/:memberidb',
    middleware.checkToken,
    (request, response, next) => {
        // middleware.checkToken will verify that a token holder is the requester

        let query = `DELETE FROM Contacts WHERE (MemberID_A=$1 AND MemberID_B=$2) OR (MemberID_A=$2 AND MemberID_B=$1)`;
        let values = [request.params.memberida, request.params.memberidb];

        pool.query(query, values)
        .then((result) => {
                response.status(200)
                .send({
                    message: jwt.decoded
                })
        })
        .catch((err) => {
            console.log('error deleting: ' + err);
                response.status(400).send({
                    message: 'Error deleting user from friendsList'
            });
        });
});

module.exports = router;
