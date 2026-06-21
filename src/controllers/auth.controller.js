const userModel = require("../models/user.model")
const bcrypt = require("bcryptjs")
const jwt = require("jsonwebtoken")
const tokenBlacklistModel = require("../models/blacklist.model")

/**
 * @name registerUserController
 * @description register a new user, expects username, email and password in the request body
 * @access Public
 */
async function registerUserController(req, res) {
  try {
    const { username, email, password } = req.body;

    if (!username || !email || !password) {
      return res.status(400).json({
        message: "Please provide username, email and password"
      });
    }

    const existingUser = await userModel.findOne({
      $or: [{ email }, { username }]
    });

    if (existingUser) {
      return res.status(400).json({
        message: "Email or username already exists"
      });
    }

    const hash = await bcrypt.hash(password, 10);

    const user = await userModel.create({
      username,
      email,
      password: hash
    });

    const token = jwt.sign(
      { id: user._id, username: user.username },
      process.env.JWT_SECRET,
      { expiresIn: "1d" }
    );

    const origin = req.headers.origin || "";
    const isLocalhost = origin.includes("localhost") || origin.includes("127.0.0.1");
    const isSecureCookie = origin && !isLocalhost;

    res.cookie("token", token, {
      httpOnly: true,
      sameSite: isSecureCookie ? "none" : "lax",
      secure: isSecureCookie,
    });

    return res.status(201).json({
      message: "User registered successfully",
      user: {
        id: user._id,
        username: user.username,
        email: user.email
      }
    });

  } catch (err) {
    // 🔥 IMPORTANT: Mongo duplicate protection
    if (err.code === 11000) {
      return res.status(400).json({
        message: "Email or username already exists"
      });
    }

    return res.status(500).json({
      message: "Server error"
    });
  }
}


/**
 * @name loginUserController
 * @description login a user, expects email and password in the request body
 * @access Public
 */
async function loginUserController(req, res) {

    const { email, password } = req.body

    const user = await userModel.findOne({ email })

    if (!user) {
        return res.status(400).json({
            message: "Invalid email or password"
        })
    }

    const isPasswordValid = await bcrypt.compare(password, user.password)

    if (!isPasswordValid) {
        return res.status(400).json({
            message: "Invalid email or password"
        })
    }

    const token = jwt.sign(
        { id: user._id, username: user.username },
        process.env.JWT_SECRET,
        { expiresIn: "1d" }
    );

    const origin = req.headers.origin || "";
    const isLocalhost = origin.includes("localhost") || origin.includes("127.0.0.1");
    const isSecureCookie = origin && !isLocalhost;

    res.cookie("token", token, {
        httpOnly: true,
        sameSite: isSecureCookie ? "none" : "lax",
        secure: isSecureCookie,
    });

    return res.status(200).json({
        message: "User loggedIn successfully.",
        user: {
            id: user._id,
            username: user.username,
            email: user.email
        }
    });
}


/**
 * @name logoutUserController
 * @description clear token from user cookie and add the token in blacklist
 * @access public
 */
async function logoutUserController(req, res) {
    const token = req.cookies.token;

    if (token) {
        await tokenBlacklistModel.create({ token });
    }

    const origin = req.headers.origin || "";
    const isLocalhost = origin.includes("localhost") || origin.includes("127.0.0.1");
    const isSecureCookie = origin && !isLocalhost;

    res.clearCookie("token", {
        httpOnly: true,
        sameSite: isSecureCookie ? "none" : "lax",
        secure: isSecureCookie
    });

    return res.status(200).json({
        message: "User logged out successfully"
    });
}/**
 * @name getMeController
 * @description get the current logged in user details.
 * @access private
 */
async function getMeController(req, res) {

    const user = await userModel.findById(req.user.id)



    res.status(200).json({
        message: "User details fetched successfully",
        user: {
            id: user._id,
            username: user.username,
            email: user.email
        }
    })

}



module.exports = {
    registerUserController,
    loginUserController,
    logoutUserController,
    getMeController
}
