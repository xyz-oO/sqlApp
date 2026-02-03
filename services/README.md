# Backend (Flask)

Simple session API for the login UI with user management functionality.

## Setup

```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

## Run

```bash
python app.py
```

Default port: `5001`.

## API

- `POST /api/login`
  - body: `{ "username": "...", "password": "..." }`
  - returns: `{ "sessionId": "..." }`
- `POST /api/logout`
  - header: `X-Session-Id` or body `{ "sessionId": "..." }`
  - returns: `{ "ok": true }`
- `GET /api/session`
  - header: `X-Session-Id`
  - returns: `{ "sessionId": "...", "username": "..." }`

## User Management

### User Configuration

User accounts are managed through the `user.config.json` file located in the services directory. This file contains an array of user objects with the following structure:

```json
{
  "users": [
    {
      "username": "user1",
      "md5": "779110cd8112e9f6339748b2077270b6",
      "status": 0
    }
  ]
}
```

- `username`: Unique identifier for the user
- `md5`: MD5 hash of the password combined with a secret key
- `status`: User status (0 = active, 1 = disabled)

### User Profiles

Each user has their own profile directory stored in the `services/users/` folder, named after their username. This directory contains two configuration files:

#### 1. Database Configurations (`dbconfig.json`)

Stores database connection settings for the user:

```json
[
  {
    "host": "localhost",
    "port": 3306,
    "database": "example_db",
    "user": "db_user",
    "password": "db_password"
  }
]
```

#### 2. SQL Configurations (`sqlconfig.json`)

Stores saved SQL queries for the user:

```json
[
  {
    "id": "uuid",
    "menu_name": "Query Name",
    "sql": "SELECT * FROM table",
    "dbname": "example_db",
    "created_at": "2026-02-02T12:00:00Z"
  }
]
```

### User Management API Endpoints

- `GET /api/users` - Get all users
- `POST /api/users` - Create a new user
- `POST /api/users/<username>/password` - Update user password
- `POST /api/users/<username>/status` - Update user status

### Database Configuration API Endpoints

- `GET /api/db/config` - Get user's database configurations
- `POST /api/db/config` - Save/update database configuration
- `DELETE /api/db/config` - Delete database configuration

### SQL Configuration API Endpoints

- `GET /api/sql/config` - Get user's SQL configurations
- `POST /api/sql/config` - Save new SQL configuration
- `GET /api/sql/config/<config_id>` - Get specific SQL configuration
- `PUT /api/sql/config/<config_id>` - Update SQL configuration
- `DELETE /api/sql/config/<config_id>` - Delete SQL configuration

## Security Notes

- Passwords are stored as MD5 hashes combined with a secret key (`USER_SECRET` in app.py)
- User sessions are managed with JWT tokens
- Database credentials are stored in plain text in user profile directories
- For production environments, consider using more secure password hashing and credential storage methods

