# Hospital Management System (HMS)

Full-stack HMS built with **React.js, Laravel 12, PHP 8.2+, and MySQL**.

Features: Sanctum token authentication, role-based authorization (Admin / Doctor / Receptionist / Patient) with dedicated dashboards, and CRUD modules for Patients, Doctors, Appointments, Admissions, Medical Records, Prescriptions, Billing, and User Management — following Laravel MVC architecture.

## Structure

```
hms/
├── backend/    Laravel REST API
└── frontend/   React (Vite) SPA
```

## Requirements

- PHP >= 8.2, Composer
- Node.js >= 18, npm
- MySQL >= 8.0

## Backend setup

```bash
cd backend
composer install
cp .env.example .env
php artisan key:generate

# Create the database, then update DB_* in .env
mysql -u root -p -e "CREATE DATABASE hms"

php artisan migrate --seed
php artisan serve        # http://localhost:8000
```

## Frontend setup

```bash
cd frontend
npm install
npm run dev              # http://localhost:5173
```

The frontend targets `http://localhost:8000/api` by default; override with a `.env` file containing `VITE_API_URL`.

## Razorpay appointment payments

Patient bookings use Razorpay Standard Checkout. Add test or live credentials to `backend/.env` (never commit them):

```env
RAZORPAY_KEY_ID=rzp_test_xxxxxxxxxx
RAZORPAY_KEY_SECRET=your_secret
RAZORPAY_WEBHOOK_SECRET=your_webhook_secret
```

In Razorpay, enable automatic capture and register this webhook endpoint with the `payment.captured` event:

```text
https://your-api-domain.example/api/payments/razorpay/webhook
```

Set `APP_URL` to the public backend URL so signed PDF links in receipt emails work. Configure `MAIL_*` in `backend/.env` with your SMTP provider; local development defaults to the Laravel log mailer. Then run `php artisan migrate` and `php artisan config:clear`.

The server creates the Razorpay order, verifies the checkout signature and captured amount, confirms the appointment, generates a PDF receipt, and emails it to the patient. Unpaid slot reservations expire after 15 minutes.

## Demo accounts (password: `password`)

| Role         | Email               |
|--------------|---------------------|
| Admin        | admin@hms.test      |
| Doctor       | anil@hms.test       |
| Receptionist | reception@hms.test  |
| Patient      | patient@hms.test    |

New patients can also self-register from the login page.

## Role capabilities

- **Admin** — everything: users, doctors, patients, appointments, admissions, records, prescriptions, billing.
- **Receptionist** — patients, appointment scheduling, admissions/discharge, billing & payments.
- **Doctor** — own appointments (confirm/complete), patients, medical records, prescriptions, weekly availability.
- **Patient** — book/cancel own appointments, view own records, prescriptions, and bills.

## Key API endpoints

```
POST /api/auth/register | /api/auth/login | /api/auth/logout
GET  /api/auth/me
GET  /api/dashboard/stats                     (role-specific)
CRUD /api/patients /api/doctors /api/appointments /api/admissions
CRUD /api/medical-records /api/prescriptions /api/bills /api/users
PUT  /api/doctors/{id}/availability
POST /api/admissions/{id}/discharge
POST /api/bills/{id}/pay | /api/bills/{id}/cancel
POST /api/appointment-payments/order
POST /api/appointment-payments/{id}/verify | /api/appointment-payments/{id}/cancel
POST /api/payments/razorpay/webhook
```

Business rules enforced server-side: appointment slots validated against doctor availability and double-booking; one active admission per patient; bed occupancy check; bill totals computed from line items; payment tracking with partial payments.
"# hospital-management-system" 
"# Hospital_Management_System" 
"# Hospital_Management_System" 
