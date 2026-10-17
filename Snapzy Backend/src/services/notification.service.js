const notificationModel = require("../models/notification.model");

// Create and persist a new notification if recipient differs from sender
async function createNotification({
    recipient,
    sender,
    type,
    post = null,
    comment = null
}) {
    // Avoid sending notification if user triggers action on their own content
    if (recipient.toString() === sender.toString()) {
        return;
    }

    // Create notification document in database
    return await notificationModel.create({
        recipient,
        sender,
        type,
        post,
        comment
    });
}

module.exports = {
    createNotification
};