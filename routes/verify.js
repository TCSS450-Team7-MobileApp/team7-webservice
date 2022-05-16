const express = require('express');
const jwt = require('jsonwebtoken');

const router = express.Router();

router.get('/', (req, res) => {
    const { token } = req.query.token;

    // Verify JWT token
    jwt.verify(token, 'outSecretKey', function (error, decoded) {
        if (error) {
            console.log(error);
            res.send('Email verification failed, Invalid/Expired link');
        } else {
            res.send('Email verified successfully');
            // Email verified. Update MEMBER table in database. TODO
        }
    });
});
