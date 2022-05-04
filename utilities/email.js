const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USERNAME,
        pass: process.env.EMAIL_PASSWORD,
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
