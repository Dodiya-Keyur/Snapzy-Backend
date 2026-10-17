const express = require("express");

// Middleware
const userAuth = require("../middleware/auth.middleware");

// Controllers
const notificationControllers = require("../controllers/notification.controllers");

const notificationrouter = express.Router();

// Fetch all notifications for authenticated user
notificationrouter.get("/notifications", userAuth, notificationControllers.getNotifications);

// Fetch unread notifications count
notificationrouter.get("/notifications/unread-count", userAuth, notificationControllers.getUnreadCount);

// Mark all unread notifications as read
notificationrouter.patch("/notifications/read-all", userAuth, notificationControllers.markAllAsRead);

// Delete single notification by ID
notificationrouter.delete("/delete-notifications/:notificationId", userAuth, notificationControllers.deleteNotification);

// Delete all notifications for authenticated user
notificationrouter.delete("/notifications/delete-notifications", userAuth, notificationControllers.deleteAllNotifications);

module.exports = notificationrouter;