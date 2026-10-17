const mongoose = require("mongoose");

const likeModel = require("../models/like.model");
const postModel = require("../models/post.model");
const userModel = require("../models/user.model");
const followModel = require("../models/follow.model");

const notificationService = require("../services/notification.service");

async function follow(req, res) {
    try {
        // Get logged-in user ID
        const userId = req.user._id;

        // Get target user ID from route parameters
        const followUserId = req.params.userid;

        // Validate target user ID format
        if (!mongoose.isValidObjectId(followUserId)) {
            return res.status(400).json({
                message: "Invalid User ID"
            });
        }

        // Prevent user from following themselves
        if (userId.toString() === followUserId.toString()) {
            return res.status(400).json({
                message: "You cannot follow yourself"
            });
        }

        // Check if target user exists in database
        const user = await userModel
            .findById(followUserId)
            .select("_id");

        if (!user) {
            return res.status(404).json({
                message: "User not found"
            });
        }

        // Create follow relationship record in database
        await followModel.create({
            follower: userId,
            following: followUserId
        });

        // Send follow notification to the target user
        await notificationService.createNotification({
            recipient: user._id,
            sender: req.user._id,
            type: "follow"
        });

        // Return success response
        return res.status(201).json({
            message: "Follow successfully"
        });

    } catch (error) {
        console.error(error);

        // Handle duplicate follow error
        if (error.code === 11000) {
            return res.status(409).json({
                message: "User already followed"
            });
        }

        // Return internal server error response
        return res.status(500).json({
            message: "Internal server error",
            error: error.message
        });
    }
}

async function unFollow(req, res) {
    try {
        // Get logged-in user ID
        const userId = req.user._id;

        // Get target user ID from route parameters
        const followUserId = req.params.userid;

        // Validate target user ID format
        if (!mongoose.isValidObjectId(followUserId)) {
            return res.status(400).json({
                message: "Invalid User ID"
            });
        }

        // Delete follow relationship record from database
        const result = await followModel.findOneAndDelete({
            follower: userId,
            following: followUserId
        });

        // Check if follow relationship existed
        if (!result) {
            return res.status(404).json({
                message: "You are not following this user"
            });
        }

        // Return success response
        return res.status(200).json({
            message: "Unfollow successfully"
        });

    } catch (error) {
        console.error(error);

        // Return internal server error response
        return res.status(500).json({
            message: "Internal server error",
            error: error.message
        });
    }
}

module.exports = { follow, unFollow };