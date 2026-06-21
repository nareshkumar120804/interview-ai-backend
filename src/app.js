const express = require("express")
const cookieParser = require("cookie-parser")
const cors = require("cors")

const app = express()

app.use(express.json())
app.use(cookieParser())
const allowedOrigins = [
    "http://localhost:5173",
    "https://interview-ai-frontend-swart.vercel.app",
    "https://interview-ai-frontend-git-main-nareshkumar120804-2053s-projects.vercel.app",
    "https://interview-ai-frontend-1ewej0nsh.vercel.app"
];

if (process.env.FRONTEND_URL) {
    const envOrigins = process.env.FRONTEND_URL.split(",").map(o => o.trim());
    envOrigins.forEach(origin => {
        if (!allowedOrigins.includes(origin)) {
            allowedOrigins.push(origin);
        }
    });
}

app.use(cors({
    origin: function (origin, callback) {
        // Allow requests with no origin (like mobile apps, curl, postman)
        if (!origin) return callback(null, true);
        
        const isLocalhost = origin.startsWith("http://localhost:") || origin.startsWith("http://127.0.0.1:") || origin === "http://localhost" || origin === "http://127.0.0.1";
        const isVercel = origin.endsWith(".vercel.app");
        const isAllowedOrigin = allowedOrigins.includes(origin);

        if (isLocalhost || isVercel || isAllowedOrigin) {
            callback(null, true);
        } else {
            callback(new Error(`Origin ${origin} not allowed by CORS`));
        }
    },
    credentials: true
}))

/* require all the routes here */
const authRouter = require("./routes/auth.routes")
const interviewRouter = require("./routes/interview.routes")


/* using all the routes here */
app.use("/api/auth", authRouter)
app.use("/api/interview", interviewRouter)



module.exports = app
