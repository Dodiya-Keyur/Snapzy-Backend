const mongoose = require("mongoose");

const notificationModel = require("../models/notification.model");

// Fetch all notifications for the authenticated user
async function getNotifications(req, res) {
    try {
        // Query database for notifications where recipient is the current user
        const notifications = await notificationModel
            .find({ recipient: req.user._id })
            .populate("sender", "_id username name profilePicture")
            .populate("post", "_id caption image likesCount commentCount")
            .populate("comment", "_id commentText text")
            .sort({ createdAt: -1 });

        // Return fetched notifications list
        return res.status(200).json({
            success: true,
            notifications
        });

    } catch (error) {
        console.error(error);

        return res.status(500).json({
            success: false,
            message: error.message
        });
    }
}

// Fetch total count of unread notifications
async function getUnreadCount(req, res) {
    try {
        // Count unread notification records for current user
        const count = await notificationModel.countDocuments({
            recipient: req.user._id,
            isRead: false
        });

        // Return count in response
        return res.status(200).json({
            success: true,
            count
        });

    } catch (error) {
        console.error(error);

        return res.status(500).json({
            success: false,
            message: error.message
        });
    }
}

// Mark all unread notifications as read for current user
async function markAllAsRead(req, res) {
    try {
        // Update all unread notifications belonging to the user to read status
        await notificationModel.updateMany(
            {
                recipient: req.user._id,
                isRead: false
            },
            {
                $set: {
                    isRead: true
                }
            }
        );

        // Return confirmation response
        return res.status(200).json({
            success: true,
            message: "All notifications marked as read"
        });

    } catch (error) {
        console.error(error);

        return res.status(500).json({
            success: false,
            message: error.message
        });
    }
}

// Delete a single notification by ID
async function deleteNotification(req, res) {
    try {
        // Extract notification ID from request parameters
        const { notificationId } = req.params;

        // Delete notification document matching ID and owned by current user
        const notification = await notificationModel.findOneAndDelete({
            _id: notificationId,
            recipient: req.user._id
        });

        // Return 404 if notification was not found
        if (!notification) {
            return res.status(404).json({
                success: false,
                message: "Notification not found"
            });
        }

        // Return deletion confirmation response
        return res.status(200).json({
            success: true,
            message: "Notification deleted successfully"
        });

    } catch (error) {
        console.error(error);

        return res.status(500).json({
            success: false,
            message: error.message
        });
    }
}

// Delete all notifications for current user
async function deleteAllNotifications(req, res) {
    try {
        // Get authenticated user ID from request
        const userId = req.user._id;

        // Check if user has any notifications in database
        const notification = await notificationModel.find({
            recipient: userId
        });

        if (notification.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Notification not found"
            });
        }

        // Delete all notification records for this user
        await notificationModel.deleteMany({
            recipient: userId
        });

        // Return deletion confirmation response
        return res.status(200).json({
            success: true,
            message: "Notification deleted successfully"
        });

    } catch (error) {
        console.log(error);

        return res.status(500).json({
            success: false,
            message: error.message
        });
    }
}

module.exports = {
    getNotifications,
    getUnreadCount,
    markAllAsRead,
    deleteNotification,
    deleteAllNotifications,
};