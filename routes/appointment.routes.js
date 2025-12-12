const express = require("express");

module.exports = function () {
    const router = express.Router();
    const basePath = process.env.HEALTH_BASE_PATH || "";

    // Check admin role
    function ensureAdmin(req, res, next) {
        if (!req.session.user || req.session.user.role !== "admin") {
            return res.redirect("/login");
        }
        next();
    }

    // Paginated appointment list
    router.get("/manage-appointments", ensureAdmin, function (req, res) {
        let page = parseInt(req.query.page) || 1;
        let limit = 3;
        let offset = (page - 1) * limit;

        db.query("SELECT COUNT(*) AS total FROM appointments", function (err, countRows) {
            if (err) {
                console.log(err);
                return res.send("Could not load appointments.");
            }

            let total = countRows[0].total;
            let totalPages = Math.ceil(total / limit);

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
                ORDER BY a.id DESC
                LIMIT ? OFFSET ?
            `;

            db.query(sql, [limit, offset], function (err2, rows) {
                if (err2) {
                    console.log(err2);
                    return res.send("Could not load appointments.");
                }

                res.render("manage-appointments", {
                    pageTitle: "Manage Appointments",
                    description: "Approve, reject, and track patient appointments",
                    appointments: rows,
                    currentPage: page,
                    totalPages: totalPages
                });
            });
        });
    });

    // Approve
    router.post("/approve-appointment/:id", ensureAdmin, function (req, res) {
        db.query(
            "UPDATE appointments SET status = 'approved' WHERE id = ?",
            [req.params.id],
            function () {
                return res.redirect(basePath + "/manage-appointments");
            }
        );
    });

    // Reject
    router.post("/reject-appointment/:id", ensureAdmin, function (req, res) {
        db.query(
            "UPDATE appointments SET status = 'rejected' WHERE id = ?",
            [req.params.id],
            function () {
                return res.redirect(basePath + "/manage-appointments");
            }
        );
    });

    return router;
};
