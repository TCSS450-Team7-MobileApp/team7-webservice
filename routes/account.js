//express is the framework we're going to use to handle requests
const { response } = require('express')
const { request } = require('express')
const express = require('express')

//Access the connection to Heroku Database
const pool = require('../utilities/exports').pool
const router = express.Router()

/**
 * @api {delete} /account/delete/:email? Request to register a user
 * @apiName DeleteAccount
 * @apiGroup Delete
 * 
 * @apiParam {String} email a users email *unique
 * 
 * @apiParamExample {json} Request-Body-Example:
 *  {
 *      "email":"cfb3@fake.email"
 *  }
 * 
 * @apiSuccess (Success 201) {boolean} success true when the user is deleted
 * @apiSuccess (Success 201) {String} email the email of the user deleted 
 * 
 * @apiError (404: Missing Parameters) {String} message "Failed to delete: Resource does not exist"
 */ 
router.put('/delete/:email?', (request, response, next) => {
    // verify email exists
    let query = `SELECT * FROM Members WHERE Email=$1`;
    let values = [request.params.email];

    pool.query(query, values)
    .then(result => {
        if (result.rowCount == 0) {
            response.status(200).send({
                message: 'Email not found, delete aborted.'
            })
        } else {
            next()
        }
    })
}, (request, response, next) => {
    // remove existing contacts
    let query = `DELETE FROM Contacts WHERE memberid_a=$1 OR memberid_b=$1`;
    let values = [request.params.email];

    pool.query(query, values)
    .then(result => {
        next()
    })
    .catch(err => {
        console.log("Error deleting from contacts")
        response.status(404).send({
            msesage: 'SQL Error while deleting from contacts'
        })
    })

}, (request, response, next) => {
    // delete from credentials
    let query= `DELETE FROM Credentials WHERE Credentials.memberid = (SELECT memberid FROM Members WHERE Members.email = $1)`;
    let values = [request.params.email];

    pool.query(query, values)
    .then(result => {
        next()
    })
    .catch(err => {
        console.log("error deleting credentials: " + err)
        response.status(404).send({
            message: 'SQL error while deleting from credentials'
        });
    });

}, (request, response) => {
    // delete from members
    let query = `DELETE FROM Members WHERE Members.memberid = (SELECT memberid FROM Members WHERE Members.email = $1)`;
    let values = [request.params.email];

    pool.query(query, values)
    .then(result => {
        response.status(202).send({
            message: 'Delete successful'
        })
    })
    .catch(err => {
            console.log("error deleting user: " + err)
            response.status(404).send({
                message: 'Failed to delete: Resource does not exist'
            });
        });
});

/**
 * CHANGE PASSWORD
 */
router.put('/update_pass', (request, response, next) => {
    const new_pass = get.body.new_pass;
});

module.exports = router;