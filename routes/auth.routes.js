const express = require("express");
const bcrypt = require("bcrypt");

module.exports = function () {
    const router = express.Router();
    const basePath = process.env.HEALTH_BASE_PATH || "";

    // Show login page
    router.get("/login", function (req, res) {
        res.render("login", {
            pageTitle: "Login",
            message: "Please log in to continue",
            error: null
        });
    });

    // Handle login form submission
    router.post("/login", function (req, res) {
        let email = req.body.email;       // email OR admin username
        let password = req.body.password;

        // Look up account by email/username
        db.query("SELECT * FROM users WHERE email = ?", [email], async function (err, rows) {
            if (err) {
                console.log(err);
                return res.render("login", {
                    pageTitle: "Login",
                    message: null,
                    error: "Something went wrong. Try again."
                });
            }

            // No matching user
            if (rows.length === 0) {
                return res.render("login", {
                    pageTitle: "Login",
                    message: null,
                    error: "Invalid email/username or password."
                });
            }

            const user = rows[0];
            const match = await bcrypt.compare(password, user.password);

            if (!match) {
                return res.render("login", {
                    pageTitle: "Login",
                    message: null,
                    error: "Invalid email/username or password."
                });
            }

            // Save essential user details in session
            req.session.user = {
                id: user.id,
                fullName: user.full_name,
                role: user.role
            };

            // Redirect to correct dashboard
            if (user.role === "admin") {
                return res.redirect(basePath + "/admin");
            } else {
                return res.redirect(basePath + "/patient");
            }
        });
    });

    // Registration page
    router.get("/register", function (req, res) {
        res.render("register", {
            pageTitle: "Register",
            message: "Create your account below",
            error: null
        });
    });

    // Handle new user registration
    router.post("/register", async function (req, res) {
        let fullName = req.sanitize(req.body.fullName);
        let email = req.sanitize(req.body.email);
        let password = req.body.password;
        let confirmPassword = req.body.confirmPassword;

        // Basic field checks
        if (!fullName || !email || !password || !confirmPassword) {
            return res.render("register", {
                pageTitle: "Register",
                message: null,
                error: "Please fill in all fields."
            });
        }

        if (password !== confirmPassword) {
            return res.render("register", {
                pageTitle: "Register",
                message: null,
                error: "Passwords do not match."
            });
        }

        // Prevent admin reserved email
        if (email.toLowerCase() === "admin@clinic.com") {
            return res.render("register", {
                pageTitle: "Register",
                message: null,
                error: "This email is not allowed."
            });
        }

        // Check if email already exists
        db.query("SELECT * FROM users WHERE email = ?", [email], async function (err, rows) {
            if (err) {
                console.log(err);
                return res.render("register", {
                    pageTitle: "Register",
                    message: null,
                    error: "Something went wrong."
                });
            }

            if (rows.length > 0) {
                return res.render("register", {
                    pageTitle: "Register",
                    message: null,
                    error: "An account with this email already exists."
                });
            }

            // Encrypt password
            const hashedPassword = await bcrypt.hash(password, 10);

            // Insert patient record
            db.query(
                "INSERT INTO users (full_name, email, password, role) VALUES (?, ?, ?, 'patient')",
                [fullName, email, hashedPassword],
                function (err2, result) {
                    if (err2) {
                        console.log(err2);
                        return res.render("register", {
                            pageTitle: "Register",
                            message: null,
                            error: "Could not create your account."
                        });
                    }

                    // Auto-login the new patient
                    req.session.user = {
                        id: result.insertId,
                        fullName: fullName,
                        role: "patient"
                    };

                    return res.redirect(basePath + "/patient");
                }
            );
        });
    });

    // Logout → clear session
    router.get("/logout", function (req, res) {
        req.session.destroy(function () {
            return res.redirect(basePath + "/login");
        });
    });

    return router;
};
