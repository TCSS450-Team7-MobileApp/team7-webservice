//express is the framework we're going to use to handle requests
const { response } = require('express');
const { request } = require('express');
const express = require('express');

// JWT for verification link
const jwt = require('jsonwebtoken');
const config = {
    secret: process.env.JSON_WEB_TOKEN,
};
const path = require('path');

//Access the connection to Heroku Database
const pool = require('../utilities').pool;

const validation = require('../utilities').validation;
let isStringProvided = validation.isStringProvided;
const validateEmail = validation.validateEmail;
const validatePassword = validation.validatePassword;

const generateHash = require('../utilities').generateHash;
const generateSalt = require('../utilities').generateSalt;

const sendEmail = require('../utilities').sendEmail;
const emailTemplate = require('../utilities').emailTemplate;

const router = express.Router();

/**
 * @api {post} /register Request to register a user
 * @apiName PostRegister
 * @apiGroup Register
 *
 * @apiParam {String} first a users first name
 * @apiParam {String} last a users last name
 * @apiParam {String} email a users email *unique
 * @apiParam {String} password a users password
 * @apiParam {String} [username] a username *unique, if none provided, email will be used
 *
 * @apiParamExample {json} Request-Body-Example:
 *  {
 *      "first":"Charles",
 *      "last":"Bryan",
 *      "email":"cfb3@fake.email",
 *      "password":"test12345"
 *  }
 *
 * @apiSuccess (Success 201) {boolean} success true when the name is inserted
 * @apiSuccess (Success 201) {String} email the email of the user inserted
 *
 * @apiError (400: Missing Parameters) {String} message "Missing required information"
 *
 * @apiError (400: Username exists) {String} message "Username exists"
 *
 * @apiError (400: Email exists) {String} message "Email exists"
 *
 * @apiError (400: Other Error) {String} message "other error, see detail"
 * @apiError (400: Other Error) {String} detail Information about th error
 *
 */
router.post(
    '/',
    (request, response, next) => {
        //Retrieve data from query params
        const first = request.body.first;
        const last = request.body.last;
        const username = request.body.username;
        const email = request.body.email;
        const password = request.body.password;
        

        //Verify that the caller supplied all the parameters
        //In js, empty strings or null values evaluate to false
        if (
            !(
                isStringProvided(first) &&
                isStringProvided(last) &&
                isStringProvided(username) &&
                isStringProvided(email) &&
                isStringProvided(password)
            )
        ) {
            response.status(400).send({
                message: 'Missing required information',
            });
            return;
        }
        if (!validateEmail(email)) {
            response.status(400).send({
                message: 'Invalid email',
            });
            return;
        }
        if (!validatePassword(password)) {
            response.status(400).send({
                message: 'Invalid password',
            });
            return;
        }
        //We're using placeholders ($1, $2, $3) in the SQL query string to avoid SQL Injection
        //If you want to read more: https://stackoverflow.com/a/8265319
        let theQuery =
            'INSERT INTO MEMBERS(FirstName, LastName, Username, Email) VALUES ($1, $2, $3, $4) RETURNING Email, MemberID';
        let values = [first, last, username, email];
        pool.query(theQuery, values)
            .then((result) => {
                //stash the memberid into the request object to be used in the next function
                request.memberid = result.rows[0].memberid;
                next();
            })
            .catch((error) => {
                //log the error  for debugging
                // console.log("Member insert")
                // console.log(error)
                if (error.constraint == 'members_username_key') {
                    response.status(400).send({
                        message: 'Username exists',
                    });
                } else if (error.constraint == 'members_email_key') {
                    response.status(400).send({
                        message: 'Email exists',
                    });
                } else {
                    response.status(400).send({
                        message: 'other error, see detail',
                        detail: error.detail,
                    });
                }
            });
    },
    (request, response) => {
        //We're storing salted hashes to make our application more secure
        //If you're interested as to what that is, and why we should use it
        //watch this youtube video: https://www.youtube.com/watch?v=8ZtInClXe1Q
        let salt = generateSalt(32);
        let salted_hash = generateHash(request.body.password, salt);

        let theQuery =
            'INSERT INTO CREDENTIALS(MemberId, SaltedHash, Salt) VALUES ($1, $2, $3)';
        let values = [request.memberid, salted_hash, salt];

        pool.query(theQuery, values)
            .then((result) => {
                //We successfully added the user!
                response.status(201).send({
                    success: true,
                    email: request.body.email,
                }); // TESTING VERIFICATION:

                // Make JWT token
                const token = jwt.sign(
                    {
                        memberid: request.memberid,
                        email: request.body.email,
                    },
                    config.secret,
                    {
                        expiresIn: '1d',
                    }
                );

                // For Production
                const link = `https://tcss450-team7.herokuapp.com/verify/${token}`;

                // For local testing
                // const link = `http://localhost:5000/verify/${token}`;

                sendEmail(
                    process.env.EMAIL_USERNAME,
                    request.body.email,
                    'Chatterbug: Account confirmation',
                    emailTemplate('verify', link)
                );
            })
            .catch((error) => {
                //log the error for debugging
                // console.log("PWD insert")
                // console.log(error)

                /***********************************************************************
                 * If we get an error inserting the PWD, we should go back and remove
                 * the user from the member table. We don't want a member in that table
                 * without a PWD! That implementation is up to you if you want to add
                 * that step.
                 **********************************************************************/

                response.status(400).send({
                    message: 'other error, see detail',
                    detail: error.detail,
                });
            });
    }
);

/**
 * @api {put} /forgotPass/:token  initiate email replacement for Forgot Password
 * @apiName PutForgotPass
 * @apiGroup register
 * 
 * @apiDescription verifies valid jwt of requester then sends email with a temporary password for rest
 * 
 * @apiParam token the JWT token of the user requesting a password reset
 * 
 * @apiSuccess (201) {JSON} success:true, temp_pass, email
 * 
 * @apiError (400) {String} message: No Verified User
 * 
 */
 router.put('/forgotPass/:token', 
 (request, response, next) => {
 
     // Decode from jwt token to grab the memberid
     const decoded = jwt.verify(req.params.token, config.secret);
     req.decoded = decoded;

     const query =
         'SELECT MemberID FROM Members WHERE MemberID = $1 AND Verification = 1';
     const values = [decoded.memberid];
     pool.query(query, values)
         .then((result) => {
             if (result.rowCount != 0) {
                 next();
             }
             else {
                 res.status(400).send({
                     message: 'No verified user.',
                 });
             }
         })
         .catch((err) => {
             res.status(400).send({ message: err.detail });
         });
 },
 (request, response) => {
     
     const temp_pass = getTempPass();

     let salt = generateSalt(32);
     let salted_hash = generateHash(temp_pass, salt);

     let theQuery =
         `UPDATE Credentials let SaltedHash=$2, Salt=$3 WHERE MemberId=$1`
     let values = [decoded.memberid, salted_hash, salt];

     pool.query(theQuery, values)
         .then((result) => {
             //We successfully updated the password!
             response.status(201).send({
                 success: true,
                 pass: temp_pass,
                 email: request.body.email,
             }); // TESTING VERIFICATION:

             // Make JWT token
             const token = jwt.sign(
                 {
                     memberid: request.memberid,
                     email: request.body.email,
                 },
                 config.secret,
                 {
                     expiresIn: '14d',
                 }
             );

             // For Production
             const link = `https://tcss450-team7.herokuapp.com/resetpass/${token}`;

             sendEmail(
                 process.env.EMAIL_USERNAME,
                 request.body.email,
                 temp_pass,
                 'Chatterbug: Here is your temporary password, please follow the link below to set a new one!',
                 emailTemplate(link)
             );
         })
         .catch((error) => {
             //log the error for debugging
             // console.log("PWD insert")
             // console.log(error)

             /***********************************************************************
              * If we get an error inserting the PWD, we should go back and remove
              * the user from the member table. We don't want a member in that table
              * without a PWD! That implementation is up to you if you want to add
              * that step.
              **********************************************************************/

             response.status(400).send({
                 message: 'other error, see detail',
                 detail: error.detail,
             });
         });
});

/**
 * @api /register/resetPass/:token reset the password from email request
 * @apiName PutResetPass
 * @apiGroup Register
 * 
 * @apiDescription resets the password upon successful validation of temporary password.
 * 
 */
 router.put('/resetPass/:token', 
 (request, response, next) => {
 
     // Decode from jwt token to grab the memberid
     const decoded = jwt.verify(req.params.token, config.secret);
     req.decoded = decoded;

     const query =
         'SELECT MemberID FROM Members WHERE MemberID = $1 AND Verification = 1';
     const values = [decoded.memberid];
     pool.query(query, values)
         .then((result) => {
             if (result.rowCount != 0) {
                 next();
             }
             else {
                 res.status(400).send({
                     message: 'No verified user.',
                 });
             }
         })
         .catch((err) => {
             res.status(400).send({ message: err.detail });
         });
 },
 (request, response) => {
     
     const new_pass = request.body.new_pass;

     let salt = generateSalt(32);
     let salted_hash = generateHash(new_pass, salt);

     let theQuery =
         `UPDATE Credentials let SaltedHash=$2, Salt=$3 WHERE MemberId=$1`
     let values = [decoded.memberid, salted_hash, salt];

     pool.query(theQuery, values)
         .then((result) => {
             //We successfully updated the password!
             response.status(201).send({
                 success: true,
                 email: request.body.email,
             }); // TESTING VERIFICATION:

             // Make JWT token
             const token = jwt.sign(
                 {
                     memberid: request.memberid,
                     email: request.body.email,
                 },
                 config.secret,
                 {
                     expiresIn: '1d',
                 }
             );

             // For Production
             const link = `https://tcss450-team7.herokuapp.com/passwordChanged/${token}`;

             // For local testing
             // const link = `http://localhost:5000/verify/${token}`;

             sendEmail(
                 process.env.EMAIL_USERNAME,
                 request.body.email,
                 'Chatterbug: Password successfully updated',
                 emailTemplate(link)
             );
         })
         .catch((error) => {
             //log the error for debugging
             // console.log("PWD insert")
             // console.log(error)

             /***********************************************************************
              * If we get an error inserting the PWD, we should go back and remove
              * the user from the member table. We don't want a member in that table
              * without a PWD! That implementation is up to you if you want to add
              * that step.
              **********************************************************************/

             response.status(400).send({
                 message: 'other error, see detail',
                 detail: error.detail,
             });
         });
});

function getTempPass() {
 var pass = '';
         var str = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ' + 
                 'abcdefghijklmnopqrstuvwxyz0123456789@#$';
           
         for (let i = 1; i <= 8; i++) {
             var char = Math.floor(Math.random()
                         * str.length + 1);
               
             pass += str.charAt(char)
         }
           
         return pass;
}

module.exports = router;