//express is the framework we're going to use to handle requests
const express = require('express')

//Access the connection to Heroku Database
const pool = require('../utilities/exports').pool

const router = express.Router()

const msg_functions = require('../utilities/exports').messaging

const validation = require('../utilities').validation
let isStringProvided = validation.isStringProvided

/**
 * @apiDefine JSONError
 * @apiError (400: JSON Error) {String} message "malformed JSON in parameters"
 */ 

/**
 * @api {post} /messages Request to add a message to a specific chat
 * @apiName PostMessages
 * @apiGroup Messages
 * 
 * @apiDescription Adds the message from the user associated with the required JWT. 
 * 
 * @apiHeader {String} authorization Valid JSON Web Token JWT
 * 
 * @apiParam {Number} chatId the id of th chat to insert this message into
 * @apiParam {String} message a message to store 
 * 
 * @apiSuccess (Success 201) {boolean} success true when the name is inserted
 * 
 * @apiError (400: Unknown user) {String} message "unknown email address"
 * 
 * @apiError (400: Missing Parameters) {String} message "Missing required information"
 * 
 * @apiError (400: SQL Error) {String} message the reported SQL error details
 * 
 * @apiError (400: Unknown Chat ID) {String} message "invalid chat id"
 * 
 * @apiUse JSONError
 */ 
router.post("/", (request, response, next) => {
    //validate on empty parameters
    if (request.body.chatId === undefined || !isStringProvided(request.body.message)) {
        response.status(400).send({
            message: "Missing required information"
        })
    } else if (isNaN(request.body.chatId)) {
        response.status(400).send({
            message: "Malformed parameter. chatId must be a number"
        })
    } else {
        next()
    }
}, (request, response, next) => {
    //validate chat id exists
    let query = 'SELECT * FROM CHATS WHERE ChatId=$1'
    let values = [request.body.chatId]

    pool.query(query, values)
        .then(result => {
            if (result.rowCount == 0) {
                response.status(404).send({
                    message: "Chat ID not found"
                })
            } else {
                next()
            }
        }).catch(error => {
            response.status(400).send({
                message: "SQL Error on chatid check",
                error: error
            })
        })
}, (request, response, next) => {
            //validate memberid exists in the chat
            let query = 'SELECT * FROM ChatMembers WHERE ChatId=$1 AND MemberId=$2'
            let values = [request.body.chatId, request.decoded.memberid]
        
            pool.query(query, values)
                .then(result => {
                    if (result.rowCount > 0) {
                        next()
                    } else {
                        response.status(400).send({
                            message: "user not in chat"
                        })
                    }
                }).catch(error => {
                    response.status(400).send({
                        message: "SQL Error on member in chat check",
                        error: error
                    })
                })
    
}, (request, response, next) => {
    //add the message to the database
    let insert = `INSERT INTO Messages(ChatId, Message, MemberId)
                  VALUES($1, $2, $3) 
                  RETURNING PrimaryKey AS MessageId, ChatId, Message, MemberId AS email, TimeStamp`
    let values = [request.body.chatId, request.body.message, request.decoded.memberid]
    pool.query(insert, values)
        .then(result => {
            if (result.rowCount == 1) {
                //insertion success. Attach the message to the Response obj
                response.message = result.rows[0]
                response.message.email = request.decoded.email
                //Pass on to next to push
                next()
            } else {
                response.status(400).send({
                    "message": "unknown error"
                })
            }

        }).catch(err => {
            response.status(400).send({
                message: "SQL Error on insert",
                error: err
            })
        })
}, (request, response) => {
        // send a notification of this message to ALL members with registered tokens
        let query = `SELECT token FROM Push_Token
                        INNER JOIN ChatMembers ON
                        Push_Token.memberid=ChatMembers.memberid
                        WHERE ChatMembers.chatId=$1`
        let values = [request.body.chatId]
        pool.query(query, values)
            .then(result => {
                console.log(request.decoded.email)
                console.log(request.body.message)
                result.rows.forEach(entry => 
                    msg_functions.sendMessageToIndividual(
                        entry.token, 
                        response.message))
                response.send({
                    success:true
                })
            }).catch(err => {

                response.status(400).send({
                    message: "SQL Error on select from push token",
                    error: err
                })
            })
})

/**
 * @api {get} /messages/:chatId?/:messageId? Request to get chat messages 
 * @apiName GetMessages
 * @apiGroup Messages
 * 
 * @apiDescription Request to get the 10 most recent chat messages
 * from the server in a given chat - chatId. If an optional messageId is provided,
 * return the 10 messages in the chat prior to (and not including) the message containing
 * MessageID.
 * 
 * @apiParam {Number} chatId the chat to look up. 
 * @apiParam {Number} messageId (Optional) return the 15 messages prior to this message
 * 
 * @apiSuccess {Number} rowCount the number of messages returned
 * @apiSuccess {Object[]} messages List of massages in the message table
 * @apiSuccess {String} messages.messageId The id for this message
 * @apiSuccess {String} messages.email The email of the user who posted this message
 * @apiSuccess {String} messages.message The message text
 * @apiSuccess {String} messages.timestamp The timestamp of when this message was posted
 * 
 * @apiError (404: ChatId Not Found) {String} message "Chat ID Not Found"
 * @apiError (400: Invalid Parameter) {String} message "Malformed parameter. chatId must be a number" 
 * @apiError (400: Missing Parameters) {String} message "Missing required information"
 * 
 * @apiError (400: SQL Error) {String} message the reported SQL error details
 * 
 * @apiUse JSONError
 */ 
router.get("/:chatId?/:messageId?", (request, response, next) => {
        //validate chatId is not empty or non-number
        if (request.params.chatId === undefined) {
            response.status(400).send({
                message: "Missing required information"
            })
        }  else if (isNaN(request.params.chatId)) {
            response.status(400).send({
                message: "Malformed parameter. chatId must be a number"
            })
        } else {
            next()
        }
    }, (request, response, next) => {
        //validate that the ChatId exists
        let query = 'SELECT * FROM CHATS WHERE ChatId=$1'
        let values = [request.params.chatId]

        pool.query(query, values)
            .then(result => {
                if (result.rowCount == 0) {
                    response.status(404).send({
                        message: "Chat ID not found"
                    })
                } else {
                    next()
                }
            }).catch(error => {
                response.status(400).send({
                    message: "SQL Error",
                    error: error
                })
            })
    }, (request, response) => {
        //perform the Select

        if (!request.params.messageId) {
            //no messageId provided. Use the largest possible integer value
            //allowed for the messageId in the db table. 
            request.params.messageId = 2**31 - 1
        }

        let query = `SELECT Messages.PrimaryKey AS messageId, Members.Email, Messages.Message, 
                    to_char(Messages.Timestamp AT TIME ZONE 'PDT', 'YYYY-MM-DD HH24:MI:SS.US' ) AS Timestamp
                    FROM Messages
                    INNER JOIN Members ON Messages.MemberId=Members.MemberId
                    WHERE ChatId=$1 AND Messages.PrimaryKey < $2
                    ORDER BY Timestamp DESC
                    LIMIT 15`
        let values = [request.params.chatId, request.params.messageId]
        pool.query(query, values)
            .then(result => {
                response.send({
                    chatId: request.params.chatId,
                    rowCount : result.rowCount,
                    rows: result.rows
                })
            }).catch(err => {
                response.status(400).send({
                    message: "SQL Error",
                    error: err
                })
            })
});

module.exports = router