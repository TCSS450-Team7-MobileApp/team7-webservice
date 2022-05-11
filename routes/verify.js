const express = require('express');

const pool = require('../utilities').pool;

const router = express.Router();

let jwt = require('jsonwebtoken');
let config = {
    secret: process.env.JSON_WEB_TOKEN,
};

router.get(
    '/:token',
    (req, res, next) => {
        try {
            const decoded = jwt.verify(req.params.token, config.secret);
            req.decoded = decoded;

            const query =
                'SELECT MemberID FROM Members WHERE MemberID = $1 AND Verification = 0';
            const values = [decoded.memberid];

            pool.query(query, values)
                .then((result) => {
                    if (result.rowCount != 0) {
                        next();
                    } else {
                        res.status(400).send({
                            message:
                                'This email address has already been verified',
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
            .then((result) =>
                res.send({
                    message: 'Verification successful',
                })
            )
            .catch((err) => {
                res.status(400).send({
                    message: err.detail,
                });
            });
    }
);

module.exports = router;
