<?php
declare(strict_types=1);

header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Headers: Content-Type, Authorization');
header('Access-Control-Allow-Methods: GET, POST, PUT, PATCH, DELETE, OPTIONS');

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

function env(string $key, string $default = ''): string
{
    $value = getenv($key);
    return $value === false || $value === '' ? $default : $value;
}

function db(): mysqli
{
    $host = env('DB_HOST', '127.0.0.1');
    $user = env('DB_USER', 'root');
    $pass = env('DB_PASSWORD', '');
    $name = env('DB_NAME', 'lab_data_craft');
    $port = (int) env('DB_PORT', '3306');

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
    $table = tableName($body);
    $schema = columnSchema($conn, $table);
    $primaryKey = $schema['primaryKey'] ?? 'id';
    $method = strtoupper($_SERVER['REQUEST_METHOD'] ?? 'GET');
    $action = strtolower((string) ($_GET['action'] ?? $body['action'] ?? ''));

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

        $sql = "SELECT * FROM `$table` ORDER BY `$orderBy` $direction LIMIT ? OFFSET ?";
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
        $id = $_GET['id'] ?? $body['id'] ?? null;
        if ($id === null || $id === '') {
            respond(['error' => 'Missing id'], 400);
        }

        $sql = "SELECT * FROM `$table` WHERE `$primaryKey` = ? LIMIT 1";
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
        $payload = filteredPayload($body);
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
        $id = $_GET['id'] ?? $body['id'] ?? null;
        if ($id === null || $id === '') {
            respond(['error' => 'Missing id'], 400);
        }

        $payload = filteredPayload($body);
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
        $id = $_GET['id'] ?? $body['id'] ?? null;
        if ($id === null || $id === '') {
            respond(['error' => 'Missing id'], 400);
        }

        $sql = sprintf('DELETE FROM `%s` WHERE `%s` = ?', $table, $primaryKey);
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
