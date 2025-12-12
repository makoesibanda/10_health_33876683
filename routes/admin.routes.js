const express = require("express");

module.exports = function () {
    const router = express.Router();
    const basePath = process.env.HEALTH_BASE_PATH || "";

    // Only admin users should access these pages
    function ensureAdmin(req, res, next) {
        if (!req.session.user || req.session.user.role !== "admin") {
            return res.redirect("/login");
        }
        next();
    }

    // Admin dashboard
    router.get("/admin", ensureAdmin, function (req, res) {
        res.render("admin-dashboard", {
            pageTitle: "Admin Dashboard",
            description: "Manage slots and patient appointments here"
        });
    });

    // View slots with pagination
    router.get("/admin/slots", ensureAdmin, function (req, res) {
        let page = parseInt(req.query.page) || 1;
        let limit = 3; // small for testing
        let offset = (page - 1) * limit;

        db.query("SELECT COUNT(*) AS total FROM slots", function (err, countRows) {
            if (err) {
                console.log(err);
                return res.send("Could not load slots.");
            }

            let total = countRows[0].total;
            let totalPages = Math.ceil(total / limit);

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

    // Create-slot page
    router.get("/admin/create-slots", ensureAdmin, function (req, res) {
        res.render("create-slots", {
            pageTitle: "Create Slots",
            description: "Create new appointment slots",
            message: null,
            error: null
        });
    });

    // Handle slot creation in a date range
    router.post("/admin/create-slots", ensureAdmin, function (req, res) {
        let startDate = req.sanitize(req.body.startDate);
        let endDate = req.sanitize(req.body.endDate);
        let startTime = req.body.startTime;
        let endTime = req.body.endTime;
        let repeatPattern = req.body.repeatPattern;

        // Required fields
        if (!startDate || !endDate || !startTime || !endTime) {
            return res.render("create-slots", {
                pageTitle: "Create Slots",
                description: "Create new appointment slots",
                error: "Please fill in all fields.",
                message: null
            });
        }

        if (endDate < startDate) {
            return res.render("create-slots", {
                pageTitle: "Create Slots",
                description: "Create new appointment slots",
                error: "End date cannot be before start date.",
                message: null
            });
        }

        let createdCount = 0;
        let current = new Date(startDate);
        let last = new Date(endDate);

        // Loop one day at a time
        function processDay() {
            if (current > last) {
                return finishUp();
            }

            let day = current.getDay();
            let dateString = current.toISOString().split("T")[0];

            // Decide which days to include
            let include =
                repeatPattern === "everyday" ||
                (repeatPattern === "weekdays" && day >= 1 && day <= 5);

            if (!include) {
                current.setDate(current.getDate() + 1);
                return processDay();
            }

            // Check for overlapping slots
            db.query("SELECT * FROM slots WHERE slot_date = ?", [dateString], function (err, rows) {
                if (err) {
                    console.log(err);
                    current.setDate(current.getDate() + 1);
                    return processDay();
                }

                let overlap = false;

                rows.forEach(function (slot) {
                    if (!(endTime <= slot.start_time || startTime >= slot.end_time)) {
                        overlap = true;
                    }
                });

                if (overlap) {
                    current.setDate(current.getDate() + 1);
                    return processDay();
                }

                // Insert new slot
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

        // Final message
        function finishUp() {
            let msg =
                createdCount === 0
                    ? "No new slots were created."
                    : "Successfully created " + createdCount + " slot(s).";

            res.render("create-slots", {
                pageTitle: "Create Slots",
                description: "Create new appointment slots",
                message: msg,
                error: null
            });
        }

        processDay();
    });

    return router;
};
