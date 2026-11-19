# TechBharat AI CoE - Project C2-22: Firebase Authentication Setup Guide

This guide documents the complete Firebase Authentication integration for the **TechBharat Generative AI-Powered Utility Virtual Assistant (Project C2-22)**.

---

## 1. Firebase Project Overview

- **Firebase Project Name:** C2-22 Utility Assistant
- **Firebase Project ID:** `c2-22-utility-assistant`
- **Auth Domain:** `c2-22-utility-assistant.firebaseapp.com`
- **Storage Bucket:** `c2-22-utility-assistant.firebasestorage.app`
- **Messaging Sender ID:** `1013417581459`
- **Web App ID:** `1:1013417581459:web:e9c819d68929248c1e2666`
- **Web API Key:** `AIzaSyBQYbbhvmoZgj7OZjrnf51Kis2uwngV81U`
- **Measurement ID:** `G-KN2G3DT33J`

---

## 2. Firebase Console Configuration (Manual Action Required)

To ensure full functionality, complete the following one-time steps in the [Firebase Console](https://console.firebase.google.com/project/c2-22-utility-assistant):

### A. Authentication Providers
1. In the left navigation, click **Build** > **Authentication**.
2. Click the **Sign-in method** tab.
3. Enable the following providers:
   - **Email/Password:**
     - Toggle **Email/Password** to **Enabled**.
     - (Leave "Email link (passwordless sign-in)" disabled).
     - Click **Save**.
   - **Google:**
     - Toggle **Google** to **Enabled**.
     - Choose a Project support email.
     - Click **Save**.

### B. Authorized Domains
In the **Authentication** > **Settings** > **Authorized domains** tab, verify that the following domains are listed:
- `localhost`
- `127.0.0.1`
- `c2-22-utility-assistant.firebaseapp.com`
- `c2-22-utility-assistant.web.app`

### C. Create Seeded Demo Persona Accounts in Firebase
To allow the 4 demo persona buttons on the login screen to authenticate seamlessly, create accounts for the seeded emails in the **Authentication** > **Users** tab:

| Persona Name | Seeded User ID | Role | Email | Recommended Password |
|---|---|---|---|---|
| **John Doe** (Customer) | `CUST0001` | Customer | `john.doe@example.com` | `DemoUser@2026` |
| **Priya Singh** (Employee) | `EMP0001` | Employee | `priya.singh@utilityai.org` | `DemoUser@2026` |
| **Amit Kumar** (Administrator) | `ADM0001` | Administrator | `amit.kumar@utilityai.org` | `DemoUser@2026` |
| **Priya Patel** (High-Volume Citizen) | `CUST0010` | Customer | `customer0010@example.test` | `DemoUser@2026` |

> **Tip:** In the Firebase Console, after adding each demo user, toggle their email verification status to **Verified** (or click their entry in the Users list and select "Verify email") so they can access protected endpoints immediately.

---

## 3. Frontend Environment Configuration

The frontend is built with React, Vite, and TypeScript. All Firebase configuration is injected via Vite environment variables (`VITE_*`).

### Create `frontend/.env`
Copy `frontend/.env.example` to `frontend/.env`:
```bash
cp frontend/.env.example frontend/.env
```

Set the values in `frontend/.env`:
```ini
# FastAPI Backend Base URL
VITE_API_BASE_URL=http://localhost:8000/api

# Firebase Web Application Client Configuration
VITE_FIREBASE_API_KEY=AIzaSyBQYbbhvmoZgj7OZjrnf51Kis2uwngV81U
VITE_FIREBASE_AUTH_DOMAIN=c2-22-utility-assistant.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=c2-22-utility-assistant
VITE_FIREBASE_STORAGE_BUCKET=c2-22-utility-assistant.firebasestorage.app
VITE_FIREBASE_MESSAGING_SENDER_ID=1013417581459
VITE_FIREBASE_APP_ID=1:1013417581459:web:e9c819d68929248c1e2666
VITE_FIREBASE_MEASUREMENT_ID=G-KN2G3DT33J

# Optional Demo Persona Password for 1-Click Evaluation Login
# If set, clicking a persona card automatically logs in via Firebase Auth with this password.
# If unset or authentication fails, a password prompt is displayed to the user.
VITE_DEMO_PASSWORD=DemoUser@2026
```

---

## 4. Backend Firebase Admin SDK Setup

The FastAPI backend uses the official `firebase-admin` Python SDK to cryptographically verify ID tokens transmitted via the HTTP `Authorization: Bearer <ID_TOKEN>` header.

### Generating Firebase Admin Service Account Credentials:
1. In the [Firebase Console](https://console.firebase.google.com/project/c2-22-utility-assistant), click the **Gear Icon (Project settings)** in the top-left.
2. Select the **Service accounts** tab.
3. Click the blue **Generate new private key** button.
4. Confirm by clicking **Generate key**.
5. Save the downloaded JSON file securely outside source control.
6. Rename or place it inside the `backend/` directory, for example: `backend/serviceAccountKey.json`.
   > **Note:** `.gitignore` is pre-configured to strictly ignore `*firebase-admin*.json`, `*service-account*.json`, and `serviceAccountKey.json`. Never commit private credentials to git!

### Configure Backend Environment
Copy `backend/.env.example` to `backend/.env`:
```bash
cp backend/.env.example backend/.env
```

Configure `backend/.env`:
```ini
FIREBASE_PROJECT_ID=c2-22-utility-assistant
FIREBASE_CREDENTIALS_PATH=serviceAccountKey.json

# In-Memory MongoMock is enabled by default for fast, zero-external-setup execution
USE_MOCK_MONGO=true
MONGODB_URI=mongodb://localhost:27017
MONGODB_DATABASE=utility_virtual_assistant

# AI / LLM Keys (optional for demo fallback)
OPENROUTER_API_KEY=
OPENAI_MODEL=google/gemini-2.5-flash
```

> **Fallback Mode:** Even before downloading the service account key, `firebase-admin` is initialized with `projectId="c2-22-utility-assistant"`, which allows token verification using Google's public x509 certificates. Providing the service account JSON provides full administrative capabilities (user lookups, claim modification, revoked token validation).

---

## 5. Local Development Startup

### Prerequisites:
- Python 3.10+ installed
- Node.js 18+ and npm installed

### Step 1: Start FastAPI Backend
```bash
cd backend
pip install -r requirements.txt
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```
Backend health check: `http://localhost:8000/api/health`
Interactive API documentation: `http://localhost:8000/docs`

### Step 2: Start React Frontend
```bash
cd frontend
npm install
npm run dev
```
Access the application at `http://localhost:3000` (or `http://localhost:5173`).

---

## 6. Authentication Flows & Security Architecture

### A. Email / Password Registration & Verification
- Public users can create an account using **Full Name**, **Email**, **Password**, and **Confirm Password**.
- Client-side validation enforces email format and minimum password length (6+ characters).
- Upon registration (`createUserWithEmailAndPassword`), the user's profile display name is updated.
- An email verification link is automatically sent via `sendEmailVerification`.
- **Enforcement:** If a user registers with email/password and has not verified their email (`email_verified == false`), protected backend API routes reject the request with **HTTP 403 Forbidden** (`Email not verified`).
- The UI displays an unverified warning banner with a **"Resend Verification Email"** button.

### B. Google Sign-In
- One-click Google Sign-In is executed via Firebase `signInWithPopup(auth, googleProvider)`.
- Google authenticated accounts are automatically considered email-verified by Google's OAuth provider.
- First-time Google sign-ins trigger auto-provisioning of a MongoDB profile strictly with `role="Customer"`.

### C. Seeded MongoDB User Profile Linking
When a user authenticates with Firebase:
1. The backend inspects the verified email in the Firebase token claims.
2. It searches the MongoDB `users` collection for a matching record.
3. If an existing seeded record matches (e.g., `ADM0001` Amit Kumar with `amit.kumar@utilityai.org`), the backend:
   - Associates `firebase_uid` with that existing record.
   - Preserves their assigned role (`Administrator`, `Employee`, `Customer`) and user ID (`ADM0001`, `EMP0001`, `CUST0001`, `CUST0010`).
4. If no MongoDB record exists:
   - A new user profile is created with a new `CUSTxxxx` ID.
   - The role is hardcoded to `Customer`. **The backend never accepts or trusts a role supplied by the frontend.**

### D. Zero-Bypass Demo Personas
- The login page preserves four one-click demo persona cards:
  - **John Doe** (`CUST0001` - Customer)
  - **Priya Singh** (`EMP0001` - Employee)
  - **Amit Kumar** (`ADM0001` - Administrator)
  - **Priya Patel** (`CUST0010` - High-Volume Citizen)
- Selecting a persona **authenticates directly through Firebase Authentication** using `signInWithEmailAndPassword`.
- Simulated tokens (`dev-token-*`) and automatic fallbacks to `CUST0001` have been **completely eliminated** from both backend and frontend.
- If `VITE_DEMO_PASSWORD` matches the password set in Firebase Console for that email, authentication completes in 1 click. If not set or incorrect, the UI provides a modal allowing password entry.

---

## 7. Role-Based Access Control (RBAC) Matrix

| Endpoint | Permitted Roles | Notes |
|---|---|---|
| `/api/auth/me` | Any Authenticated | Returns user profile and verification status |
| `/api/auth/verify-token` | Any Authenticated | Verifies token validity |
| `/api/chat/*` | Verified Customer, Employee, Administrator | Unverified accounts rejected with 403 |
| `/api/requests` (GET) | Verified Users | Customers only see their own requests; Employees/Admins see all |
| `/api/requests` (POST) | Verified Customer, Employee, Administrator | Creation allowed for verified users |
| `/api/complaints` (GET) | Verified Users | Scoped by role |
| `/api/operations/*` | Employee, Administrator | Customers strictly rejected with HTTP 403 |
| `/api/knowledge/internal` | Employee, Administrator | Sensitive internal SOPs hidden from Customers |
| `/api/admin/users` | Administrator Only | Customers and Employees rejected with HTTP 403 |
| `/api/admin/audit-logs` | Administrator Only | Strict audit access |

---

## 8. Running Automated Tests

### Backend Test Suite (Pytest)
```bash
python -m pytest backend/tests -v
```
Verifies:
- Unauthenticated requests receive HTTP 401.
- Invalid, expired, and simulated `dev-token-` tokens are rejected with HTTP 401.
- Unverified email/password accounts are blocked from protected services with HTTP 403.
- Google Sign-In verified accounts are admitted.
- Seeded customer, employee, and administrator accounts link correctly and preserve roles.
- Public registrations receive only the Customer role.
- RBAC boundary enforcement (Customer cannot access admin endpoints or dispatch operations).

### Frontend Test Suite (Vitest)
```bash
cd frontend
npm test -- --run
```
Verifies:
- Login page renders Sign In, Register, Forgot Password, and Google Sign-In controls.
- Demo persona cards render and trigger live authentication.
- Accessible form validation and loading states.
- Tour and tutorial overlays.

### Frontend Production Build
```bash
cd frontend
npm run build
```
Ensures TypeScript type-safety and Vite bundling without warnings or errors.

---

## 9. Security Checklist

- [x] All `.env` and `.env.local` files are ignored by git.
- [x] All service-account JSON and private key files are ignored by git.
- [x] All simulated `dev-token-` and `CUST0001` fallbacks removed.
- [x] ID token verification enforced using Firebase Admin SDK.
- [x] Roles assigned exclusively by backend/MongoDB.
- [x] Unverified email users blocked from protected functionality.
- [x] HTTP 401 returned for unauthenticated requests; HTTP 403 returned for unauthorized roles.
