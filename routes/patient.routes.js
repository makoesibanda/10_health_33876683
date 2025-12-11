const express = require("express");

module.exports = function () {
    const router = express.Router();

    // Middleware: only allow access if the user is logged in as a patient
    function ensurePatient(req, res, next) {
        if (!req.session.user || req.session.user.role !== "patient") {
            return res.status(403).send("You are not allowed to view this page.");
        }
        next();
    }

    // Patient dashboard page
    router.get("/patient", ensurePatient, function (req, res) {
        res.render("patient-dashboard", {
            pageTitle: "Patient Dashboard",
            description: "View and book your appointments here"
        });
    });

    // Show all available slots for booking
    router.get("/book-appointment", ensurePatient, function (req, res) {
        db.query(
            "SELECT * FROM slots WHERE status = 'available' ORDER BY slot_date, start_time",
            function (err, rows) {
                if (err) {
                    console.log(err);
                    return res.send("Error loading slots.");
                }

                // Format slot data for EJS template
                let formatted = rows.map(function (slot) {
                    return {
                        id: slot.id,
                        date: slot.slot_date,
                        startTime: slot.start_time,
                        endTime: slot.end_time
                    };
                });

                res.render("book-appointment", {
                    pageTitle: "Book Appointment",
                    slots: formatted
                });
            }
        );
    });

    // Handle booking a slot
    router.post("/book-appointment", ensurePatient, function (req, res) {
        let user = req.session.user;
        let slotId = req.body.slotId;
        let reason = req.sanitize(req.body.reason);

        // Check if the slot still exists and is available
        db.query(
            "SELECT * FROM slots WHERE id = ? AND status = 'available'",
            [slotId],
            function (err, slotRows) {
                if (err) {
                    console.log(err);
                    return res.send("Error checking slot.");
                }

                if (slotRows.length === 0) {
                    return res.send("Sorry, this slot is no longer available.");
                }

                // Insert appointment record
                db.query(
                    "INSERT INTO appointments (user_id, slot_id, reason, status) VALUES (?, ?, ?, 'pending')",
                    [user.id, slotId, reason],
                    function (err2) {
                        if (err2) {
                            console.log(err2);
                            return res.send("Could not book appointment.");
                        }

                        // Mark the slot as taken so it cannot be booked again
                        db.query("UPDATE slots SET status = 'taken' WHERE id = ?", [slotId]);

                        res.redirect("/my-appointments");
                    }
                );
            }
        );
    });

    // View all appointments for this patient with pagination
    router.get("/my-appointments", ensurePatient, function (req, res) {
        let user = req.session.user;

        let page = parseInt(req.query.page) || 1;
        let limit = 2; // small limit here for testing/demo purposes
        let offset = (page - 1) * limit;

        // Count total appointments for this patient
        db.query(
            "SELECT COUNT(*) AS total FROM appointments WHERE user_id = ?",
            [user.id],
            function (err, countRows) {
                if (err) {
                    console.log(err);
                    return res.send("Error loading appointments.");
                }

                let total = countRows[0].total;
                let totalPages = Math.ceil(total / limit);

                // Query appointments with slot details
                const sql = `
                    SELECT 
                        a.id,
                        CONCAT(s.slot_date, ' ', s.start_time, ' - ', s.end_time) AS slotLabel,
                        a.reason,
                        a.status
                    FROM appointments a
                    JOIN slots s ON a.slot_id = s.id
                    WHERE a.user_id = ?
                    ORDER BY a.id DESC
                    LIMIT ? OFFSET ?
                `;

                db.query(sql, [user.id, limit, offset], function (err2, rows) {
                    if (err2) {
                        console.log(err2);
                        return res.send("Error loading appointments.");
                    }

                    res.render("my-appointments", {
                        pageTitle: "My Appointments",
                        appointments: rows,
                        currentPage: page,
                        totalPages: totalPages
                    });
                });
            }
        );
    });

    return router;
};
