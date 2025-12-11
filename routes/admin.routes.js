const express = require("express");

module.exports = function () {
    const router = express.Router();

    // Middleware: only allow access if the user is logged in as admin
    function ensureAdmin(req, res, next) {
        if (!req.session.user || req.session.user.role !== "admin") {
            return res.status(403).send("You are not allowed to view this page.");
        }
        next();
    }

    // Admin dashboard page
    router.get("/admin", ensureAdmin, function (req, res) {
        res.render("admin-dashboard", {
            pageTitle: "Admin Dashboard",
            description: "Manage slots and patient appointments here"
        });
    });

    // Show all slots with pagination
    router.get("/admin/slots", ensureAdmin, function (req, res) {
        let page = parseInt(req.query.page) || 1;
        let limit = 3;  // limit per page (set small here for easy testing)
        let offset = (page - 1) * limit;

        // First count total slots to calculate total pages
        db.query("SELECT COUNT(*) AS total FROM slots", function (err, countRows) {
            if (err) {
                console.log(err);
                return res.send("Could not load slots.");
            }

            let total = countRows[0].total;
            let totalPages = Math.ceil(total / limit);

            // Then fetch the current page of slots
            db.query(
                "SELECT * FROM slots ORDER BY slot_date, start_time LIMIT ? OFFSET ?",
                [limit, offset],
                function (err2, rows) {
                    if (err2) {
                        console.log(err2);
                        return res.send("Could not load slots.");
                    }

                    res.render("manage-slots", {
                        pageTitle: "Manage Slots",
                        description: "View and manage all available slots",
                        slots: rows,
                        currentPage: page,
                        totalPages: totalPages
                    });
                }
            );
        });
    });

    // Show the form to create new slots
    router.get("/admin/create-slots", ensureAdmin, function (req, res) {
        res.render("create-slots", {
            pageTitle: "Create Slots",
            description: "Create new time slots for appointments.",
            message: null,
            error: null
        });
    });

    // Handle slot creation across a date range
    router.post("/admin/create-slots", ensureAdmin, function (req, res) {
        let startDate = req.sanitize(req.body.startDate);
        let endDate = req.sanitize(req.body.endDate);
        let startTime = req.body.startTime;
        let endTime = req.body.endTime;
        let repeatPattern = req.body.repeatPattern;

        // Basic validation
        if (!startDate || !endDate || !startTime || !endTime) {
            return res.render("create-slots", {
                pageTitle: "Create Slots",
                description: "Create new time slots for appointments.",
                error: "Please fill in all fields.",
                message: null
            });
        }

        if (endDate < startDate) {
            return res.render("create-slots", {
                pageTitle: "Create Slots",
                description: "Create new time slots for appointments.",
                error: "End date cannot be before start date.",
                message: null
            });
        }

        let createdCount = 0;
        let current = new Date(startDate);
        let last = new Date(endDate);

        // Recursive function to process each day in the range
        function processDay() {
            if (current > last) {
                return finishUp();
            }

            let day = current.getDay(); // 0 = Sunday, 6 = Saturday
            let dateString = current.toISOString().split("T")[0];

            // Decide whether to include this day based on repeat pattern
            let include =
                repeatPattern === "everyday" ||
                (repeatPattern === "weekdays" && day >= 1 && day <= 5);

            if (!include) {
                current.setDate(current.getDate() + 1);
                return processDay();
            }

            // Check for existing slots on this date
            db.query("SELECT * FROM slots WHERE slot_date = ?", [dateString], function (err, rows) {
                if (err) {
                    console.log(err);
                    current.setDate(current.getDate() + 1);
                    return processDay();
                }

                let overlap = false;

                // Check if new slot would overlap with existing ones
                rows.forEach(function (slot) {
                    if (!(endTime <= slot.start_time || startTime >= slot.end_time)) {
                        overlap = true;
                    }
                });

                if (overlap) {
                    current.setDate(current.getDate() + 1);
                    return processDay();
                }

                // Insert new slot if safe
                db.query(
                    "INSERT INTO slots (slot_date, start_time, end_time, status) VALUES (?, ?, ?, 'available')",
                    [dateString, startTime, endTime],
                    function (err2) {
                        if (!err2) {
                            createdCount++;
                        }
                        current.setDate(current.getDate() + 1);
                        return processDay();
                    }
                );
            });
        }

        // Final step after processing all days
        function finishUp() {
            let msg =
                createdCount === 0
                    ? "No new slots were created. They may already exist or overlap."
                    : "Successfully created " + createdCount + " slot(s).";

            res.render("create-slots", {
                pageTitle: "Create Slots",
                description: "Create new time slots for appointments.",
                message: msg,
                error: null
            });
        }

        processDay();
    });

    return router;
};
//