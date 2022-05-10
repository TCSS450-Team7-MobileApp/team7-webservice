const nodemailer = require('nodemailer');
const { google } = require('googleapis');

const OAuth2 = google.auth.OAuth2;

const OAuth2_client = new OAuth2(
    process.env.OAUTH_CLIENT_ID,
    process.env.OAUTH_CLIENT_SECRET
);

OAuth2_client.setCredentials({
    refresh_token: process.env.OAUTH_REFRESH_TOKEN,
});

const accessToken = OAuth2_client.getAccessToken();

const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        type: 'OAuth2',
        user: process.env.EMAIL_USERNAME,
        clientId: process.env.OAUTH_CLIENT_ID,
        clientSecret: process.env.OAUTH_CLIENT_SECRET,
        refreshToken: process.env.OAUTH_REFRESH_TOKEN,
        accessToken: accessToken,
    },
    tls: {
        rejectUnauthorized: false,
    },
});

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
