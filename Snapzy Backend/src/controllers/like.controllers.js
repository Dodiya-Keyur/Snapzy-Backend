const mongoose = require("mongoose");

const likeModel = require("../models/like.model");
const postModel = require("../models/post.model");
const userModel = require("../models/user.model");

const notificationService = require("../services/notification.service")

async function likePost(req, res) {

    try {

        const postId = req.params.postid;

        if (!mongoose.isValidObjectId(postId)) {
            return res.status(400).json({
                message: "Invalid post ID"
            });
        }

        const userId = req.user._id;

        if (!mongoose.isValidObjectId(userId)) {
            return res.status(400).json({
                message: "Invalid User ID"
            });
        }

        // Check if post exists
        const post = await postModel.findById(postId);

        if (!post) {
            return res.status(404).json({
                message: "Post not found"
            });
        }

        // Check if user already liked the post
        const existingLike = await likeModel.findOne({
            user: userId,
            post: postId
        });

        if (existingLike) {
            return res.status(409).json({
                message: "Post already liked"
            });
        }

        // Create a Like 
        const like = await likeModel.create({
            user: userId,
            post: postId
        })

        // Create notification
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

        // Update a Like Count in PostModel based on actual count
        const totalLikes = await likeModel.countDocuments({ post: postId });
        await postModel.findByIdAndUpdate(
            postId,
            {
                likesCount: totalLikes
            }
        );

        res.status(200).json({
            message: "Like created successfully",
            like,
            likesCount: totalLikes,
            totalLikes,
            isLiked: true
        });


    } catch (error) {

        console.error(error);

        // Duplicate key error
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

async function unlikePost(req, res) {

    try {

        // Get Post ID
        const postId = req.params.postid;

        // Validate Post ID
        if (!mongoose.isValidObjectId(postId)) {
            return res.status(400).json({
                message: "Invalid post ID"
            });
        }

        // Get User ID
        const userId = req.user._id;

        // Validate User ID
        if (!mongoose.isValidObjectId(userId)) {
            return res.status(400).json({
                message: "Invalid User ID"
            });
        }

        // Check if post exists
        const post = await postModel.findById(postId);

        if (!post) {
            return res.status(404).json({
                message: "Post not found"
            });
        }

        // Check if user liked the post
        const existingLike = await likeModel.findOne({
            user: userId,
            post: postId
        });

        if (!existingLike) {
            return res.status(409).json({
                message: "Post not liked"
            });
        }

        // Delete Like
        const like = await likeModel.findOneAndDelete({
            user: userId,
            post: postId
        });

        // Update a Like Count in PostModel based on actual count
        const totalLikes = await likeModel.countDocuments({ post: postId });
        await postModel.findByIdAndUpdate(
            postId,
            {
                likesCount: totalLikes
            }
        );

        res.status(200).json({
            message: "Dis Like successfully",
            like,
            likesCount: totalLikes,
            totalLikes,
            isLiked: false
        });


    } catch (error) {

        console.error(error);

        res.status(500).json({
            message: "Internal server error",
            error: error.message
        });
    }

}

async function getPostLikes(req, res) {

    try {

        // Get Post ID
        const postId = req.params.postid;

        // Validate Post ID
        if (!mongoose.isValidObjectId(postId)) {
            return res.status(400).json({
                message: "Invalid post ID"
            });
        }

        // Check if post exists
        const post = await postModel.findById(postId);

        if (!post) {
            return res.status(404).json({
                message: "Post not found"
            });
        }

        // Get likes
        const likes = await likeModel
            .find({
                post: postId
            })
            .populate("user", "username profilePicture");

        // Get Total LIkes
        const totalLikes = await likeModel.countDocuments({
            post: postId
        });

        res.status(200).json({
            message: "Post Like fetched successfully",
            totalLikes,
            likes
        });


    } catch (error) {

        console.error(error);

        res.status(500).json({
            message: "Internal server error",
            error: error.message
        });
    }
}

async function userIsLiked(req, res) {

    try {

        const postId = req.params.postid;

        if (!mongoose.isValidObjectId(postId)) {
            return res.status(400).json({
                message: "Invalid post ID"
            });
        }

        const userId = req.user._id;

        if (!mongoose.isValidObjectId(userId)) {
            return res.status(400).json({
                message: "Invalid User ID"
            });
        }

        // Check if post exists
        const post = await postModel.findById(postId);

        if (!post) {
            return res.status(404).json({
                message: "Post not found"
            });
        }

        // Check if user already liked the post
        const isLiked = await likeModel.findOne({
            user: userId,
            post: postId
        });

        // Always calculate actual like count to keep it accurate and self-healing
        const totalLikes = await likeModel.countDocuments({ post: postId });
        if (post.likesCount !== totalLikes) {
            await postModel.findByIdAndUpdate(postId, { likesCount: totalLikes });
        }

        res.status(200).json({
            message: "Like status fetched successfully",
            isLiked: !!isLiked,
            totalLikes,
            likesCount: totalLikes
        });


    } catch (error) {

        console.error(error);

        res.status(500).json({
            message: "Internal server error",
            error: error.message
        });
    }

}

module.exports = { likePost, unlikePost, getPostLikes, userIsLiked }

