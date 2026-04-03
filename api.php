<?php
declare(strict_types=1);

header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: ' . ($_SERVER['HTTP_ORIGIN'] ?? '*'));
header('Access-Control-Allow-Headers: Content-Type, Authorization');
header('Access-Control-Allow-Methods: GET, POST, PUT, PATCH, DELETE, OPTIONS');
header('Access-Control-Allow-Credentials: true');

// Session configuration
session_set_cookie_params([
    'httponly' => true,
    'samesite' => 'Lax',
    'secure' => (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') ? true : false,
]);
session_start();

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit;
}

mysqli_report(MYSQLI_REPORT_ERROR | MYSQLI_REPORT_STRICT);

const ALLOWED_TABLES = [
    'projects' => true,
    'test_definitions' => true,
    'test_results' => true,
    'atterberg_instances' => true,
    'atterberg_rows' => true,
];

function respond(array $payload, int $status = 200): never
{
    http_response_code($status);
    echo json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

function hashPassword(string $password): string
{
    return password_hash($password, PASSWORD_DEFAULT);
}

function verifyPassword(string $password, string $hash): bool
{
    return password_verify($password, $hash);
}

function getCurrentUser(mysqli $conn): ?array
{
    if (!isset($_SESSION['user_id'])) {
        return null;
    }

    $userId = (int) $_SESSION['user_id'];
    $sessionId = $_SESSION['session_id'] ?? null;

    if (!$sessionId) {
        return null;
    }

    // Validate session exists and hasn't expired
    $sql = "SELECT s.*, u.id, u.email, u.name FROM `sessions` s
            JOIN `users` u ON s.user_id = u.id
            WHERE s.session_id = ? AND s.expires_at > NOW()
            LIMIT 1";
    $stmt = $conn->prepare($sql);
    if (!$stmt) {
        return null;
    }

    $stmt->bind_param('s', $sessionId);
    $stmt->execute();
    $result = $stmt->get_result();
    $row = $result->fetch_assoc();

    if (!$row) {
        session_destroy();
        return null;
    }

    // Update session expiration (sliding expiration: 30 days)
    $expiresAt = date('Y-m-d H:i:s', strtotime('+30 days'));
    $updateStmt = $conn->prepare("UPDATE `sessions` SET `expires_at` = ?, `updated_at` = NOW() WHERE `session_id` = ?");
    if ($updateStmt) {
        $updateStmt->bind_param('ss', $expiresAt, $sessionId);
        $updateStmt->execute();
        $updateStmt->close();
    }

    return [
        'id' => (int) $row['id'],
        'email' => $row['email'],
        'name' => $row['name'],
    ];
}

function requireAuth(mysqli $conn): ?array
{
    $user = getCurrentUser($conn);
    if (!$user) {
        respond(['error' => 'Unauthorized'], 401);
    }
    return $user;
}

function db(): mysqli
{
    $host = 'localhost';
    $user = 'wayrusc1_labdatacraft';
    $pass = 'Sirgeorge.12';
    $name = 'wayrusc1_labdatacraft';
    $port = 3306;

    $conn = new mysqli($host, $user, $pass, $name, $port);
    $conn->set_charset('utf8mb4');

    return $conn;
}

function requestBody(): array
{
    $raw = file_get_contents('php://input');
    if ($raw === false || trim($raw) === '') {
        return [];
    }

    $decoded = json_decode($raw, true);
    if (json_last_error() === JSON_ERROR_NONE && is_array($decoded)) {
        return $decoded;
    }

    parse_str($raw, $parsed);
    return is_array($parsed) ? $parsed : [];
}

function tableName(array $input): string
{
    $table = trim((string) ($input['table'] ?? $_GET['table'] ?? ''));
    if ($table === '' || !preg_match('/^[a-zA-Z0-9_]+$/', $table) || !isset(ALLOWED_TABLES[$table])) {
        respond(['error' => 'Invalid or unsupported table'], 400);
    }

    return $table;
}

function columnSchema(mysqli $conn, string $table): array
{
    $columns = [];
    $primaryKey = null;
    $autoIncrement = [];

    $result = $conn->query("SHOW COLUMNS FROM `$table`");
    while ($row = $result->fetch_assoc()) {
        $columns[$row['Field']] = $row;
        if (($row['Key'] ?? '') === 'PRI') {
            $primaryKey = $row['Field'];
        }
        if (str_contains((string) ($row['Extra'] ?? ''), 'auto_increment')) {
            $autoIncrement[] = $row['Field'];
        }
    }

    return [
        'columns' => $columns,
        'primaryKey' => $primaryKey,
        'autoIncrement' => $autoIncrement,
    ];
}

function bindParams(mysqli_stmt $stmt, string $types, array $params): void
{
    $references = [$types];
    foreach ($params as $key => $value) {
        $references[$key + 1] = &$params[$key];
    }
    call_user_func_array([$stmt, 'bind_param'], $references);
}

function normalizeValue(mixed $value): mixed
{
    if (is_array($value) || is_object($value)) {
        return json_encode($value, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    }

    return $value;
}

function hydrateRow(array $row): array
{
    foreach ($row as $key => $value) {
        if (!is_string($value) || !str_ends_with($key, '_json')) {
            continue;
        }

        $decoded = json_decode($value, true);
        if (json_last_error() === JSON_ERROR_NONE) {
            $row[$key] = $decoded;
        }
    }

    return $row;
}

function filteredPayload(array $input): array
{
    $payload = $input['data'] ?? $input['payload'] ?? $input;

    if (!is_array($payload)) {
        return [];
    }

    unset(
        $payload['action'],
        $payload['table'],
        $payload['id'],
        $payload['limit'],
        $payload['offset'],
        $payload['orderBy'],
        $payload['direction']
    );

    return $payload;
}

try {
    $conn = db();
    $body = requestBody();
    $method = strtoupper($_SERVER['REQUEST_METHOD'] ?? 'GET');
    $action = strtolower((string) ($_GET['action'] ?? $body['action'] ?? ''));

    // ============= AUTHENTICATION ENDPOINTS =============

    if ($action === 'register') {
        $email = trim((string) ($body['email'] ?? ''));
        $password = (string) ($body['password'] ?? '');
        $name = trim((string) ($body['name'] ?? ''));

        if (!$email || !$password || !$name) {
            respond(['error' => 'Missing required fields: email, password, name'], 400);
        }

        if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
            respond(['error' => 'Invalid email format'], 400);
        }

        // Check if user already exists
        $checkStmt = $conn->prepare("SELECT id FROM `users` WHERE email = ? LIMIT 1");
        $checkStmt->bind_param('s', $email);
        $checkStmt->execute();
        if ($checkStmt->get_result()->fetch_assoc()) {
            respond(['error' => 'Email already registered'], 409);
        }
        $checkStmt->close();

        // Hash password and create user
        $hashedPassword = hashPassword($password);
        $insertStmt = $conn->prepare("INSERT INTO `users` (email, password, name) VALUES (?, ?, ?)");
        $insertStmt->bind_param('sss', $email, $hashedPassword, $name);

        if (!$insertStmt->execute()) {
            respond(['error' => 'Failed to create user'], 500);
        }

        $userId = $conn->insert_id;
        $insertStmt->close();

        // Create session
        $sessionId = bin2hex(random_bytes(32));
        $expiresAt = date('Y-m-d H:i:s', strtotime('+30 days'));
        $userAgent = substr((string) ($_SERVER['HTTP_USER_AGENT'] ?? ''), 0, 500);
        $ipAddress = $_SERVER['REMOTE_ADDR'] ?? '0.0.0.0';

        $sessionStmt = $conn->prepare("INSERT INTO `sessions` (session_id, user_id, user_agent, ip_address, expires_at) VALUES (?, ?, ?, ?, ?)");
        $sessionStmt->bind_param('sisss', $sessionId, $userId, $userAgent, $ipAddress, $expiresAt);
        $sessionStmt->execute();
        $sessionStmt->close();

        $_SESSION['user_id'] = $userId;
        $_SESSION['session_id'] = $sessionId;
        setcookie('PHPSESSID', $sessionId, strtotime($expiresAt), '/', '', true, true);

        respond([
            'message' => 'User registered and logged in',
            'user_id' => $userId,
            'user' => [
                'id' => $userId,
                'email' => $email,
                'name' => $name,
            ],
        ], 201);
    }

    if ($action === 'login') {
        $email = trim((string) ($body['email'] ?? ''));
        $password = (string) ($body['password'] ?? '');

        if (!$email || !$password) {
            respond(['error' => 'Missing email or password'], 400);
        }

        // Fetch user by email
        $userStmt = $conn->prepare("SELECT id, password, email, name FROM `users` WHERE email = ? LIMIT 1");
        $userStmt->bind_param('s', $email);
        $userStmt->execute();
        $userRow = $userStmt->get_result()->fetch_assoc();
        $userStmt->close();

        if (!$userRow || !verifyPassword($password, (string) $userRow['password'])) {
            respond(['error' => 'Invalid email or password'], 401);
        }

        // Create session
        $sessionId = bin2hex(random_bytes(32));
        $expiresAt = date('Y-m-d H:i:s', strtotime('+30 days'));
        $userAgent = substr((string) ($_SERVER['HTTP_USER_AGENT'] ?? ''), 0, 500);
        $ipAddress = $_SERVER['REMOTE_ADDR'] ?? '0.0.0.0';
        $userId = (int) $userRow['id'];

        $sessionStmt = $conn->prepare("INSERT INTO `sessions` (session_id, user_id, user_agent, ip_address, expires_at) VALUES (?, ?, ?, ?, ?)");
        $sessionStmt->bind_param('sisss', $sessionId, $userId, $userAgent, $ipAddress, $expiresAt);
        $sessionStmt->execute();
        $sessionStmt->close();

        $_SESSION['user_id'] = $userId;
        $_SESSION['session_id'] = $sessionId;
        setcookie('PHPSESSID', $sessionId, strtotime($expiresAt), '/', '', true, true);

        respond([
            'message' => 'Logged in successfully',
            'user_id' => $userId,
            'user' => [
                'id' => $userId,
                'email' => $userRow['email'],
                'name' => $userRow['name'],
            ],
        ]);
    }

    if ($action === 'logout') {
        if (isset($_SESSION['session_id'])) {
            $sessionId = $_SESSION['session_id'];
            $deleteStmt = $conn->prepare("DELETE FROM `sessions` WHERE session_id = ?");
            $deleteStmt->bind_param('s', $sessionId);
            $deleteStmt->execute();
            $deleteStmt->close();
        }

        session_destroy();
        setcookie('PHPSESSID', '', time() - 3600, '/');

        respond(['message' => 'Logged out successfully']);
    }

    if ($action === 'me') {
        $user = getCurrentUser($conn);
        if (!$user) {
            respond(['user' => null, 'authenticated' => false], 401);
        }

        respond([
            'user' => $user,
            'authenticated' => true,
        ]);
    }

    // ============= CRUD ENDPOINTS (require authentication) =============

    $table = tableName($body);
    $schema = columnSchema($conn, $table);
    $primaryKey = $schema['primaryKey'] ?? 'id';

    if ($action === '') {
        $action = $method === 'GET'
            ? (isset($_GET['id']) || isset($body['id']) ? 'read' : 'list')
            : match ($method) {
                'POST' => 'create',
                'PUT', 'PATCH' => 'update',
                'DELETE' => 'delete',
                default => '',
            };
    }

    if ($action === '') {
        respond(['error' => 'Unsupported action'], 405);
    }

    if ($action === 'schema') {
        respond([
            'table' => $table,
            'primaryKey' => $primaryKey,
            'columns' => array_values(array_map(fn ($col) => [
                'name' => $col['Field'],
                'type' => $col['Type'],
                'nullable' => $col['Null'] === 'YES',
                'key' => $col['Key'],
                'default' => $col['Default'],
                'extra' => $col['Extra'],
            ], $schema['columns'])),
        ]);
    }

    if ($action === 'list') {
        $user = requireAuth($conn);
        $userId = (int) $_SESSION['user_id'];

        $limit = isset($_GET['limit']) ? max(1, (int) $_GET['limit']) : 100;
        $offset = isset($_GET['offset']) ? max(0, (int) $_GET['offset']) : 0;
        $orderBy = (string) ($_GET['orderBy'] ?? $primaryKey);
        $direction = strtoupper((string) ($_GET['direction'] ?? 'DESC'));

        if (!isset($schema['columns'][$orderBy])) {
            $orderBy = $primaryKey;
        }
        if (!in_array($direction, ['ASC', 'DESC'], true)) {
            $direction = 'DESC';
        }

        // Filter by user_id if the table has it
        $whereClause = '';
        if (isset($schema['columns']['user_id'])) {
            $whereClause = "WHERE `user_id` = $userId";
        }

        $sql = "SELECT * FROM `$table` $whereClause ORDER BY `$orderBy` $direction LIMIT ? OFFSET ?";
        $stmt = $conn->prepare($sql);
        $stmt->bind_param('ii', $limit, $offset);
        $stmt->execute();
        $result = $stmt->get_result();

        $rows = [];
        while ($row = $result->fetch_assoc()) {
            $rows[] = hydrateRow($row);
        }

        respond([
            'table' => $table,
            'data' => $rows,
            'limit' => $limit,
            'offset' => $offset,
        ]);
    }

    if ($action === 'read') {
        $user = requireAuth($conn);
        $userId = (int) $_SESSION['user_id'];

        $id = $_GET['id'] ?? $body['id'] ?? null;
        if ($id === null || $id === '') {
            respond(['error' => 'Missing id'], 400);
        }

        // Check ownership if table has user_id
        $whereClause = "`$primaryKey` = ?";
        if (isset($schema['columns']['user_id'])) {
            $whereClause .= " AND `user_id` = $userId";
        }

        $sql = "SELECT * FROM `$table` WHERE $whereClause LIMIT 1";
        $stmt = $conn->prepare($sql);
        $stmt->bind_param('s', $id);
        $stmt->execute();
        $row = $stmt->get_result()->fetch_assoc();

        if (!$row) {
            respond(['error' => 'Record not found'], 404);
        }

        respond(['table' => $table, 'data' => hydrateRow($row)]);
    }

    if ($action === 'create') {
        $user = requireAuth($conn);
        $userId = (int) $_SESSION['user_id'];

        $payload = filteredPayload($body);

        // Automatically add user_id if table has it
        if (isset($schema['columns']['user_id'])) {
            $payload['user_id'] = $userId;
        }

        $columns = [];
        $placeholders = [];
        $values = [];

        foreach ($payload as $column => $value) {
            if (!isset($schema['columns'][$column]) || in_array($column, $schema['autoIncrement'], true)) {
                continue;
            }

            $columns[] = "`$column`";
            $placeholders[] = '?';
            $values[] = normalizeValue($value);
        }

        if ($columns === []) {
            respond(['error' => 'No valid fields provided for insert'], 422);
        }

        $sql = sprintf(
            'INSERT INTO `%s` (%s) VALUES (%s)',
            $table,
            implode(', ', $columns),
            implode(', ', $placeholders)
        );

        $stmt = $conn->prepare($sql);
        bindParams($stmt, str_repeat('s', count($values)), $values);
        $stmt->execute();

        $insertId = $conn->insert_id;
        $created = $conn->query("SELECT * FROM `$table` WHERE `$primaryKey` = '" . $conn->real_escape_string((string) $insertId) . "' LIMIT 1")->fetch_assoc();

        respond([
            'message' => 'Record created',
            'table' => $table,
            'id' => $insertId,
            'data' => $created ? hydrateRow($created) : null,
        ], 201);
    }

    if ($action === 'update') {
        $user = requireAuth($conn);
        $userId = (int) $_SESSION['user_id'];

        $id = $_GET['id'] ?? $body['id'] ?? null;
        if ($id === null || $id === '') {
            respond(['error' => 'Missing id'], 400);
        }

        // Check ownership if table has user_id
        if (isset($schema['columns']['user_id'])) {
            $checkStmt = $conn->prepare("SELECT id FROM `$table` WHERE `$primaryKey` = ? AND `user_id` = ? LIMIT 1");
            $checkStmt->bind_param('si', $id, $userId);
            $checkStmt->execute();
            if (!$checkStmt->get_result()->fetch_assoc()) {
                respond(['error' => 'Record not found or forbidden'], 404);
            }
            $checkStmt->close();
        }

        $payload = filteredPayload($body);

        // Prevent user_id from being updated
        unset($payload['user_id']);

        $sets = [];
        $values = [];

        foreach ($payload as $column => $value) {
            if (!isset($schema['columns'][$column]) || $column === $primaryKey || in_array($column, $schema['autoIncrement'], true)) {
                continue;
            }

            $sets[] = "`$column` = ?";
            $values[] = normalizeValue($value);
        }

        if ($sets === []) {
            respond(['error' => 'No valid fields provided for update'], 422);
        }

        $sql = sprintf(
            'UPDATE `%s` SET %s WHERE `%s` = ?',
            $table,
            implode(', ', $sets),
            $primaryKey
        );

        $values[] = $id;
        $stmt = $conn->prepare($sql);
        bindParams($stmt, str_repeat('s', count($values)), $values);
        $stmt->execute();

        $updated = $conn->query("SELECT * FROM `$table` WHERE `$primaryKey` = '" . $conn->real_escape_string((string) $id) . "' LIMIT 1")->fetch_assoc();

        respond([
            'message' => 'Record updated',
            'table' => $table,
            'data' => $updated ? hydrateRow($updated) : null,
        ]);
    }

    if ($action === 'delete') {
        $user = requireAuth($conn);
        $userId = (int) $_SESSION['user_id'];

        $id = $_GET['id'] ?? $body['id'] ?? null;
        if ($id === null || $id === '') {
            respond(['error' => 'Missing id'], 400);
        }

        // Check ownership if table has user_id
        $whereClause = "`$primaryKey` = ?";
        if (isset($schema['columns']['user_id'])) {
            $whereClause .= " AND `user_id` = $userId";
        }

        $sql = sprintf('DELETE FROM `%s` WHERE %s', $table, $whereClause);
        $stmt = $conn->prepare($sql);
        $stmt->bind_param('s', $id);
        $stmt->execute();

        respond([
            'message' => 'Record deleted',
            'table' => $table,
            'deleted' => $stmt->affected_rows > 0,
        ]);
    }

    respond(['error' => 'Unsupported action'], 405);
} catch (Throwable $e) {
    respond([
        'error' => 'Server error',
        'message' => $e->getMessage(),
    ], 500);
}
