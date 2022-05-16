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

let sendEmail = (from, to, subject, html) => {
    //research nodemailer for sending email from node.
    // https://nodemailer.com/about/
    // https://www.w3schools.com/nodejs/nodejs_email.asp
    //create a burner gmail account
    //make sure you add the password to the environmental variables
    //similar to the DATABASE_URL and PHISH_DOT_NET_KEY (later section of the lab)

    transporter.sendMail({ from, to, subject, html }, function (error, info) {
        if (error) throw Error(error);
        console.log('Email sent successfully');
        console.log(info);
    });
};

const emailTemplate = (link) => `
<html>
  <div style="text-align: center;">
    <h1>Welcome to Chatterbug 🐞</h1>
    <p>Hi there!</p>
    <p>Please verify your email address before logging in to our app</p>
    <form action="${link}">
      <button class="btn" type="submit" 
              style="
                background-color: #e1ecf4;
                border-radius: 20px;
                border: 1px solid #7aa7c7;
                box-sizing: border-box;
                color: #39739d;
                cursor: pointer;
                font-size: 12px;
                font-weight: 400;
                margin: 0;
                padding: 6px .6em;
                position: relative;
                text-align: center;
                text-decoration: none;"
              >Verify Email</button>
    </form>
    </br>
    <div>
        <p>Happy chatting!</p>
        <p>Chatterbug team</p>
    </div>
  </div>
</html>
`;

module.exports = {
    sendEmail,
    emailTemplate,
};
