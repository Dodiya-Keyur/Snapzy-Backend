const mongoose = require("mongoose");

const likeModel = require("../models/like.model");
const postModel = require("../models/post.model");
const userModel = require("../models/user.model");

const notificationService = require("../services/notification.service");

// Add a like to a post
async function likePost(req, res) {
    try {
        // Extract post ID from request parameters
        const postId = req.params.postid;

        // Validate post ID format
        if (!mongoose.isValidObjectId(postId)) {
            return res.status(400).json({
                message: "Invalid post ID"
            });
        }

        // Get authenticated user ID from request
        const userId = req.user._id;

        // Validate user ID format
        if (!mongoose.isValidObjectId(userId)) {
            return res.status(400).json({
                message: "Invalid User ID"
            });
        }

        // Check if target post exists in database
        const post = await postModel.findById(postId);
        if (!post) {
            return res.status(404).json({
                message: "Post not found"
            });
        }

        // Check if user has already liked this post
        const existingLike = await likeModel.findOne({
            user: userId,
            post: postId
        });

        if (existingLike) {
            return res.status(409).json({
                message: "Post already liked"
            });
        }

        // Create new like record in database
        const like = await likeModel.create({
            user: userId,
            post: postId
        });

        // Populate user details for the created like
        await like.populate("user", "_id username name profilePicture");

        // Send like notification to post author
        try {
            await notificationService.createNotification({
                recipient: post.user,
                sender: req.user._id,
                type: "like",
                post: post._id
            });
        } catch (notifErr) {
            console.warn("Notification error on like:", notifErr.message);
        }

        // Calculate updated like count and synchronize post document
        const totalLikes = await likeModel.countDocuments({ post: postId });
        await postModel.findByIdAndUpdate(postId, {
            likesCount: totalLikes
        });

        // Return success response with like details and updated count
        return res.status(200).json({
            message: "Like created successfully",
            like,
            likesCount: totalLikes,
            totalLikes,
            isLiked: true
        });

    } catch (error) {
        console.error(error);

        // Handle duplicate key error if concurrent requests occur
        if (error.code === 11000) {
            return res.status(400).json({
                message: "Post already liked"
            });
        }

        return res.status(500).json({
            message: "Internal server error",
            error: error.message
        });
    }
}

// Remove a like from a post
async function unlikePost(req, res) {
    try {
        // Extract post ID from request parameters
        const postId = req.params.postid;

        // Validate post ID format
        if (!mongoose.isValidObjectId(postId)) {
            return res.status(400).json({
                message: "Invalid post ID"
            });
        }

        // Get authenticated user ID from request
        const userId = req.user._id;

        // Validate user ID format
        if (!mongoose.isValidObjectId(userId)) {
            return res.status(400).json({
                message: "Invalid User ID"
            });
        }

        // Check if target post exists in database
        const post = await postModel.findById(postId);
        if (!post) {
            return res.status(404).json({
                message: "Post not found"
            });
        }

        // Check if user currently likes the post
        const existingLike = await likeModel.findOne({
            user: userId,
            post: postId
        });

        if (!existingLike) {
            return res.status(409).json({
                message: "Post not liked"
            });
        }

        // Delete like record from database
        const like = await likeModel.findOneAndDelete({
            user: userId,
            post: postId
        });

        // Calculate updated like count and synchronize post document
        const totalLikes = await likeModel.countDocuments({ post: postId });
        await postModel.findByIdAndUpdate(postId, {
            likesCount: totalLikes
        });

        // Return response confirming post was unliked
        return res.status(200).json({
            message: "Dis Like successfully",
            like,
            likesCount: totalLikes,
            totalLikes,
            isLiked: false
        });

    } catch (error) {
        console.error(error);

        return res.status(500).json({
            message: "Internal server error",
            error: error.message
        });
    }
}

// Fetch all users who liked a post
async function getPostLikes(req, res) {
    try {
        // Extract post ID from request parameters
        const postId = req.params.postid;

        // Validate post ID format
        if (!mongoose.isValidObjectId(postId)) {
            return res.status(400).json({
                message: "Invalid post ID"
            });
        }

        // Check if target post exists in database
        const post = await postModel.findById(postId);
        if (!post) {
            return res.status(404).json({
                message: "Post not found"
            });
        }

        // Fetch like records and populate user information
        const likes = await likeModel
            .find({ post: postId })
            .populate("user", "_id username name profilePicture");

        // Count total likes for the post
        const totalLikes = await likeModel.countDocuments({ post: postId });

        // Return list of likes and total count
        return res.status(200).json({
            message: "Post Like fetched successfully",
            totalLikes,
            likes
        });

    } catch (error) {
        console.error(error);

        return res.status(500).json({
            message: "Internal server error",
            error: error.message
        });
    }
}

// Check if authenticated user liked a specific post
async function userIsLiked(req, res) {
    try {
        // Extract post ID from request parameters
        const postId = req.params.postid;

        // Validate post ID format
        if (!mongoose.isValidObjectId(postId)) {
            return res.status(400).json({
                message: "Invalid post ID"
            });
        }

        // Get authenticated user ID from request
        const userId = req.user._id;

        // Validate user ID format
        if (!mongoose.isValidObjectId(userId)) {
            return res.status(400).json({
                message: "Invalid User ID"
            });
        }

        // Check if target post exists in database
        const post = await postModel.findById(postId);
        if (!post) {
            return res.status(404).json({
                message: "Post not found"
            });
        }

        // Query database to check if user has liked this post
        const isLiked = await likeModel.findOne({
            user: userId,
            post: postId
        });

        // Calculate accurate like count and self-heal post document if mismatched
        const totalLikes = await likeModel.countDocuments({ post: postId });
        if (post.likesCount !== totalLikes) {
            await postModel.findByIdAndUpdate(postId, { likesCount: totalLikes });
        }

        // Return user like status along with total count
        return res.status(200).json({
            message: "Like status fetched successfully",
            isLiked: !!isLiked,
            totalLikes,
            likesCount: totalLikes
        });

    } catch (error) {
        console.error(error);

        return res.status(500).json({
            message: "Internal server error",
            error: error.message
        });
    }
}

module.exports = { likePost, unlikePost, getPostLikes, userIsLiked };
