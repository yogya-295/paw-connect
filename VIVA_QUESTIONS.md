# Paw Connect Advanced — Viva Questions & Answers

## Project basics

**1. What is Paw Connect?**  
A full-stack pet adoption web application that helps visitors browse pets and submit adoption requests.

**2. What technologies did you use?**  
HTML, CSS and JavaScript for the frontend; Node.js and Express for the backend; SQLite for persistent storage.

**3. What is full-stack development?**  
Building both the client-facing frontend and the server/database parts of an application.

**4. What is an API?**  
An interface that lets different parts of software communicate. The browser calls REST API endpoints to retrieve pets and submit adoption requests.

## Frontend

**5. How does search work?**  
The search field sends a query to `/api/pets`; the backend filters by name, location and description.

**6. What is localStorage used for?**  
The browser saves the visitor's favourite pet IDs so saved pets remain after a refresh. It is device/browser-specific, not a user account.

**7. How is the layout responsive?**  
CSS Grid, Flexbox and media queries adapt the layout to different screen sizes.

## Backend and database

**8. What is Node.js?**  
A JavaScript runtime that lets JavaScript run on the server.

**9. What is Express?**  
A Node.js framework used for HTTP routes, middleware and API responses.

**10. Why SQLite?**  
It stores data in a local database file and is simple to set up for a college project.

**11. What tables are used?**  
`pets` stores animal listings; `adoption_requests` stores applicant details and request status. `pet_id` links each request to a pet.

**12. What is a foreign key?**  
A constraint that links a row in one table to a related row in another table. It helps maintain referential integrity.

**13. What is CRUD?**  
Create, Read, Update and Delete. This project creates pet listings and adoption requests, reads pets/requests, and updates request statuses. A delete operation is not exposed in the demo UI.

**14. How is form data validated?**  
Both browser input types and server-side checks validate required fields, email format, phone length and input lengths. Server validation is essential because clients can be bypassed.

## Admin and safety

**15. How does the admin dashboard work?**  
The admin enters a key. Requests to protected admin APIs include it in the `X-Admin-Key` header. The dashboard can review applications, update statuses and add pets.

**16. Is the demo admin key production-secure?**  
No. It is a classroom demonstration. A real deployment needs a proper user/password system, hashed credentials, sessions, HTTPS, audit logging and secrets stored outside source code.

**17. What is rate limiting?**  
Restricting how many requests a client can make in a time window to reduce accidental overload or abuse. This demo uses a basic in-memory implementation.

**18. What are HTTP status codes?**  
They describe the result of a request, such as 200 for success, 201 for a created resource, 400 for invalid input, 401 for unauthorised access, 404 for missing resources and 429 for too many requests.

## Demonstration

**19. How do you run the project?**  
Run `npm install`, then `npm start`, then open `http://localhost:3000`.

**20. How would you improve it further?**  
Add real user accounts, email notifications, image uploads, pagination, tests, deployment automation, stronger authentication and a production database/backup strategy.


## Version 3.0 viva questions

**Q: Is login required to use Paw Connect?**
A: No. Visitors can browse listings, report a stray animal and send adoption requests without logging in. Profile creation is optional.

**Q: How can someone report an injured stray animal?**
A: They upload a JPG/PNG/WEBP photo, select animal type, add location and details, and provide contact information. The report is saved in SQLite for founder review.

**Q: Who can see adoption applications and rescue reports?**
A: In this demo, they are available only through the key-protected founder/admin dashboard. They are not exposed in public APIs.

**Q: How do NGOs and shelters join?**
A: They submit their organisation, contact, city, address and services. The founder reviews the submission; only approved partners appear in the public city search.

**Q: Does it automatically call an NGO or send an SMS?**
A: Not in this version. The dashboard stores the report so the founder can contact the reporter or a verified partner manually. Automated notifications are future work.

**Q: What does the profile feature do?**
A: It saves a separate optional profile with name, email, phone, city and a short bio. It is not a login/authentication system, and it is not required to use the platform.


## Donation transparency
**Q: How does Paw Connect handle donations?**
A: The demo stores custom-amount donation records as pending. The founder verifies actual payment externally, then can publish an animal-care expense with purpose and proof URL. The public ledger displays only published expenses, not donor contact details.

**Q: Does the current demo process real payments?**
A: No. It is a tracking and transparency prototype. A production version needs a payment gateway and server-side webhook verification.
