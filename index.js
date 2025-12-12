// Load environment variables from .env file
require('dotenv').config();

const express = require('express');
const path = require('path');
const session = require('express-session');
const expressSanitizer = require('express-sanitizer');
const mysql = require('mysql2');

// Import route modules
const authRoutes = require('./routes/auth.routes');
const patientRoutes = require('./routes/patient.routes');
const adminRoutes = require('./routes/admin.routes');
const appointmentRoutes = require('./routes/appointment.routes');
const searchRoutes = require('./routes/search.routes');

const app = express();

/*
   Create a MySQL connection pool.
   Using environment variables means the app can run locally or on the server
   without changing the code.
*/
const db = mysql.createPool({
    host: process.env.HEALTH_HOST,
    user: process.env.HEALTH_USER,
    password: process.env.HEALTH_PASSWORD,
    database: process.env.HEALTH_DATABASE,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

// Make the pool available everywhere in the app
global.db = db;

// Parse form data from POST requests
app.use(express.urlencoded({ extended: true }));

// Sanitize user input to reduce risk of unsafe content
app.use(expressSanitizer());

// Session setup: keeps track of logged-in users
app.use(session({
    secret: 'somerandomstuff', // session secret key
    resave: false,
    saveUninitialized: false,
    cookie: {
        expires: 600000 // session expires after 10 minutes
    }
}));

// Pass the current user into all EJS templates
app.use(function (req, res, next) {
    res.locals.currentUser = req.session.user || null;
    next();
});

// Serve static files (CSS, images, etc.) from the public folder
app.use(express.static(path.join(__dirname, 'public')));

// Configure EJS as the view engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

/*
   Public pages that anyone can access
*/
app.get('/', function (req, res) {
    res.render('home', {
        pageTitle: "Clinic Booking System",
        description: "Book your clinic appointments online with ease"
    });
});

app.get('/about', function (req, res) {
    res.render('about', {
        pageTitle: "About Our Clinic",
        description: "This system helps patients and admins manage clinic appointments"
    });
});

/*
   Route groups for different parts of the app
   Each group handles its own set of pages and logic
*/
app.use('/', authRoutes());
app.use('/', patientRoutes());
app.use('/', adminRoutes());
app.use('/', appointmentRoutes());
app.use('/', searchRoutes());

// Start the server on port 8000
const PORT = 8000;
app.listen(PORT, function () {
    console.log("Clinic app is running on http://localhost:" + PORT);
});
