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

    // Show all appointments with pagination
    router.get("/manage-appointments", ensureAdmin, function (req, res) {
        let page = parseInt(req.query.page) || 1;
        let limit = 3; // small limit here for testing/demo purposes
        let offset = (page - 1) * limit;

        // First count total appointments to calculate total pages
        db.query("SELECT COUNT(*) AS total FROM appointments", function (err, countRows) {
            if (err) {
                console.log(err);
                return res.send("Could not load appointments.");
            }

            let total = countRows[0].total;
            let totalPages = Math.ceil(total / limit);

            // Query appointments with patient and slot details
            const sql = `
                SELECT 
                    a.id,
                    a.reason,
                    a.status,
                    u.full_name AS fullName,
                    CONCAT(s.slot_date, ' ', s.start_time, ' - ', s.end_time) AS slotLabel
                FROM appointments a
                JOIN users u ON a.user_id = u.id
                JOIN slots s ON a.slot_id = s.id
                ORDER BY s.slot_date DESC, s.start_time DESC
                LIMIT ? OFFSET ?;
            `;

            db.query(sql, [limit, offset], function (err2, rows) {
                if (err2) {
                    console.log(err2);
                    return res.send("Could not load appointments.");
                }

                res.render("manage-appointments", {
                    pageTitle: "Manage Appointments",
                    description: "Approve, reject, and track all patient appointments.",
                    appointments: rows,
                    currentPage: page,
                    totalPages: totalPages
                });
            });
        });
    });

    // Approve an appointment by ID
    router.post("/approve-appointment/:id", ensureAdmin, function (req, res) {
        const id = req.params.id;

        db.query(
            "UPDATE appointments SET status = 'approved' WHERE id = ?",
            [id],
            function (err) {
                if (err) {
                    console.log(err);
                }
                // Always redirect back to the manage appointments page
                res.redirect("/manage-appointments");
            }
        );
    });

    // Reject an appointment by ID
    router.post("/reject-appointment/:id", ensureAdmin, function (req, res) {
        const id = req.params.id;

        db.query(
            "UPDATE appointments SET status = 'rejected' WHERE id = ?",
            [id],
            function (err) {
                if (err) {
                    console.log(err);
                }
                res.redirect("/manage-appointments");
            }
        );
    });

    return router;
};
