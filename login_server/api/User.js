const express = require('express');
const router = express.Router();
const nodemailer = require('nodemailer');
const { v4: uuidv4 } = require('uuid');
const bcrypt = require('bcrypt');
const path = require('path');

// mongodb user model
const User = require('./../models/User');
const UserVerification = require('../models/UserVerification');

// Setting server url
const development = process.env.DEVELOPMENT_URL;
const currentUrl = development; // process.env.NODE_ENV;

// Nodemailer Setup
let transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
        user: process.env.AUTH_EMAIL,
        pass: process.env.AUTH_PASS,
    }
});

// Testing success
transporter.verify((error, success) => {
    if (error) {
        console.log(error);
    } else {
        console.log("Ready for messages...");
    }
});

// Signup route
router.post('/signup', (req, res) => {
    let { name, email, password, dateOfBirth } = req.body;
    name = name.trim();
    email = email.trim();
    password = password.trim();
    dateOfBirth = dateOfBirth.trim();

    if (name == "" || email == "" || password == "" || dateOfBirth == "") {
        res.json({ status: "FAILED", message: "Empty Input Fields!" });
    } else if (!/^[a-zA-Z ]*$/.test(name)) {
        res.json({ status: "FAILED", message: "Invalid name entered" });
    } else if (!/^[\w-\.]+@([\w-]+\.)+[\w-]{2,4}$/.test(email)) {
        res.json({ status: "FAILED", message: "Invalid email entered" });
    } else if (!new Date(dateOfBirth).getTime()) {
        res.json({ status: "FAILED", message: "Invalid Date Of Birth entered" });
    } else if (password.length < 8) {
        res.json({ status: "FAILED", message: "Password is too short!" });
    } else {
        User.find({ email }).then(result => {
            if (result.length) {
                res.json({ status: "FAILED", message: "User with the provided email already exists!" });
            } else {
                const saltRounds = 10;
                bcrypt.hash(password, saltRounds).then(hashedPassword => {
                    const newUser = new User({
                        name,
                        email,
                        password: hashedPassword,
                        dateOfBirth,
                        verified: false
                    });

                    newUser.save().then(result => {
                        sendVerificationEmail(result, res);
                    }).catch(err => {
                        res.json({ status: "FAILED", message: "An error occurred while saving user account!" });
                    });
                }).catch(err => {
                    res.json({ status: "FAILED", message: "An error occurred while hashing password!" });
                });
            }
        }).catch(err => {
            res.json({ status: "FAILED", message: "An error occurred while checking for existing user!" });
        });
    }
});

// Send verification email
const sendVerificationEmail = ({ _id, email }, res) => {
    const uniqueString = uuidv4() + _id;

    const mailOptions = {
        from: process.env.AUTH_EMAIL,
        to: email,
        subject: "Please, Verify your Email!",
        html: `<p>Please verify your email address to complete the signup and login into your account.</p>
               <p>This link <b>expires in 6 Hours</b>.</p>
               <p>Press <a href=${currentUrl + "user/verify/" + _id + "/" + uniqueString}> here </a> to proceed. </p>`,
    };

    bcrypt.hash(uniqueString, 10).then((hashedUniqueString) => {
        const newVerification = new UserVerification({
            userId: _id,
            uniqueString: hashedUniqueString,
            createdAt: Date.now(),
            expireAt: Date.now() + 21600000, // 6 hours
        });

        newVerification.save().then(() => {
            transporter.sendMail(mailOptions).then(() => {
                res.json({
                    status: "PENDING",
                    message: "Verification email sent",
                    data: { userId: _id, email },
                });
            }).catch(err => {
                res.json({ status: "FAILED", message: "Verification email Failed" });
            });
        }).catch(error => {
            res.json({ status: "FAILED", message: "Couldn't save verification email data" });
        });
    }).catch(() => {
        res.json({ status: "FAILED", message: "An error occurred while hashing email data!" });
    });
};

// Resend verification link
router.post("/resendVerificationLink", async (req, res) => {
    try {
        let { userId, email } = req.body;
        if (!userId || !email) throw new Error("Empty user details are not allowed");
        await UserVerification.deleteMany({ userId });
        sendVerificationEmail({ _id: userId, email }, res);
    } catch (error) {
        res.json({ status: "FAILED", message: `Verification Link Resend Error. ${error.message}` });
    }
});

// Email verification route
router.get("/verify/:userId/:uniqueString", async (req, res) => {
    let { userId, uniqueString } = req.params;

    try {
        const result = await UserVerification.find({ userId });

        if (result.length > 0) {
            const { expiresAt, uniqueString: hashedUniqueString } = result[0];

            if (expiresAt < Date.now()) {
                await UserVerification.deleteOne({ userId });
                await User.deleteOne({ _id: userId });
                let message = "Link has expired. Please sign up again!";
                res.redirect(`/user/verified?error=true&message=${message}`);
            } else {
                const match = await bcrypt.compare(uniqueString, hashedUniqueString);

                if (match) {
                    await User.updateOne({ _id: userId }, { verified: true });
                    await UserVerification.deleteOne({ userId });

                    res.sendFile(path.join(__dirname, "./../views/verified.html"));
                } else {
                    let message = "Invalid verification details passed. Check your inbox.";
                    res.redirect(`/user/verified?error=true&message=${message}`);
                }
            }
        } else {
            let message = "Account record doesn't exist or has been verified already. Please sign up or log in!";
            res.redirect(`/user/verified?error=true&message=${message}`);
        }
    } catch (error) {
        console.log(error);
        let message = "An error occurred while checking for existing user verification record.";
        res.redirect(`/user/verified?error=true&message=${message}`);
    }
});


// Signin
router.post('/signin', (req, res) => {
    let { email, password } = req.body;
    email = email.trim()
    password = password.trim()

    if (email == "" || password == "") {
        res.json({
            status: "FAILED",
            message: "Empty credentials supplied!"
        });
    } else {
        // Check if user exist
        User.find({ email })
            .then(data => {
                if (data.length) {
                    // User exists

                    const hashedPassword = data[0].password;
                    bcrypt.compare(password, hashedPassword).then(result => {
                        if (result) {
                            // Password Match
                            res.json({
                                status: "SUCCESS",
                                message: "Signin Successful",
                                data: data
                            })
                        } else {
                            res.json({
                                status: "FAILED",
                                message: "Invalid Password entered"
                            })
                        }
                    })
                        .catch(err => {
                            res.json({
                                status: "FAILED",
                                message: "An error occurred while comparing passwords"
                            })
                        })

                } else {
                    res.json({
                        status: "FAILED",
                        message: "Invalid credentials entered!"
                    })
                }
            })
            .catch(err => {
                res.json({
                    status: "FAILED",
                    message: "An error occurred while checking for existing user"
                })
            })
    }

})

module.exports = router;
