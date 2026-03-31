<?php
/**
 * Authentication endpoints (NOT IMPLEMENTED)
 * 
 * This file defines the routing structure for auth endpoints.
 * Implementation (password hashing, JWT generation, session management)
 * should be added when ready.
 * 
 * Endpoints:
 *   POST /auth/register   - Create a new user account
 *   POST /auth/login      - Authenticate and receive a session token
 *   POST /auth/logout     - Invalidate current session
 *   POST /auth/forgot     - Request password reset email
 *   POST /auth/reset      - Reset password with token
 *   GET  /auth/me         - Get current authenticated user
 */

require_once __DIR__ . '/config.php';

$method = $_SERVER['REQUEST_METHOD'];
$path = trim(parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH), '/');
$path = preg_replace('#^auth\.php/?#', '', $path);
$segments = array_values(array_filter(explode('/', $path)));
$action = $segments[1] ?? '';

try {
    $db = getDB();

    // POST /auth/register
    if ($method === 'POST' && $action === 'register') {
        // TODO: Implement registration
        // - Validate email + password
        // - Hash password with password_hash()
        // - Insert into users table
        // - Return user info (without password)
        jsonError('Not implemented', 501);
    }

    // POST /auth/login
    if ($method === 'POST' && $action === 'login') {
        // TODO: Implement login
        // - Find user by email
        // - Verify password with password_verify()
        // - Create session token
        // - Update last_login
        // - Return token + user info
        jsonError('Not implemented', 501);
    }

    // POST /auth/logout
    if ($method === 'POST' && $action === 'logout') {
        // TODO: Implement logout
        // - Extract token from Authorization header
        // - Delete session from sessions table
        jsonError('Not implemented', 501);
    }

    // POST /auth/forgot
    if ($method === 'POST' && $action === 'forgot') {
        // TODO: Implement forgot password
        // - Find user by email
        // - Generate reset token with expiry
        // - Store in password_resets table
        // - Send email (or return token for dev)
        jsonError('Not implemented', 501);
    }

    // POST /auth/reset
    if ($method === 'POST' && $action === 'reset') {
        // TODO: Implement password reset
        // - Validate token from password_resets
        // - Check expiry and used status
        // - Hash new password and update user
        // - Mark token as used
        jsonError('Not implemented', 501);
    }

    // GET /auth/me
    if ($method === 'GET' && $action === 'me') {
        // TODO: Implement get current user
        // - Extract token from Authorization header
        // - Look up session, check expiry
        // - Return user info
        jsonError('Not implemented', 501);
    }

    jsonError('Not found', 404);

} catch (PDOException $e) {
    jsonError('Database error: ' . $e->getMessage(), 500);
} catch (Exception $e) {
    jsonError('Server error: ' . $e->getMessage(), 500);
}
