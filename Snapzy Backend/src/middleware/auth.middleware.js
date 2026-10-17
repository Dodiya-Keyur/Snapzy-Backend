const jwt = require("jsonwebtoken");
const userModel = require("../models/user.model");

// Verify authentication token from cookies and attach user to request
const authMiddleware = async (req, res, next) => {
    try {
        // Extract authentication token from Authorization header (Bearer token) or cookies
        let token = null;

        if (req.headers.authorization && req.headers.authorization.startsWith("Bearer ")) {
            token = req.headers.authorization.split(" ")[1];
        } else if (req.cookies && req.cookies.token) {
            token = req.cookies.token;
        }

        // Return 401 if authentication token is missing
        if (!token) {
            return res.status(401).json({
                message: "You are not logged in"
            });
        }

        // Verify and decode JWT token using secret key
        const decoded = jwt.verify(
            token,
            process.env.JWT_SECRET
        );

        // Query database to find user by decoded token ID
        const user = await userModel.findById(decoded.id);

        if (!user) {
            return res.status(401).json({
                message: "Invalid credentials"
            });
        }

        // Attach authenticated user document to request object
        req.user = user;

        // Proceed to next middleware or route controller
        next();

    } catch (error) {
        console.error(error);

        return res.status(401).json({
            message: "Invalid or expired token"
        });
    }
};

module.exports = authMiddleware;
