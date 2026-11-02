# Paw Connect 3.0 — Indian Community Animal Rescue & Adoption

A full-stack college project focused on Indian indie dogs, street cats and community-animal rescue. Visitors do **not** need to log in to browse pets, report an animal, or send an adoption request. Creating a personal profile is optional.

## Requirements
- Node.js 22 LTS recommended
- npm

## Run locally
1. Open this folder in VS Code.
2. Open Terminal → New Terminal.
3. Run `npm install`.
4. Run `npm start`.
5. Open `http://localhost:3000`. Keep the terminal running.
6. Founder/admin dashboard: `http://localhost:3000/admin`.

Set the ⁠ ADMIN_KEY ⁠ environment variable to a strong, private secret before starting the server. Never publish or share the admin key.

## Main features
- Indian indie/community animal adoption listings with search, filters and favourites.
- Adoption requests saved in SQLite and visible only in the key-protected founder dashboard.
- Stray animal report with photo upload (JPG/PNG/WEBP, max 5 MB), type, location, landmark, urgency and reporter contact.
- Founder dashboard to review private reports and update their status.
- Shelter/NGO/rescue volunteer/veterinary partner submission. Submissions remain pending until founder approval.
- Public city search shows only approved partners.
- Optional profile creation; not required for any main feature.
- SQLite database, REST API, validation and basic rate limiting.

## Data and privacy notes
- The SQLite database (`pawconnect.db`) and uploaded photos (`uploads/`) are created locally when the server runs. Back them up before moving the project.
- Adoption requests, reporter contacts and partner applications are private to the founder dashboard in this demo.
- This is a student/demo build, not a production rescue dispatch service. It does not automatically contact an NGO, send SMS/email, determine GPS location, or guarantee a rescue response. The founder must follow up manually.
- Never approach an injured/aggressive animal alone. For urgent cases, contact local municipal animal control, a verified NGO, or a veterinarian directly.
- Demo pet photos are illustrative placeholders; replace them with consented, accurate photos of local Indian community animals before a real launch.

## Important production work still needed
Use proper admin authentication and sessions, HTTPS, CSRF protection, robust upload scanning, backups, consent/privacy policy, deletion/export requests, verified shelter onboarding and real email/SMS notifications before collecting real personal data publicly. The demo admin key should be changed.


### Donation feature note
The donation form currently creates a pending donation record only; it does not take payment. In the founder dashboard, verify a record only after confirming the actual transaction. Publish a proof URL only after checking the receipt. For real public donations, integrate a payment provider (for example Razorpay) with signed webhook verification before accepting/confirming payments. Do not treat a typed reference number as proof of payment.
