const express = require("express");

module.exports = function () {
    const router = express.Router();
    const basePath = process.env.HEALTH_BASE_PATH || "";

    function ensureAdmin(req, res, next) {
        if (!req.session.user || req.session.user.role !== "admin") {
            return res.redirect(basePath + "/login");
        }
        next();
    }

    // Show search page (full list)
    router.get("/search", ensureAdmin, function (req, res) {
        const sql = `
            SELECT 
                a.id,
                u.full_name AS fullName,
                CONCAT(s.slot_date, ' ', s.start_time, ' - ', s.end_time) AS slotLabel,
                a.status
            FROM appointments a
            JOIN users u ON a.user_id = u.id
            JOIN slots s ON a.slot_id = s.id
            ORDER BY a.id DESC
        `;

        db.query(sql, function (err, rows) {
            if (err) {
                console.log(err);
                return res.send("Error loading appointments.");
            }

            res.render("search", {
                pageTitle: "Search Appointments",
                appointments: rows
            });
        });
    });

    // Handle search form
    router.post("/search", ensureAdmin, function (req, res) {
        const searchTerm = req.sanitize(req.body.searchTerm);

        const searchSql = `
            SELECT 
                a.id,
                u.full_name AS fullName,
                CONCAT(s.slot_date, ' ', s.start_time, ' - ', s.end_time) AS slotLabel,
                a.status
            FROM appointments a
            JOIN users u ON a.user_id = u.id
            JOIN slots s ON a.slot_id = s.id
            WHERE u.full_name LIKE ?
            ORDER BY a.id DESC
        `;

        const allSql = `
            SELECT 
                a.id,
                u.full_name AS fullName,
                CONCAT(s.slot_date, ' ', s.start_time, ' - ', s.end_time) AS slotLabel,
                a.status
            FROM appointments a
            JOIN users u ON a.user_id = u.id
            JOIN slots s ON a.slot_id = s.id
            ORDER BY a.id DESC
        `;

        db.query(searchSql, [`%${searchTerm}%`], function (err, results) {
            if (err) {
                console.log(err);
                return res.send("Error searching appointments.");
            }

            db.query(allSql, function (err2, allRows) {
                if (err2) {
                    console.log(err2);
                    return res.send("Error loading appointments.");
                }

                res.render("search", {
                    pageTitle: "Search Appointments",
                    results: results,
                    searchedTerm: searchTerm,
                    appointments: allRows
                });
            });
        });
    });

    return router;
};
