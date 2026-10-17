const mongoose = require("mongoose");

const postModel = require("../models/post.model");
const userModel = require("../models/user.model");

async function search(req, res) {
    try {
        // Get search query from URL parameters
        const { q } = req.query;

        // Validate search query is provided
        if (!q || q.trim() === "") {
            return res.status(400).json({
                success: false,
                message: "Search query is required"
            });
        }

        // Clean and normalize search query string
        const searchQuery = q.trim();

        // Search users matching username case-insensitively
        const users = await userModel
            .find({
                username: {
                    $regex: searchQuery,
                    $options: "i"
                }
            })
            .select("_id username name profilePicture bio")
            .limit(20);

        // Search posts matching caption or hashtags case-insensitively
        const posts = await postModel
            .find({
                $or: [
                    {
                        caption: {
                            $regex: searchQuery,
                            $options: "i"
                        }
                    },
                    {
                        hashtags: {
                            $regex: searchQuery,
                            $options: "i"
                        }
                    }
                ]
            })
            .populate("user", "_id username name profilePicture")
            .limit(20);

        // Return found users and posts
        return res.status(200).json({
            success: true,
            data: {
                users,
                posts
            }
        });

    } catch (error) {
        console.error(error);

        // Return internal server error response
        return res.status(500).json({
            success: false,
            message: "Internal server error"
        });
    }
}

module.exports = { search };