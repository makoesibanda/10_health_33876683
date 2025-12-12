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

  // Show search page with all appointments listed
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

    db.query(sql, function (err, allRows) {
      if (err) {
        console.log(err);
        return res.send("Error loading appointments.");
      }

      res.render("search", {
        pageTitle: "Search Appointments",
        appointments: allRows
      });
    });
  });

  // Handle search form submission
  router.post("/search", ensureAdmin, function (req, res) {
    const searchTerm = req.sanitize(req.body.searchTerm);

    // Query for matching patient names
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

    // Query for all appointments (used to display full list alongside search results)
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

    // Run targeted search first
    db.query(searchSql, [`%${searchTerm}%`], function (err, searchResults) {
      if (err) {
        console.log(err);
        return res.send("Error searching appointments.");
      }

      // Then fetch all appointments for context
      db.query(allSql, function (err2, allRows) {
        if (err2) {
          console.log(err2);
          return res.send("Error loading appointments.");
        }

        res.render("search", {
          pageTitle: "Search Appointments",
          results: searchResults,   // filtered results
          searchedTerm: searchTerm, // term entered by user
          appointments: allRows     // full list for reference
        });
      });
    });
  });

  return router;
};
