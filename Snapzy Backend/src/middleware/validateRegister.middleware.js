// Validate registration input payload
const validateRegister = (req, res, next) => {
    // Extract user registration data from request body
    const { username, email, password, confirmpassword } = req.body;

    // Validate that all required fields are present
    if (!username || !email || !password || !confirmpassword) {
        return res.status(400).json({
            message: "All fields are required"
        });
    }

    // Validate username minimum length of 3 characters
    if (username.length < 3) {
        return res.status(400).json({
            message: "Username must be at least 3 characters"
        });
    }

    // Ensure username is in lowercase characters
    if (username !== username.toLowerCase()) {
        return res.status(400).json({
            message: "Username must be in lowercase"
        });
    }

    // Validate email format using standard regex pattern
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        return res.status(400).json({
            message: "Please enter a valid email"
        });
    }

    // Validate password minimum length of 8 characters
    if (password.length < 8) {
        return res.status(400).json({
            message: "Password must be at least 8 characters"
        });
    }

    // Verify that password and confirmation password match
    if (password !== confirmpassword) {
        return res.status(400).json({
            message: "Passwords do not match"
        });
    }

    next();
};

// Validate password change input payload
const validateChangePassword = (req, res, next) => {
    // Extract old password and new password credentials from request body
    const { oldpassword, newpassword, newconfirmpassword } = req.body;

    // Validate that all required password fields are provided
    if (!oldpassword || !newpassword || !newconfirmpassword) {
        return res.status(400).json({
            message: "All fields are required"
        });
    }

    // Validate old password minimum length
    if (oldpassword.length < 8) {
        return res.status(400).json({
            message: "Password must be at least 8 characters"
        });
    }

    // Validate new password minimum length
    if (newpassword.length < 8) {
        return res.status(400).json({
            message: "Password must be at least 8 characters"
        });
    }

    // Verify that new password matches the confirmation password
    if (newpassword !== newconfirmpassword) {
        return res.status(400).json({
            message: "Passwords & Confirm password do not match"
        });
    }

    next();
};

module.exports = { validateRegister, validateChangePassword };