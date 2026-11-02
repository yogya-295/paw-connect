# PAW CONNECT ADVANCED
## Full-Stack Pet Adoption Platform — Project Report

### 1. Abstract
Paw Connect Advanced is a responsive web application concept that connects people interested in adopting pets with available animal listings. Visitors can search and filter pets, save favourites in their browser, and submit adoption requests. The admin dashboard supports reviewing requests, changing their status and adding new listings. The project demonstrates frontend development, REST APIs, server-side validation and relational data storage.

### 2. Problem statement
Information about adoptable animals can be scattered across posts and local groups. A simple central catalogue can make it easier to discover pets and express interest. This project is an academic prototype and does not represent a real shelter or guarantee adoption.

### 3. Objectives
- Build a clean, mobile-friendly pet adoption website.
- Display pet data from a persistent database.
- Provide search, type filters, sorting and saved favourites.
- Collect adoption-interest forms and store them in a database.
- Provide an admin view for managing requests and adding pets.
- Demonstrate validation, API design and basic security practices.

### 4. Technology stack
| Layer | Technology | Purpose |
|---|---|---|
| Frontend | HTML5 | Page structure and forms |
| Styling | CSS3 | Responsive design and visual presentation |
| Browser logic | Vanilla JavaScript | Search, filters, favourites and API calls |
| Server | Node.js + Express | HTTP routes and business logic |
| Database | SQLite + better-sqlite3 | Persistent pet and request data |

### 5. Main modules
**Visitor module:** shows available pets, searches and filters listings, sorts results and stores favourites in browser localStorage.

**Adoption request module:** collects name, email, phone and message; the server validates the request, checks pet availability and stores the request with a reference ID.

**Admin module:** key-protected API routes provide summary statistics, application review, status updates and pet creation.

**Database module:** the `pets` table stores animal profiles. The `adoption_requests` table stores application details and links to pets through `pet_id`.

### 6. System workflow
1. The visitor opens the home page.
2. The frontend requests available pets from `GET /api/pets`.
3. The visitor searches, filters, sorts or saves a pet.
4. The visitor submits an adoption request.
5. The backend validates the fields and checks that the pet is available.
6. The request is inserted into SQLite and a reference number is returned.
7. The admin signs in to the local dashboard, reviews the request and updates its status.

### 7. Database design
**pets:** `id`, `name`, `type`, `age`, `location`, `description`, `image`, `status`, `created_at`.

**adoption_requests:** `id`, `pet_id`, `applicant_name`, `email`, `phone`, `message`, `status`, `created_at`.

Relationship: one pet can be referenced by multiple adoption requests. The `pet_id` foreign key references `pets.id`.

### 8. Validation and safeguards
The server trims inputs, limits field lengths, checks email and phone formats, validates image URLs for pet creation, limits JSON body size, sets basic security headers and applies a simple in-memory API rate limit. Admin endpoints require an `X-Admin-Key` header. The default admin key is for classroom demonstration only and must be changed before sharing. This project is not production-ready.

### 9. Testing plan
- Confirm home page and pet cards load.
- Search by pet name and location.
- Filter by dog, cat and rabbit; test sorting options.
- Save and unsave a pet, refresh the page and verify saved status persists.
- Submit valid and invalid adoption forms.
- Confirm a request appears in the admin dashboard.
- Change request status and verify summary counts update.
- Add a pet through the admin dashboard and refresh the main website.
- Try the admin page with an incorrect key and confirm access is denied.

### 10. Limitations
- Sample pet records and remote image URLs are used.
- Favourites are stored in one browser and are not synced to an account.
- The default admin key is a classroom demo secret, not production authentication.
- The rate limiter is in-memory and resets when the server restarts.
- Email/SMS notifications, shelter verification, real user accounts and public deployment are not included.

### 11. Future scope
- Real user accounts and role-based access.
- Secure image uploads and pet profile moderation.
- Email notifications and application tracking.
- Pagination, analytics and automated tests.
- Production-grade authentication, HTTPS, database backups and deployment.

### 12. Conclusion
Paw Connect Advanced demonstrates how a modern responsive interface can work with a server and database to support a basic pet-adoption workflow. It is suitable as an academic prototype and can be extended with stronger authentication, testing and production infrastructure.


## Version 3.0 Features
- No mandatory visitor login; browsing, adoption requests and stray reports are accessible without an account.
- Optional user profile creation.
- Indian community animal adoption listings (demo images must be replaced with accurate local photos before launch).
- Stray animal reporting with image upload, type, location, landmark, urgency and reporter contact.
- Founder dashboard to privately review reports and update statuses.
- Shelter/NGO/rescue volunteer/veterinary clinic partner registration with manual approval. Only approved partners appear in city searches.
- Adoption applications are available only in the protected founder dashboard, not to other visitors.
- SQLite persistence, Express REST APIs, input validation and basic request rate limiting.

## Limitations / Ethics
This classroom demo does not automatically notify NGOs through SMS/email, access GPS, or guarantee rescue dispatch. The founder must follow up manually. Before public deployment, implement strong admin authentication, HTTPS, upload scanning, privacy/consent notices, backup and deletion processes, and verified partner onboarding. Never rely on this demo alone for urgent animal emergencies.


## Donation transparency feature (demo)
Visitors can enter a custom donation amount and submit a donation record without creating an account. Records remain pending until the founder manually verifies payment. The founder can publish a documented animal-care expense with purpose and a receipt/proof URL; published records appear on the public transparency ledger. This demo does not process money or independently verify transactions. A production release must integrate a trusted payment gateway, server-side webhook verification, secure receipt storage, and appropriate financial/legal controls. Never mark a payment verified without checking the payment provider/bank record, and never publish private donor details.
