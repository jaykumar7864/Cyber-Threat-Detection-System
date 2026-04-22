# Cyber Threat Detection Backend (Final Professional)

## Setup
1. Copy `.env.example` to `.env` and update values.
2. Install deps:
   npm install
3. Run:
   npm start

## Endpoints
- POST /api/auth/register
- POST /api/auth/verify-registration-otp
- POST /api/auth/resend-registration-otp
- POST /api/auth/login
- POST /api/auth/forgot-password/request-otp
- POST /api/auth/forgot-password/reset
- GET  /api/auth/me
- GET  /api/complaints/all            (admin)
- PATCH /api/complaints/:id/admin     (admin)
- POST /api/detect         (optional auth)
- GET  /api/history/me     (auth)
- GET  /api/history/public (no auth)
- POST /api/complaints     (auth)
- GET  /api/complaints/me  (auth)
