# TableTalk — Restaurant Ratings & Reviews

TableTalk is a full-stack restaurant discovery and review platform. The React client talks to a Node.js/Express API; MongoDB stores users, restaurants, and reviews.

## Features

- Customer registration and login with JWT; passwords are hashed with bcrypt.
- Restaurant discovery with backend search by name, location, and cuisine.
- One review per customer per restaurant, enforced by a MongoDB compound unique index. Customers can update or delete their own review.
- Restaurant owners can update only their assigned listing and view guest reviews and customer contact details.
- Administrators can manage accounts, listings, ownership assignments, and reviews.
- Admin dashboard metrics and restaurant rating breakdowns are calculated with MongoDB aggregation.
- Server-side validation, role checks, security headers, authentication rate limiting, and meaningful HTTP errors.

## Data model

- **User**: name, unique normalized email, bcrypt password hash, role (`administrator`, `customer`, `owner`).
- **Restaurant**: name, location, address, cuisine, description, phone, and optional `owner` reference to a User.
- **Review**: `customer` and `restaurant` ObjectId references, integer rating (1–5), review content, timestamps. A unique `{ customer, restaurant }` index guarantees one review per customer/restaurant pair.

## Requirements

- Node.js 20+ and npm
- MongoDB 6+ (local or hosted)

## Run locally

1. Configure MongoDB and the API:

   ```powershell
   cd server
   Copy-Item .env.example .env
   # Edit .env and set MONGODB_URI and a long random JWT_SECRET.
   npm install
   npm run seed
   npm run dev
   ```

2. In a second terminal, start the React app:

   ```powershell
   cd client
   npm install
   npm run dev
   ```

   Open the Vite URL (normally `http://localhost:5173`). The API listens on `http://localhost:5000`; `GET /api/health` is its health check.

   To use another API address, set `VITE_API_URL` in `client/.env` (for example `VITE_API_URL=http://localhost:5000/api`).

3. Optional: import [`postman/TableTalk.postman_collection.json`](postman/TableTalk.postman_collection.json) into Postman. Set `baseUrl` to `http://localhost:5000/api`, then use the login requests and copy the returned token to the corresponding collection variable.

The seed command creates its sample accounts only when they are absent, plus one restaurant assigned to the sample owner. Default local credentials:

| Role | Email | Password |
|---|---|---|
| Administrator | `admin@example.com` | `Admin123!` |
| Customer | `customer@example.com` | `Customer123!` |
| Restaurant owner | `owner@example.com` | `Owner123!` |

These are **development-only** credentials. Change them or use `SEED_ADMIN_PASSWORD`, `SEED_OWNER_PASSWORD`, and `SEED_CUSTOMER_PASSWORD` before seeding in a production environment. Production seeding refuses to run without those explicit password variables. Never deploy with the sample credentials or a checked-in `.env`.

## API overview

All endpoints are prefixed with `/api`.

| Method | Path | Access | Purpose |
|---|---|---|---|
| POST | `/auth/register` | Public | Register a customer |
| POST | `/auth/login` | Public | Login; returns JWT and user |
| GET | `/auth/me` | Authenticated | Current account |
| GET | `/restaurants?search=&location=&cuisine=` | Public / optional JWT | Search and browse with computed ratings and the current customer's rating |
| GET | `/restaurants/:id` | Public / optional JWT | Restaurant, reviews, and current customer's review |
| GET | `/restaurants/:id/distribution` | Public | 1–5 star counts using aggregation |
| POST | `/reviews/restaurants/:restaurantId/reviews` | Customer | Submit a review |
| PATCH | `/reviews/:id` | Review owner | Update own review |
| DELETE | `/reviews/:id` | Review owner or administrator | Delete a review |
| GET, PATCH | `/owner/restaurant` | Restaurant owner | Read assigned listing, guests, ratings; update permitted fields |
| GET | `/admin/dashboard` | Administrator | Platform totals and average rating |
| GET, POST | `/admin/users`, `/admin/owners` | Administrator | Search users and create owner accounts |
| PATCH, DELETE | `/admin/users/:id` | Administrator | Update or remove an account |
| GET, POST | `/admin/restaurants` | Administrator | Search/list or create restaurants |
| PATCH, DELETE | `/admin/restaurants/:id` | Administrator | Update details/owner assignment or delete listing |
| GET | `/admin/reviews` | Administrator | Browse reviews |

Protected endpoints require `Authorization: Bearer <JWT>`. Passwords must be 8–16 characters and include an uppercase letter, a lowercase letter, a number, and a special character. Ratings must be whole numbers from 1 through 5.

## Configuration

See [`server/.env.example`](server/.env.example). `CLIENT_ORIGIN` should be set to the deployed client origin. Never commit `.env` files.

## Production notes

- Create the first administrator through the seed script or a controlled provisioning process; public registration always creates a customer.
- Use a unique, high-entropy `JWT_SECRET`, HTTPS, a restricted `CLIENT_ORIGIN`, and non-sample seed credentials.
- The application intentionally has no mock restaurant data in the UI; the seed script inserts sample records into MongoDB for local evaluation.
