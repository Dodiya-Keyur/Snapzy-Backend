const mongoose = require("mongoose");

const commentModel = require("../models/comment.model");
const postModel = require("../models/post.model");
const notificationService = require("../services/notification.service");

// Create a reply to an existing comment
async function createReply(req, res) {
    try {
        // Get authenticated user ID from request
        const userId = req.user._id;

        // Validate user ID format
        if (!mongoose.isValidObjectId(userId)) {
            return res.status(400).json({
                message: "Invalid User ID"
            });
        }

        // Extract parent comment ID from request parameters
        const parentCommentId = req.params.commentid;

        // Validate parent comment ID format
        if (!mongoose.isValidObjectId(parentCommentId)) {
            return res.status(400).json({
                message: "Invalid Comment ID"
            });
        }

        // Check if parent comment exists in database
        const parentComment = await commentModel.findById(parentCommentId);
        if (!parentComment) {
            return res.status(404).json({
                message: "Comment not found"
            });
        }

        // Get reply text from request body
        const { replytext } = req.body;

        // Validate reply text is not empty
        if (!replytext || !replytext.trim()) {
            return res.status(400).json({
                message: "Reply text is required"
            });
        }

        // Extract associated post ID from parent comment
        const postId = parentComment.post;

        // Create reply record linked to parent comment
        const reply = await commentModel.create({
            user: userId,
            post: postId,
            commentText: replytext.trim(),
            parentComment: parentCommentId
        });

        // Populate author details for the reply
        await reply.populate("user", "_id username name profilePicture");

        // Send reply notification to parent comment author
        const commentUserId = parentComment.user;
        await notificationService.createNotification({
            recipient: commentUserId,
            sender: req.user._id,
            type: "reply",
            post: postId
        });

        // Find associated post to notify author
        const post = await postModel.findById(postId);
        if (!post) {
            return res.status(404).json({
                message: "Post not found"
            });
        }

        // Send comment notification to post author if different
        await notificationService.createNotification({
            recipient: post.user,
            sender: req.user._id,
            type: "comment",
            post: postId
        });

        // Increment comment count on the post document
        await postModel.findByIdAndUpdate(postId, {
            $inc: {
                commentCount: 1
            }
        });

        // Return created reply with 201 status
        return res.status(201).json({
            message: "Reply created successfully",
            reply
        });

    } catch (error) {
        console.error(error);

        return res.status(500).json({
            message: "Internal server error",
            error: error.message
        });
    }
}

// Fetch all replies for a specific comment
async function getReplies(req, res) {
    try {
        // Extract parent comment ID from request parameters
        const commentId = req.params.commentid;

        // Validate parent comment ID format
        if (!mongoose.isValidObjectId(commentId)) {
            return res.status(400).json({
                message: "Invalid Comment ID"
            });
        }

        // Check if parent comment exists in database
        const comment = await commentModel.findById(commentId);
        if (!comment) {
            return res.status(404).json({
                message: "Comment not found"
            });
        }

        // Query database for all replies pointing to this parent comment
        const replies = await commentModel
            .find({ parentComment: commentId })
            .populate("user", "_id username name profilePicture")
            .sort({ createdAt: 1 });

        // Return list of replies in chronological order
        return res.status(200).json({
            message: "Replies fetched successfully",
            replies
        });

    } catch (error) {
        console.error(error);

        return res.status(500).json({
            message: "Internal server error",
            error: error.message
        });
    }
}

module.exports = { createReply, getReplies };