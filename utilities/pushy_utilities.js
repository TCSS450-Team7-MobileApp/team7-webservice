const Pushy = require('pushy');

// Plug in your Secret API Key 
const pushyAPI = new Pushy(process.env.PUSHY_API_KEY);

//use to send message to a specific client by the token
function sendMessageToIndividual(token, message) {

    //build the message for Pushy to send
    var data = {
        "type": "msg",
        "message": message,
        "chatid": message.chatid
    }


    // Send push notification via the Send Notifications API 
    // https://pushy.me/docs/api/send-notifications 
    pushyAPI.sendPushNotification(data, token, {}, function (err, id) {
        // Log errors to console 
        if (err) {
            return console.log('Fatal Error', err);
        }

        // Log success 
        console.log('Message Push sent successfully! (ID: ' + id + ')')
    })
}

//use to send message to a specific client by the token
function updateChatRoom(token, usernames, chat, name, message, timestamp) {

    var names = [usernames];

    for (var i =0; i< names.length ;i++) {
        names[i] = usernames[i].username;
    }

    //build the message for Pushy to send
    var data = {
        "type": "chat",
        "usernames": names,
        "chatid": chat,
        "name": name,
        "recent_message":message,
        "timestamp":timestamp
    }

    // Send push notification via the Send Notifications API 
    // https://pushy.me/docs/api/send-notifications 
    pushyAPI.sendPushNotification(data, token, {}, function (err, id) {
        // Log errors to console 
        if (err) {
            return console.log('Fatal Error', err);
        }

        // Log success 
        console.log('Chat Push sent successfully! (ID: ' + id + ')')
    })
}

//use to display friend requests in real time
function friendRequest(token, id, username, firstname, lastname, email, verify) {

    //build the message for Pushy to send
    var data = {
        "type": "friend_request",
        "id":id,
        "username":username,
        "firstname":firstname,
        "lastname":lastname,
        "email": email,
        "verify":verify
    }


    // Send push notification via the Send Notifications API 
    // https://pushy.me/docs/api/send-notifications 
    pushyAPI.sendPushNotification(data, token, {}, function (err, id) {
        // Log errors to console 
        if (err) {
            return console.log('Fatal Error', err);
        }

        // Log success 
        console.log('Friend request sent successfully! (ID: ' + id + ')')
    })
}

//add other "sendTypeToIndividual" functions here. Don't forget to export them

module.exports = {
    sendMessageToIndividual,
    updateChatRoom,
    friendRequest
}