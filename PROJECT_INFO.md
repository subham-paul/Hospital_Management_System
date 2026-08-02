# Hospital Management System (HMS)

## Project Overview
Hospital Management System is a full-stack web application for managing hospital operations such as patient registration, doctor management, appointments, admissions, medical records, prescriptions, and billing.

## Project Type
- Backend: Laravel 11 REST API
- Frontend: React + Vite SPA
- Database: MySQL
- Authentication: Laravel Sanctum

## Main Features
- User authentication and role-based access control
- Admin, Doctor, Receptionist, and Patient roles
- Patient and doctor management
- Appointment scheduling and validation
- Admission and discharge management
- Medical records and prescriptions
- Billing and payment tracking
- Dashboard statistics for role-based insights

## Project Structure
- backend/: Laravel API and database logic
- frontend/: React application UI
- README.md: setup and usage guide

## Requirements
### Backend
- PHP 8.2 or higher
- Composer
- MySQL 8.0 or higher

### Frontend
- Node.js 18 or higher
- npm

## Environment Requirements
- A MySQL database for the application
- Laravel environment file configured with database credentials
- Frontend API base URL configured for the backend

## Quick Setup
### Backend
```bash
cd backend
composer install
cp .env.example .env
php artisan key:generate
php artisan migrate --seed
php artisan serve
```

### Frontend
```bash
cd frontend
npm install
npm run dev
```

## Notes
- Backend API is expected to run on http://localhost:8000
- Frontend dev server runs on http://localhost:5173
- The frontend uses VITE_API_URL for API endpoint configuration
