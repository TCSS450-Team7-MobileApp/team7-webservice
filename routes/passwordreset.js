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
const validatePassword = validation.validatePassword;

const generateHash = require('../utilities').generateHash;
const generateSalt = require('../utilities').generateSalt;

const sendEmail = require('../utilities').sendEmail;
const emailTemplate = require('../utilities').emailTemplate;

const router = express.Router();


/**
 * @api {get} /getuser Request to get a user from the system
 * @apiName GetUsername
 * @apiGroup PasswordReset
 *
 * @apiHeader {String} authorization "username:password" uses Basic Auth
 *
 * @apiSuccess {boolean} success true when the name is found and password matches
 * @apiSuccess {String} message "You should get a temporary password in your email."
 * @apiSuccess {String} token JSON Web Token
 *
 *  * @apiSuccessExample {json} Success-Response:
 *     HTTP/1.1 201 OK
 *     {
 *       "success": true,
 *       "message": "You should get a temporary password in your email.",
 *       "token": "eyJhbGciO...abc123"
 *     }
 *
 * @apiError (400: Missing Authorization Header) {String} message "Missing Authorization Header"
 *
 * @apiError (400: Malformed Authorization Header) {String} message "Malformed Authorization Header"
 *
 * @apiError (404: User Not Found) {String} message "User not found"
 *
 * @apiError (400: Invalid Credentials) {String} message "Credentials did not match"
 *
 */
 router.get(
    '/',
    (request, response, next) => {
        if (
            isStringProvided(request.headers.authorization) &&
            request.headers.authorization.startsWith('Basic ')
        ) {
            next();
        } else {
            response
                .status(400)
                .json({ message: 'Missing Authorization Header' });
        }
    },
    (request, response, next) => {
        // obtain auth credentials from HTTP Header
        const base64Credentials = request.headers.authorization.split(' ')[1];

        const credentials = Buffer.from(base64Credentials, 'base64').toString(
            'ascii'
        );

        const [email] = credentials.split(':');

        if (isStringProvided(email)) {
            request.auth = {
                email: email
            };
            next();
        } else {
            response.status(400).send({
                message: 'Malformed Authorization Header',
            });
        }
    },
    (request, response, next) => {
        const query =
            'SELECT MemberID FROM Members WHERE Email=$1 AND Verification=1';
        const value = [request.auth.email];
        pool.query(query, value).then((result) => {
            if (result.rowCount === 0) {
                response.status(401).send({
                    email: request.auth.email,
                    message: 'Please verify your email address',
                });
            } else next();
        });
    },
    (request, response) => {
        const theQuery = `SELECT username, saltedhash, salt, Credentials.memberid FROM Credentials
                      INNER JOIN Members ON
                      Credentials.memberid=Members.memberid 
                      WHERE Members.email=$1`;
        const values = [request.auth.email];
        pool.query(theQuery, values)
            .then((result) => {
                if (result.rowCount == 0) {
                    response.status(404).send({
                        message: 'User not found',
                    });
                    return;
                }

                //Retrieve the salt used to create the salted-hash provided from the DB
                let salt = result.rows[0].salt;

                //Retrieve the salted-hash password provided from the DB
                let storedSaltedHash = result.rows[0].saltedhash;

                //Generate a hash based on the stored salt and the provided password
                let providedSaltedHash = generateHash(
                    request.auth.password,
                    salt
                );

                //Did our salted hash match their salted hash?
                if (storedSaltedHash === providedSaltedHash) {
                    //credentials match. get a new JWT
                    let token = jwt.sign(
                        {
                            email: request.auth.email,
                            memberid: result.rows[0].memberid,
                        },
                        config.secret,
                        {
                            expiresIn: '14 days', // expires in 14 days
                        }
                    );
                    //package and send the results
                    response.json({
                        success: true,
                        message: 'Authentication successful!',
                        token: token,
                        username: result.rows[0].username,
                        memberid: result.rows[0].memberid
                    });
                } else {
                    //credentials did not match
                    response.status(400).send({
                        message: 'Credentials did not match',
                    });
                }
            })
            .catch((err) => {
                //log the error
                console.log('Error on SELECT************************');
                console.log(err);
                console.log('************************');
                console.log(err.stack);
                response.status(400).send({
                    message: err.detail,
                });
            });
    }
);


/**
 * @api {put} /emailtemp Request to create a temporary password for the user.
 * @apiName EmailTempPassword
 * @apiGroup PasswordReset
 *
 * @apiParam {String} email a users email *unique
 * @apiParam {String} password a users password
 * @apiParam {String} [username] a username *unique, if none provided, email will be used
 *
 * @apiParamExample {json} Request-Body-Example:
 *  {
 *      "email":"cfb3@fake.email",
 *      "password":"test12345"
 *  }
 *
 * @apiSuccess (Success 201) {String} email the email of the user inserted
 *
 * @apiError (400: Missing Parameters) {String} message "Missing required information"
 *
 * @apiError (400: Email exists) {String} message "Email exists"
 *
 * @apiError (400: Other Error) {String} message "other error, see detail"
 * @apiError (400: Other Error) {String} detail Information about th error
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
 * @api {put} /resetpass Request to create a temporary password for the user.
 * @apiName ResetPass
 * @apiGroup PasswordReset
 *
 * @apiParam {String} email a users email *unique
 * @apiParam {String} password a users password
 * @apiParam {String} [username] a username *unique, if none provided, email will be used
 *
 * @apiParamExample {json} Request-Body-Example:
 *  {
 *      "email":"cfb3@fake.email",
 *      "password":"test12345"
 *  }
 *
 * @apiSuccess (Success 201) {String} email the email of the user inserted
 *
 * @apiError (400: Missing Parameters) {String} message "Missing required information"
 *
 * @apiError (400: Email exists) {String} message "Email exists"
 *
 * @apiError (400: Other Error) {String} message "other error, see detail"
 * @apiError (400: Other Error) {String} detail Information about th error
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
     
     const new_pass=request.body.new_pass;

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

/**
 * @variable pass is a string where a randomly generated code
 * will be stored there, and then returned by the function.
 * @returns A randomly generated password in a string object.
 */
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