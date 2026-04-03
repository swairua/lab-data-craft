# Lab Data Craft - Backend Migration Guide

## Overview

This migration implements session-based authentication and full backend integration for the Lab Data Craft application. Users can now register, log in, and have their Atterberg testing data synchronized with a MySQL backend.

## Database Setup

### 1. Update Your Database Schema

Run the SQL migration script to create the new authentication tables and add `user_id` columns to existing tables:

```bash
# Using MySQL CLI
mysql -h your-db-host -u your-db-user -p lab_data_craft < migration.sql

# Or with a database management tool:
# 1. Open the SQL migration file
# 2. Copy the entire content
# 3. Execute it in your MySQL client
```

### Key Schema Changes:
- **New `users` table**: Stores user accounts with email, password hash, and name
- **New `sessions` table**: Maintains server-side session data for persistence
- **Updated `projects` table**: Added `user_id` FK and index
- **Updated `test_results` table**: Added `user_id` FK and index

All changes use foreign keys to maintain data integrity.

## Backend Configuration

### 1. Environment Variables

Create a `.env` file in your project root with database credentials:

```bash
# Database Configuration
DB_HOST=127.0.0.1
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=lab_data_craft
DB_PORT=3306
```

The backend API is served from the root `api.php` file and uses the database credentials configured directly in that file.

### 2. Backend API Features

#### Authentication Endpoints

All endpoints use JSON for request/response bodies and support credentials.

**POST /api.php?action=register**
```json
Request: { "email": "user@example.com", "password": "secure123", "name": "John Doe" }
Response (201): { "message": "...", "user_id": 1, "user": { "id": 1, "email": "...", "name": "..." } }
```

**POST /api.php?action=login**
```json
Request: { "email": "user@example.com", "password": "secure123" }
Response (200): { "message": "...", "user_id": 1, "user": { "id": 1, "email": "...", "name": "..." } }
```

**POST /api.php?action=logout**
```json
Response (200): { "message": "Logged out successfully" }
```

**GET /api.php?action=me**
```json
Response (200): { "user": { "id": 1, "email": "...", "name": "..." }, "authenticated": true }
Response (401): { "user": null, "authenticated": false }
```

#### CRUD Operations

All CRUD operations now require authentication. Add your data to the request body:

**POST /api.php?table=projects&action=create**
```json
Request: { "name": "Project A", "client_name": "Client X" }
Response: { "message": "Record created", "id": 1, "data": { "id": 1, ... } }
```

**GET /api.php?table=projects&action=list**
```json
Response: { "table": "projects", "data": [...], "limit": 100, "offset": 0 }
```

**GET /api.php?table=projects&id=1**
```json
Response: { "table": "projects", "data": { "id": 1, ... } }
```

**PATCH /api.php?table=projects&id=1&action=update**
```json
Request: { "name": "Updated Name" }
Response: { "message": "Record updated", "data": { "id": 1, ... } }
```

**DELETE /api.php?table=projects&id=1**
```json
Response: { "message": "Record deleted", "deleted": true }
```

### 3. Security Features

✅ **Session Security**
- HTTP-only cookies prevent XSS attacks
- SameSite=Lax prevents CSRF attacks
- Secure flag on HTTPS connections
- 30-day sliding session expiration

✅ **Password Security**
- bcrypt hashing (password_hash/password_verify)
- Constant-time comparison prevents timing attacks

✅ **Data Ownership**
- All CRUD operations automatically filtered by `user_id`
- Update/delete validate ownership before proceeding
- Users cannot access other users' data

## Frontend Setup

### 1. Environment Variables

Create a `.env` file (or copy from `.env.example`):

```bash
VITE_API_URL=http://localhost:8000/api.php
```

### 2. Integration Components

The frontend now includes:

#### `src/lib/api.ts`
- `ApiClient` class for all backend communication
- Handles authentication, CRUD operations
- Automatic request/response handling
- Credential-included fetch requests

#### `src/hooks/useApi.ts`
- React hook for authentication state
- `login()`, `register()`, `logout()` methods
- Auto-checks auth status on mount
- User state and loading management

#### `src/hooks/useAtterbergSync.ts`
- Syncs Atterberg test data to backend
- Maintains localStorage cache for offline use
- Debounced auto-sync (5 second idle)
- Sync status tracking

#### `src/components/auth/`
- `AuthDialog`: Login/register modal
- `AuthStatus`: User dropdown with logout

### 3. Using Auth in Your App

```tsx
import { useApi } from '@/hooks/useApi';

export function MyComponent() {
  const { user, isAuthenticated, login, logout } = useApi();

  return (
    <>
      {isAuthenticated ? (
        <>
          <p>Welcome, {user?.name}</p>
          <button onClick={logout}>Logout</button>
        </>
      ) : (
        <button onClick={() => /* show login modal */}>Sign In</button>
      )}
    </>
  );
}
```

### 4. Using Data Sync

```tsx
import { useAtterbergSync } from '@/hooks/useAtterbergSync';
import { useApi } from '@/hooks/useApi';

export function AtterbergComponent() {
  const { api } = useApi();
  const { syncToBackend, loadFromBackend } = useAtterbergSync(api);

  const handleSync = async () => {
    await syncToBackend(projectId, projectData);
  };

  const handleLoad = async () => {
    const data = await loadFromBackend(projectId);
    setProjectState(data);
  };

  return (
    <>
      <button onClick={handleSync}>Save to Server</button>
      <button onClick={handleLoad}>Load from Server</button>
    </>
  );
}
```

## Testing the Integration

### 1. Register a New User

```bash
curl -X POST http://localhost:8000/api.php?action=register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"test123","name":"Test User"}'
```

### 2. Login

```bash
curl -X POST http://localhost:8000/api.php?action=login \
  -H "Content-Type: application/json" \
  -c cookies.txt \
  -d '{"email":"test@example.com","password":"test123"}'
```

### 3. Get Current User

```bash
curl http://localhost:8000/api.php?action=me \
  -b cookies.txt
```

### 4. Create a Project

```bash
curl -X POST http://localhost:8000/api.php?table=projects&action=create \
  -H "Content-Type: application/json" \
  -b cookies.txt \
  -d '{"name":"My Project","client_name":"ACME Inc"}'
```

## Multi-User Scenarios

### Scenario 1: User Isolation
- User A creates a project
- User B logs in and cannot see User A's project
- User B creates their own project
- Each user only sees their own data

### Scenario 2: Offline Cache
- User logs in and loads projects
- Projects stored in localStorage
- User goes offline, can still edit in UI
- User comes back online, auto-syncs changes
- If sync fails, browser cache preserved

### Scenario 3: Session Management
- User logs in (session created in DB)
- User closes browser (session remains in DB)
- User returns and refreshes page
- Session is validated and user stays logged in
- 30 days of inactivity = session expires

## Troubleshooting

### "Unauthorized" Errors
- Check that user is logged in: `GET /api.php?action=me`
- Verify session is valid in `sessions` table
- Ensure credentials include cookies: `credentials: 'include'`

### CORS Errors
- Backend sets `Access-Control-Allow-Credentials: true`
- Ensure frontend uses `credentials: 'include'` in fetch
- Check `Access-Control-Allow-Origin` matches frontend origin

### Data Not Syncing
- Check browser localStorage for cache
- Verify `projectId` is set in project state
- Check backend logs for errors
- Ensure user owns the project being updated

### Password Issues
- Passwords are hashed with `password_hash()` (bcrypt)
- Use `password_verify()` for checking
- Never compare password hashes directly

## Fallback Behavior

If backend is unavailable:
1. Frontend continues working with localStorage cache
2. Atterberg data can be viewed and edited locally
3. Sync is attempted on regular intervals
4. User sees "sync error" status in UI
5. Data is not lost - still available in browser cache

## Migration Checklist

- [ ] Apply the initial SQL migration
- [ ] Configure database credentials in `api.php`
- [ ] Verify the frontend uses the root `/api.php` endpoint
- [ ] Test `/api.php` endpoints with curl
- [ ] Create test user account
- [ ] Verify multi-user isolation
- [ ] Test offline cache functionality
- [ ] Verify export/import still works
- [ ] Check all existing tests pass

## Security Considerations

1. **HTTPS Required for Production**
   - Session cookies require secure flag on HTTPS
   - Set environment variable appropriately

2. **Password Requirements**
   - Enforce minimum password length in frontend
   - Consider additional validation rules

3. **Session Timeout**
   - Current: 30 days of inactivity
   - Adjust via expiration date in sessions table

4. **User Roles**
   - Current: No roles (all authenticated users equal)
   - Implement user roles in `users` table if needed

5. **API Rate Limiting**
   - Consider implementing rate limiting for auth endpoints
   - Prevent brute force attacks

## Performance Optimization

1. **Database Indexes**
   - All user_id columns are indexed
   - Session queries optimized with indexes

2. **Caching Strategy**
   - localStorage caches full project state
   - Sync only on changes (debounced)
   - Reduce server load

3. **Pagination**
   - List endpoint supports limit/offset
   - Use pagination for large datasets

## Next Steps

1. Set up database and environment variables
2. Deploy backend code
3. Integrate auth components into your app
4. Test user registration and login flows
5. Verify data sync works end-to-end
6. Monitor for errors in production

## Support

For issues or questions:
1. Check browser console for errors
2. Check backend server logs
3. Verify database connectivity
4. Ensure environment variables are set correctly
5. Test endpoints with curl first
