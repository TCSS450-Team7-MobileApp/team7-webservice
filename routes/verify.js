const express = require('express');

const pool = require('../utilities').pool;

const router = express.Router();

let jwt = require('jsonwebtoken');
let config = {
    secret: process.env.JSON_WEB_TOKEN,
};

const path = require('path');

/**
 * @api {get} /verify/:token Request to verify the email of a user
 * @apiName GetVerify
 * @apiGroup Verification
 *
 * @apiParam {String} token The JWT token used to verify the user
 *
 * @apiSuccess (Success 202) {boolean} success true when the verification status is updated
 *
 * @apiError (400: Email Verified) {String} message "This email has already been verified"
 *
 * @apiError (400: Other Error) {String} detail Information about the error
 *
 */
router.get(
    '/:token',
    (req, res, next) => {
        // Decode from jwt token to grab the memberid
        const decoded = jwt.verify(req.params.token, config.secret);
        req.decoded = decoded;

        const query =
            'SELECT MemberID FROM Members WHERE MemberID = $1 AND Verification = 0';
        const values = [decoded.memberid];

        pool.query(query, values)
            .then((result) => {
                if (result.rowCount != 0) next();
                else {
                    res.status(400).send({
                        message: 'This email has already been verified',
                    });
                }
            })
            .catch((err) => {
                res.status(400).send({ message: err.detail });
            });
    },
    (req, res) => {
        const updateVerify =
            'UPDATE Members SET Verification = 1 WHERE MemberID = $1';
        pool.query(updateVerify, [req.decoded.memberid])
            .then((result) => {
                res.redirect('/verify');
            })
            .catch((err) => {
                res.status(400).send({
                    message: 'Verification failed',
                    detail: err.detail,
                });
            });
    }
);

// TODO: Uncomment and replace /test.html with the path of verification success page
/**
 * @api {get} /verify Success HTML page displaying verification success message
 * @apiName GetVerifySuccess
 * @apiGroup Verify
 *
 * @apiSuccess (Success 200) {HTML} path Redirects to the Success page
 *
 * @apiError (404: Not Found) {String} message "No such file or directory"
 *
 */
// router.get('/', (req, res) => {
//     res.status(200).sendFile(path.join(__dirname + '/test.html'));
// });

module.exports = router;
