
# Clinic Appointment Booking System

This project is a clinic appointment booking system built using Node.js, Express, EJS, and MySQL.  
It allows patients to book clinic appointments online and enables clinic administrators to create appointment slots, manage bookings, approve or reject requests, and search appointments.

The system is designed to run both on a local machine and on the Goldsmiths virtual server without changing the core code.

---

## Overview

The application supports two types of users: patients and clinic administrators.

Patients can register, log in, view available appointment slots, book appointments, and track the status of their bookings.  
Administrators can log in using predefined credentials, create appointment slots across date ranges, manage slots, approve or reject appointments, and search through patient bookings.

All data is stored in a MySQL database, and access to pages is controlled using sessions and role-based access checks.

---

## Technology Stack

- Node.js  
- Express  
- EJS (server-side templates)  
- MySQL  
- express-session for session handling  
- bcrypt for password hashing  

No additional frameworks such as React or Angular are used.

---

## Running the Application Locally

Clone the repository and install the dependencies using npm.  
Once dependencies are installed, the database can be created and populated using the provided SQL scripts.

The local `.env` file should contain the following:

```env
HEALTH_HOST=localhost
HEALTH_USER=health_app
HEALTH_PASSWORD=qwertyuiop
HEALTH_DATABASE=health
HEALTH_BASE_PATH=http://localhost:8000
````

After the database is set up and environment variables are configured, start the application with:

```bash
node index.js
```

The application will be available at:

```
http://localhost:8000
```

---

## Running the Application on the Goldsmiths Virtual Server

The same repository can be cloned onto the Goldsmiths virtual server and dependencies installed using npm.

The database is created in the same way by running:

```sql
source create_db.sql;
source insert_test_data.sql;
```

On the virtual server, the `.env` file must be updated so that the base path matches the user directory:

```env
HEALTH_HOST=localhost
HEALTH_USER=health_app
HEALTH_PASSWORD=qwertyuiop
HEALTH_DATABASE=health
HEALTH_BASE_PATH=https:/usr/350
```


The application is then started with:

```bash
node index.js
```

and accessed via:

```
https://www.doc.gold.ac.uk/usr/350/
```

---

## Login Details

An administrator account is created using the test data script.

**Admin login:**

* Username: `gold`
* Password: `smiths`

Patients must register through the registration page before logging in.
Patients always log in using their email address and password.

---

## Deployment Note

During deployment to the Goldsmiths virtual server, redirects such as `/admin` and `/patient` initially pointed to incorrect paths (for example `/admin` instead of `/usr/350/admin`).

This was resolved by introducing a configurable base path using the `HEALTH_BASE_PATH` environment variable.
By updating this variable in the `.env` file, the same codebase works correctly both locally and on the hosted server.

```

---