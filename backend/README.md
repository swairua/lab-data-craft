# Lab Data Craft - PHP Backend

## Setup

1. **Create the database** — run the migration:
   ```bash
   mysql -u root -p < migration.sql
   ```

2. **Configure** — set environment variables or edit `config.php`:
   ```bash
   export DB_HOST=localhost
   export DB_NAME=lab_data_craft
   export DB_USER=root
   export DB_PASS=yourpassword
   ```

3. **Serve** — point your web server (Apache/Nginx) to this directory, or use PHP's built-in server:
   ```bash
   php -S localhost:8000 api.php
   ```

## API Endpoints

### Projects
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/projects` | List all projects |
| GET | `/projects/{id}` | Get project details |
| POST | `/projects` | Create project (seeds default tests) |
| PUT | `/projects/{id}` | Update project |
| DELETE | `/projects/{id}` | Delete project |

### Tests
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/tests?project_id={id}` | List tests for a project |
| GET | `/tests/{id}` | Get test with results and data |
| PUT | `/tests/{id}` | Update test status, results, and data |

### Reports
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/reports/summary?project_id={id}` | Project summary with stats |
| GET | `/reports/dashboard?project_id={id}` | Dashboard data grouped by category |

### Auth (Not Implemented — routes defined in `auth.php`)
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/auth/register` | Create user account |
| POST | `/auth/login` | Login, receive session token |
| POST | `/auth/logout` | Invalidate session |
| POST | `/auth/forgot` | Request password reset |
| POST | `/auth/reset` | Reset password with token |
| GET | `/auth/me` | Get current user info |

### Database Tables
- `users` — email, password_hash, full_name, role (admin/user/viewer)
- `password_resets` — token-based password reset with expiry
- `sessions` — server-side session tracking
- `projects` — now linked to users via `user_id` FK
- `tests`, `test_results`, `test_data` — test data storage

## Request Examples

```bash
# Create a project
curl -X POST http://localhost:8000/projects \
  -H "Content-Type: application/json" \
  -d '{"name":"Bridge Project","client":"ACME Corp"}'

# Update a test
curl -X PUT http://localhost:8000/tests/1 \
  -H "Content-Type: application/json" \
  -d '{"status":"completed","data_points":5,"key_results":[{"label":"Slump","value":"75 mm"}]}'

# Get project summary report
curl http://localhost:8000/reports/summary?project_id=1
```
