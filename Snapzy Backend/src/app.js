const express = require("express");
const cors = require("cors");
const cookieParser = require("cookie-parser")

// Routers 
const authRouter = require("./routes/auth.routers");
const postrouter = require("./routes/post.routers");
const userrouter = require("./routes/user.routers");
const likerouter = require("./routes/like.routers");
const followrouter = require("./routes/follow.routers");
const commentrouter = require("./routes/comment.routers");
const searchrouter = require("./routes/search.routers");
const notificationrouter = require("./routes/notifications.routers");

const app = express();

const allowedOrigins = [
	process.env.FRONTEND_URL,
	"http://localhost:5173",
	"http://127.0.0.1:5173",
	"http://localhost:5174",
	"http://127.0.0.1:5174",
].filter(Boolean);

app.use(cors({
	origin: (origin, callback) => {
		if (!origin || allowedOrigins.includes(origin)) {
			callback(null, true);
		} else {
			callback(new Error("Not allowed by CORS"));
		}
	},
	credentials: true,
}));

app.use(cookieParser());
app.use(express.json());

app.use("/api/auth", authRouter);
app.use("/api/posts", postrouter);
app.use("/api/users", userrouter);
app.use("/api/posts", likerouter);
app.use("/api/follows", followrouter);
app.use("/api/comments", commentrouter);
app.use("/search", searchrouter);
app.use("/api/noti", notificationrouter);


module.exports = app;