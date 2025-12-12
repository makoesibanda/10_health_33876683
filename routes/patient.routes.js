const express = require("express");

module.exports = function () {
    const router = express.Router();
    const basePath = process.env.HEALTH_BASE_PATH || "";

    function ensurePatient(req, res, next) {
        if (!req.session.user || req.session.user.role !== "patient") {
            return res.redirect(basePath + "/login");
        }
        next();
    }

    router.get("/patient", ensurePatient, function (req, res) {
        res.render("patient-dashboard", {
            pageTitle: "Patient Dashboard",
            description: "View and book your appointments here"
        });
    });

    // View available slots
    router.get("/book-appointment", ensurePatient, function (req, res) {
        db.query(
            "SELECT * FROM slots WHERE status = 'available' ORDER BY slot_date, start_time",
            function (err, rows) {
                if (err) {
                    console.log(err);
                    return res.send("Error loading slots.");
                }

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

    // Book slot
    router.post("/book-appointment", ensurePatient, function (req, res) {
        let user = req.session.user;
        let slotId = req.body.slotId;
        let reason = req.sanitize(req.body.reason);

        db.query(
            "SELECT * FROM slots WHERE id = ? AND status = 'available'",
            [slotId],
            function (err, slotRows) {
                if (err || slotRows.length === 0) {
                    return res.send("Sorry, this slot is not available.");
                }

                db.query(
                    "INSERT INTO appointments (user_id, slot_id, reason, status) VALUES (?, ?, ?, 'pending')",
                    [user.id, slotId, reason],
                    function (err2) {
                        if (err2) {
                            console.log(err2);
                            return res.send("Could not book appointment.");
                        }

                        db.query("UPDATE slots SET status = 'taken' WHERE id = ?", [slotId]);

                        return res.redirect(basePath + "/my-appointments");
                    }
                );
            }
        );
    });

    // View appointments
    router.get("/my-appointments", ensurePatient, function (req, res) {
        let user = req.session.user;

        let page = parseInt(req.query.page) || 1;
        let limit = 2;
        let offset = (page - 1) * limit;

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
