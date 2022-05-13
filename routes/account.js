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

    let query1 = `DELETE FROM Credentials WHERE Credentials.memberid = (SELECT memberid FROM Members WHERE Members.email = $1)`;
    let query2 = `DELETE FROM Members WHERE Members.memberid = (SELECT memberid FROM Members WHERE Members.email = 'your@email.com');`
    let values = [request.body.email];

    pool.query(query1, values)
    .then(result => {
        next()
    }).catch(err => {
        console.log("error deleting credentials: " + err)
        response.status(404).send({
            message: 'Failed to delete: Resource does not exist'
        });
    });

    pool.query(query2, values)
    .then(result => {
        response.status(202).send({
            message: 'Delete successful'
        }).catch(err => {
            console.log("error deleting user: " + err)
            response.status(404).send({
                message: 'Failed to delete: Resource does not exist'
            });
        });
    });
});

module.exports = router;