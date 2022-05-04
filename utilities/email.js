const nodemailder = require('nodemailder');
const jwt = require('jsonwebtoken');

const transporter = nodemailder.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USERNAME,
        pass: process.env.EMAIL_PASSWORD,
    },
});

const token = jwt.sign(
    {
        data: 'Token Data',
    },
    // generate token here
    'ourSecretKey',
    { expiresIn: '10m' }
);

let sendEmail = (from, to, subject, text) => {
    //research nodemailer for sending email from node.
    // https://nodemailer.com/about/
    // https://www.w3schools.com/nodejs/nodejs_email.asp
    //create a burner gmail account
    //make sure you add the password to the environmental variables
    //similar to the DATABASE_URL and PHISH_DOT_NET_KEY (later section of the lab)

    transporter.sendMail({ from, to, subject, text }, function (error, info) {
        if (error) throw Error(error);
        console.log('Email sent successfully');
        console.log(info);
    });
};

module.exports = {
    sendEmail,
};
