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

    //build the message for Pushy to send
    var data = {
        "type": "chat",
        "usernames": usernames,
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
function friendRequest(token, email) {

    //build the message for Pushy to send
    var data = {
        "type": "friend_request",
        "email": email,
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