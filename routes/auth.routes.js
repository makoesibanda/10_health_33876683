const express = require("express");
const bcrypt = require("bcrypt");

module.exports = function () {
    const router = express.Router();

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
        // Note: email field can be either patient email or admin username
        let email = req.body.email;
        let password = req.body.password;

        // Look up user by email/username
        db.query("SELECT * FROM users WHERE email = ?", [email], async function (err, rows) {
            if (err) {
                console.log(err);
                return res.render("login", {
                    pageTitle: "Login",
                    message: null,
                    error: "Something went wrong. Please try again."
                });
            }

            if (rows.length === 0) {
                return res.render("login", {
                    pageTitle: "Login",
                    message: null,
                    error: "Invalid email/username or password."
                });
            }

            const user = rows[0];

            // Compare entered password with stored hash
            const match = await bcrypt.compare(password, user.password);

            if (!match) {
                return res.render("login", {
                    pageTitle: "Login",
                    message: null,
                    error: "Invalid email/username or password."
                });
            }

            // Save user details in session
            req.session.user = {
                id: user.id,
                fullName: user.full_name,
                role: user.role
            };

            // Redirect based on role
            if (user.role === "admin") {
                res.redirect("/admin");
            } else {
                res.redirect("/patient");
            }
        });
    });

    // Show registration form
    router.get("/register", function (req, res) {
        res.render("register", {
            pageTitle: "Register",
            message: "Create your account below",
            error: null
        });
    });

    // Handle registration form submission
    router.post("/register", async function (req, res) {
        let fullName = req.sanitize(req.body.fullName);
        let email = req.sanitize(req.body.email);
        let password = req.body.password;
        let confirmPassword = req.body.confirmPassword;

        // Basic validation
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

        // Prevent using reserved admin email
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
                    error: "Something went wrong. Please try again."
                });
            }

            if (rows.length > 0) {
                return res.render("register", {
                    pageTitle: "Register",
                    message: null,
                    error: "An account with this email already exists."
                });
            }

            // Hash the password before storing
            const hashedPassword = await bcrypt.hash(password, 10);

            // Insert new patient record
            db.query(
                "INSERT INTO users (full_name, email, password, role) VALUES (?, ?, ?, 'patient')",
                [fullName, email, hashedPassword],
                function (err2, result) {
                    if (err2) {
                        console.log(err2);
                        return res.render("register", {
                            pageTitle: "Register",
                            message: null,
                            error: "Could not create account."
                        });
                    }

                    // Auto-login newly registered patient
                    req.session.user = {
                        id: result.insertId,
                        fullName: fullName,
                        role: "patient"
                    };

                    res.redirect("/patient");
                }
            );
        });
    });

    // Logout route: clears session and returns to login page
    router.get("/logout", function (req, res) {
        req.session.destroy(function () {
            res.redirect("/login");
        });
    });

    return router;
};
