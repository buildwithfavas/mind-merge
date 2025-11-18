# LinkedIn Boost

Simple app where users sign in with Google (Firebase), submit LinkedIn post URLs, see a shared feed, and mark items as done once they like/comment on LinkedIn.

## Stack
- Frontend: React (Vite) + TailwindCSS
- Backend: Node.js + Express
- Auth: Firebase (client) + Firebase Admin (server)
- Database: MongoDB (Mongoose)

## Setup

### 1) Firebase
- Create a Firebase project
- Enable Google Sign-In in Authentication
- Create a Service Account and obtain credentials (project id, client email, private key)

### 2) Server
- Copy `server/.env.example` to `server/.env` and fill values
- Install deps and run dev:
```bash
npm install
npm run dev
```
(run the above in the `server` folder)

### 3) Client
- Copy `client/.env.example` to `client/.env` and fill values (VITE_FIREBASE_*)
- Install deps and run dev:
```bash
npm install
npm run dev
```
(run the above in the `client` folder)

### Notes
- The client expects `VITE_API_URL` to point to the server (default `http://localhost:4000/api`).
- The server allows CORS from `http://localhost:5173` by default (configure via `ALLOWED_ORIGIN`).
