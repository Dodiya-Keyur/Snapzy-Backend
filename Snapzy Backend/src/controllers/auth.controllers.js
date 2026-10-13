const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const mongoose = require("mongoose");

const userModel = require("../models/user.model");

async function registerUser(req, res) {

    try {

        // Get user registration data from request body
        const { username, email, password } = req.body;

        // Check if username or email already exists
        const existingUser = await userModel.findOne({ $or: [{ username }, { email }] });

        // Return error if username or email is already registered
        if (existingUser) {
            return res.status(400).json({ message: "Username or email already exists" });
        }

        // Hash the user's password before storing it in the database
        const hashedPassword = await bcrypt.hash(password, 12);

        // Create a new user
        const user = await userModel.create({
            username,
            email,
            password: hashedPassword,
            role: "user",
        });

        // Generate JWT token using the user's ID
        const token = jwt.sign(
            {
                id: user._id,
            },
            process.env.JWT_SECRET,
            {
                expiresIn: "7d"
            }
        );

        // Store the JWT token in a cookie
        res.cookie("token", token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
        });

        res.status(201).json({
            message: "User register successfully",
            user: {
                id: user._id,
                username: user.username,
                email: user.email,
                role: user.role,
            },
        })


    } catch (error) {
        if (error.code === 11000) {
            return res.status(409).json({
                message: "Username or email already exists"
            });
        } else {
            console.error(error);
            res.status(500).json({ message: "Internal server error" });
        }
    }
}

async function loginUser(req, res) {

    try {

        // Get userName/email and password from request body
        const { identifier, password } = req.body;

        if (!identifier || !password) {
            return res.status(400).json({
                message: "UserName/email and password are required"
            });
        }

        const normalizedIdentifier = identifier.trim().toLowerCase();

        // Find user using either username or email
        const user = await userModel
            .findOne({
                $or: [
                    { username: normalizedIdentifier },
                    { email: normalizedIdentifier }
                ]
            })
            .select("+password");

        // Check if user exists
        if (!user) {
            return res.status(401).json({
                message: "Invalid credentials"
            });
        }

        // Compare the entered password with the stored hashed password
        const isPasswordValid = await bcrypt.compare(password, user.password);

        // Check if the password is correct
        if (!isPasswordValid) {
            return res.status(401).json({ message: "Invalid credentials" });
        }

        // Generate JWT token using the user's ID
        const token = jwt.sign(
            {
                id: user._id,
            },
            process.env.JWT_SECRET,
            {
                expiresIn: "7d"
            }
        );

        // Store the JWT token in a secure HTTP-only cookie
        res.cookie("token", token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
        });

        return res.status(200).json({
            message: "User Login successfully",
            user: {
                id: user._id,
                username: user.username,
                email: user.email,
                role: user.role,
            },
        })

    } catch (error) {

        console.error(error);

        return res.status(500).json({
            message: "Internal server error"
        });
    }


}

async function logout(req, res) {

    try {

        // Clear the authentication token cookie
        res.clearCookie("token", {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
        });

        // Send successful logout response
        return res.status(200).json({
            message: "Logout successful",
        });

    } catch (error) {

        console.error(error);

        return res.status(500).json({
            message: "Internal server error"
        });
    }

}

async function changePassword(req, res) {

    try {

        // Get logged-in user's ID
        const userId = req.user._id;

        if (!mongoose.isValidObjectId(userId)) {
            return res.status(400).json({
                message: "Invalid User ID"
            });
        }

        // Get passwords from request body
        const { oldpassword, newpassword } = req.body;

        // Find user
        const user = await userModel
            .findById({ _id: userId })
            .select("+password");

        if (!user) {
            return res.status(401).json({
                message: "Invalid credentials"
            });
        }

        // Check old password
        const isPasswordValid = await bcrypt.compare(oldpassword, user.password);

        if (!isPasswordValid) {
            return res.status(401).json({ message: "Invalid credentials" });
        }


        // Prevent using the same password
        const isSamePassword = await bcrypt.compare(
            newpassword,
            user.password
        );

        if (isSamePassword) {
            return res.status(400).json({
                message: "New password must be different from old password"
            });
        }

        // Hash new password
        const hashedPassword = await bcrypt.hash(newpassword, 12);

        // Update password
        const afterUser = await userModel
            .findOneAndUpdate(
                { _id: userId },
                { password: hashedPassword },
                {
                    returnDocument: "after",
                    runValidators: true
                }
            )

        res.status(200).json({
            message: "User Password Was Change successfully",
            id: afterUser._id,
            username: afterUser.username
        })

    } catch (error) {

        console.error(error);

        res.status(500).json({
            message: "Internal server error",
            error: error.message
        });
    }

}

module.exports = { registerUser, loginUser, logout, changePassword };