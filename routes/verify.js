const express = require('express');

const pool = require('../utilities').pool;

const router = express.Router();

const jwt = require('jsonwebtoken');
const config = {
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
        try {
            jwt.verify(req.params.token, config.secret, (err, decoded) => {
                if (err) {
                    return res.status(403).json({
                        success: false,
                        message: 'Token is not valid',
                        error: err.detail,
                    });
                } else req.decoded = decoded;
            });

            const query =
                'SELECT MemberID FROM Members WHERE MemberID = $1 AND Verification = 0';
            const values = [req.decoded.memberid];

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
        } catch (err) {
            res.status(400).send({ message: err.detail });
        }
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
router.get('/', (req, res) => {
    res.status(200).sendFile(path.join(__dirname + '../../pages/verify.html'));
});

module.exports = router;
