const mongoose = require("mongoose");

const commentModel = require("../models/comment.model");
const postModel = require("../models/post.model");
const userModel = require("../models/user.model");

const notificationService = require("../services/notification.service");

// Create a new comment on a post
async function createComment(req, res) {
    try {
        // Get authenticated user ID from request
        const userId = req.user._id;

        // Validate user ID format
        if (!mongoose.isValidObjectId(userId)) {
            return res.status(400).json({
                message: "Invalid User ID"
            });
        }

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

        // Get comment text from request body
        const { commentText } = req.body;

        // Validate comment text is provided
        if (!commentText || !commentText.trim()) {
            return res.status(400).json({
                message: "Comment text is required"
            });
        }

        // Create comment record in database
        const comment = await commentModel.create({
            user: userId,
            post: postId,
            commentText: commentText.trim()
        });

        // Populate author details for the created comment
        await comment.populate("user", "_id username name profilePicture");

        // Send comment notification to post author
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

        // Return created comment with 201 status
        return res.status(201).json({
            message: "Comment created successfully",
            comment
        });

    } catch (error) {
        console.error(error);

        return res.status(500).json({
            message: "Internal server error",
            error: error.message
        });
    }
}

// Fetch all top-level comments for a post
async function getComments(req, res) {
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

        // Fetch top-level comments and populate author details
        const comments = await commentModel
            .find({ post: postId, parentComment: null })
            .populate("user", "_id username name profilePicture");

        // Return fetched comments list
        return res.status(200).json({
            message: "Post comments fetched successfully",
            comments
        });

    } catch (error) {
        console.error(error);

        return res.status(500).json({
            message: "Internal server error",
            error: error.message
        });
    }
}

// Update existing comment text
async function updateComment(req, res) {
    try {
        // Get authenticated user ID from request
        const userId = req.user._id;

        // Validate user ID format
        if (!mongoose.isValidObjectId(userId)) {
            return res.status(400).json({
                message: "Invalid User ID"
            });
        }

        // Extract comment ID from request parameters
        const commentid = req.params.commentid;

        // Validate comment ID format
        if (!mongoose.isValidObjectId(commentid)) {
            return res.status(400).json({
                message: "Invalid Comment ID"
            });
        }

        // Check if target comment exists in database
        const comment = await commentModel
            .findById(commentid)
            .populate("post", "_id user");

        if (!comment) {
            return res.status(404).json({
                message: "Comment not found"
            });
        }

        // Verify that authenticated user owns this comment
        if (comment.user.toString() !== userId.toString()) {
            return res.status(403).json({
                success: false,
                message: "You can only update your own comment",
            });
        }

        // Get updated comment text from request body
        const { commentText } = req.body;

        // Validate updated comment text
        if (!commentText || !commentText.trim()) {
            return res.status(400).json({
                message: "Comment text is required"
            });
        }

        // Update comment record in database and populate user info
        const updatedComment = await commentModel.findByIdAndUpdate(
            commentid,
            { commentText: commentText.trim() },
            { new: true }
        ).populate("user", "_id username name profilePicture");

        // Return updated comment in response
        return res.status(200).json({
            message: "Comment updated successfully",
            comment: updatedComment
        });

    } catch (error) {
        console.error(error);

        return res.status(500).json({
            message: "Internal server error",
            error: error.message
        });
    }
}

// Delete comment and its replies
async function deleteComment(req, res) {
    try {
        // Get authenticated user ID from request
        const userId = req.user._id;

        // Validate user ID format
        if (!mongoose.isValidObjectId(userId)) {
            return res.status(400).json({
                message: "Invalid User ID"
            });
        }

        // Extract comment ID from request parameters
        const commentid = req.params.commentid;

        // Validate comment ID format
        if (!mongoose.isValidObjectId(commentid)) {
            return res.status(400).json({
                message: "Invalid Comment ID"
            });
        }

        // Check if comment exists in database
        const comment = await commentModel
            .findById(commentid)
            .populate("post", "_id user");

        if (!comment) {
            return res.status(404).json({
                message: "Comment not found"
            });
        }

        // Verify permission: comment owner or post owner can delete
        const isCommentOwner = comment.user.toString() === userId.toString();
        const isPostOwner = comment.post.user.toString() === userId.toString();

        if (!isCommentOwner && !isPostOwner) {
            return res.status(403).json({
                success: false,
                message: "You can only delete your own comment or comments on your post"
            });
        }

        // Delete comment and any nested replies from database
        await commentModel.deleteMany({
            $or: [
                { _id: commentid },
                { parentComment: commentid }
            ]
        });

        // Decrement comment count on associated post
        const postId = comment.post._id;
        await postModel.findByIdAndUpdate(postId, {
            $inc: {
                commentCount: -1
            }
        });

        // Return deletion confirmation response
        return res.status(200).json({
            message: "Comment Delete successfully",
        });

    } catch (error) {
        console.error(error);

        return res.status(500).json({
            message: "Internal server error",
            error: error.message
        });
    }
}

// Fetch all comments authored by current logged-in user
async function getUserComments(req, res) {
    try {
        // Get authenticated user ID from request
        const userId = req.user._id;

        // Fetch user comments and populate post and author information
        const comments = await commentModel
            .find({ user: userId })
            .populate({
                path: "post",
                populate: {
                    path: "user",
                    select: "_id username name profilePicture"
                }
            })
            .populate("user", "_id username name profilePicture")
            .sort({ createdAt: -1 });

        // Return user comments list
        return res.status(200).json({
            message: "User comments fetched successfully",
            comments
        });

    } catch (error) {
        console.error("getUserComments error:", error);

        return res.status(500).json({
            message: "Internal server error",
            error: error.message
        });
    }
}

module.exports = { createComment, getComments, updateComment, deleteComment, getUserComments };