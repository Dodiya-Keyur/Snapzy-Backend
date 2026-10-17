const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const mongoose = require("mongoose");

const userModel = require("../models/user.model");

// Register a new user account
async function registerUser(req, res) {
    try {
        // Get user registration data from request body
        const { username, email, password } = req.body;

        // Check if username or email already exists in database
        const existingUser = await userModel.findOne({ $or: [{ username }, { email }] });

        // Return error if username or email is already registered
        if (existingUser) {
            return res.status(400).json({ message: "Username or email already exists" });
        }

        // Hash user password using bcrypt before storing in database
        const hashedPassword = await bcrypt.hash(password, 12);

        // Create new user record in database
        const user = await userModel.create({
            username,
            email,
            password: hashedPassword,
            role: "user",
        });

        // Generate signed JWT authentication token with user ID
        const token = jwt.sign(
            {
                id: user._id,
            },
            process.env.JWT_SECRET,
            {
                expiresIn: "7d"
            }
        );

        // Store JWT authentication token in secure HTTP-only cookie
        res.cookie("token", token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
            path: "/",
        });

        // Return created user profile details in response
        return res.status(201).json({
            message: "User register successfully",
            user: {
                id: user._id,
                _id: user._id,
                username: user.username,
                name: user.name || "",
                email: user.email,
                profilePicture: user.profilePicture,
                role: user.role,
            },
        });

    } catch (error) {
        if (error.code === 11000) {
            return res.status(409).json({
                message: "Username or email already exists"
            });
        } else {
            console.error(error);
            return res.status(500).json({ message: "Internal server error" });
        }
    }
}

// Log in an existing user
async function loginUser(req, res) {
    try {
        // Get identifier and password from request body
        const { identifier, password } = req.body;

        // Validate that credentials are provided
        if (!identifier || !password) {
            return res.status(400).json({
                message: "UserName/email and password are required"
            });
        }

        // Normalize username or email identifier to lowercase
        const normalizedIdentifier = identifier.trim().toLowerCase();

        // Query database for user document by username or email including password
        const user = await userModel
            .findOne({
                $or: [
                    { username: normalizedIdentifier },
                    { email: normalizedIdentifier }
                ]
            })
            .select("+password");

        // Return 401 error if user was not found
        if (!user) {
            return res.status(401).json({
                message: "Invalid credentials"
            });
        }

        // Compare entered password with stored hashed password using bcrypt
        const isPasswordValid = await bcrypt.compare(password, user.password);

        // Check if password matches
        if (!isPasswordValid) {
            return res.status(401).json({ message: "Invalid credentials" });
        }

        // Generate signed JWT authentication token with user ID
        const token = jwt.sign(
            {
                id: user._id,
            },
            process.env.JWT_SECRET,
            {
                expiresIn: "7d"
            }
        );

        // Store JWT authentication token in secure HTTP-only cookie
        res.cookie("token", token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
            path: "/",
        });

        // Return authenticated user profile details in response
        return res.status(200).json({
            message: "User Login successfully",
            user: {
                id: user._id,
                _id: user._id,
                username: user.username,
                name: user.name || "",
                email: user.email,
                profilePicture: user.profilePicture,
                bio: user.bio || "",
                role: user.role,
            },
        });

    } catch (error) {
        console.error(error);

        return res.status(500).json({
            message: "Internal server error"
        });
    }
}

// Log out user and clear cookie session
async function logout(req, res) {
    try {
        // Clear authentication token cookie
        res.clearCookie("token", {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
        });

        // Send confirmation response for successful logout
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

// Change password for logged-in user
async function changePassword(req, res) {
    try {
        // Get authenticated user ID from request
        const userId = req.user._id;

        // Validate user ID format
        if (!mongoose.isValidObjectId(userId)) {
            return res.status(400).json({
                message: "Invalid User ID"
            });
        }

        // Get passwords from request body
        const { oldpassword, newpassword } = req.body;

        // Query database for user document including password field
        const user = await userModel
            .findById({ _id: userId })
            .select("+password");

        if (!user) {
            return res.status(401).json({
                message: "Invalid credentials"
            });
        }

        // Compare entered old password with stored hashed password
        const isPasswordValid = await bcrypt.compare(oldpassword, user.password);
        if (!isPasswordValid) {
            return res.status(401).json({ message: "Invalid credentials" });
        }

        // Verify that new password is not identical to current password
        const isSamePassword = await bcrypt.compare(newpassword, user.password);
        if (isSamePassword) {
            return res.status(400).json({
                message: "New password must be different from old password"
            });
        }

        // Hash new password using bcrypt
        const hashedPassword = await bcrypt.hash(newpassword, 12);

        // Update user document with newly hashed password
        const afterUser = await userModel.findOneAndUpdate(
            { _id: userId },
            { password: hashedPassword },
            {
                returnDocument: "after",
                runValidators: true
            }
        );

        // Return password update confirmation response
        return res.status(200).json({
            message: "User Password Was Change successfully",
            id: afterUser._id,
            username: afterUser.username
        });

    } catch (error) {
        console.error(error);

        return res.status(500).json({
            message: "Internal server error",
            error: error.message
        });
    }
}

// Verify email address for password reset flow
async function verifyResetEmail(req, res) {
    try {
        // Extract email address from request body
        const { email } = req.body;

        // Validate that email is provided
        if (!email || !email.trim()) {
            return res.status(400).json({
                success: false,
                message: "Email address is required"
            });
        }

        // Validate email format using regular expression
        const normalizedEmail = email.trim().toLowerCase();
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(normalizedEmail)) {
            return res.status(400).json({
                success: false,
                message: "Please enter a valid email address"
            });
        }

        // Query database to check if user account exists with this email
        const user = await userModel.findOne({ email: normalizedEmail }).select("_id username email name profilePicture");

        if (!user) {
            return res.status(404).json({
                success: false,
                message: "No user found with this email address"
            });
        }

        // Return confirmation with matched user details
        return res.status(200).json({
            success: true,
            message: "Email confirmed successfully",
            user: {
                _id: user._id,
                username: user.username,
                email: user.email,
                name: user.name || user.username
            }
        });
    } catch (error) {
        console.error("verifyResetEmail error:", error);
        return res.status(500).json({
            success: false,
            message: "Internal server error",
            error: error.message
        });
    }
}

// Reset forgotten password after email confirmation
async function forgotPassword(req, res) {
    try {
        // Extract email and new password credentials from request body
        const { email, newpassword, newconfirmpassword, confirmpassword } = req.body;
        const confirmPass = newconfirmpassword || confirmpassword;

        // Validate that email is provided
        if (!email || !email.trim()) {
            return res.status(400).json({
                success: false,
                message: "Email address is required"
            });
        }

        // Validate email format using regular expression
        const normalizedEmail = email.trim().toLowerCase();
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(normalizedEmail)) {
            return res.status(400).json({
                success: false,
                message: "Please enter a valid email address"
            });
        }

        // Query database for user account by normalized email
        const user = await userModel.findOne({ email: normalizedEmail }).select("+password");

        if (!user) {
            return res.status(404).json({
                success: false,
                message: "No user account exists with this email address"
            });
        }

        // Return confirmation if only verifying email (step 1)
        if (!newpassword && !confirmPass) {
            return res.status(200).json({
                success: true,
                message: "Email confirmed. You can now set your new password.",
                username: user.username
            });
        }

        // Validate that new password and confirmation password are provided
        if (!newpassword || !confirmPass) {
            return res.status(400).json({
                success: false,
                message: "New password and confirmation password are required"
            });
        }

        // Validate password minimum length
        if (newpassword.length < 8) {
            return res.status(400).json({
                success: false,
                message: "Password must be at least 8 characters long"
            });
        }

        // Check that new password matches confirmation password
        if (newpassword !== confirmPass) {
            return res.status(400).json({
                success: false,
                message: "Passwords do not match"
            });
        }

        // Verify that user is not setting the same password as current
        if (user.password) {
            const isSame = await bcrypt.compare(newpassword, user.password);
            if (isSame) {
                return res.status(400).json({
                    success: false,
                    message: "New password must be different from previous password"
                });
            }
        }

        // Hash new password using bcrypt
        const hashedPassword = await bcrypt.hash(newpassword, 12);

        // Update password in database for user document
        await userModel.findByIdAndUpdate(user._id, {
            password: hashedPassword
        });

        // Return password reset success message
        return res.status(200).json({
            success: true,
            message: "Password reset successfully. You can now login with your new password.",
            username: user.username
        });
    } catch (error) {
        console.error("forgotPassword error:", error);
        return res.status(500).json({
            success: false,
            message: "Internal server error",
            error: error.message
        });
    }
}

module.exports = {
    registerUser,
    loginUser,
    logout,
    changePassword,
    verifyResetEmail,
    forgotPassword
};