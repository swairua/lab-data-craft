<?php
require_once __DIR__ . '/config.php';

$method = $_SERVER['REQUEST_METHOD'];
$path = trim(parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH), '/');
$path = preg_replace('#^api\.php/?#', '', $path);
$segments = array_values(array_filter(explode('/', $path)));

try {
    $db = getDB();

    // Route: /projects
    if (($segments[0] ?? '') === 'projects') {
        $projectId = $segments[1] ?? null;

        // GET /projects
        if ($method === 'GET' && !$projectId) {
            $stmt = $db->query("SELECT * FROM projects ORDER BY created_at DESC");
            jsonResponse($stmt->fetchAll());
        }

        // GET /projects/{id}
        if ($method === 'GET' && $projectId) {
            $stmt = $db->prepare("SELECT * FROM projects WHERE id = ?");
            $stmt->execute([$projectId]);
            $project = $stmt->fetch();
            if (!$project) jsonError('Project not found', 404);
            jsonResponse($project);
        }

        // POST /projects
        if ($method === 'POST' && !$projectId) {
            $body = getRequestBody();
            $stmt = $db->prepare("INSERT INTO projects (name, location, client, consultant, contractor, date) VALUES (?, ?, ?, ?, ?, ?)");
            $stmt->execute([
                $body['name'] ?? 'Untitled Project',
                $body['location'] ?? '',
                $body['client'] ?? '',
                $body['consultant'] ?? '',
                $body['contractor'] ?? '',
                $body['date'] ?? null,
            ]);
            $id = $db->lastInsertId();

            // Seed default tests for new project
            $defaults = [
                ['grading', 'Grading (Sieve Analysis)', 'soil'],
                ['atterberg', 'Atterberg Limits', 'soil'],
                ['proctor', 'Proctor Test', 'soil'],
                ['cbr', 'CBR', 'soil'],
                ['shear', 'Shear Test', 'soil'],
                ['consolidation', 'Consolidation', 'soil'],
                ['slump', 'Slump Test', 'concrete'],
                ['compressive', 'Compressive Strength', 'concrete'],
                ['upvt', 'UPVT', 'concrete'],
                ['schmidt', 'Schmidt Hammer', 'concrete'],
                ['coring', 'Coring', 'concrete'],
                ['cubes', 'Concrete Cubes', 'concrete'],
                ['ucs', 'UCS', 'rock'],
                ['pointload', 'Point Load', 'rock'],
                ['porosity', 'Porosity', 'rock'],
                ['spt', 'SPT', 'special'],
                ['dcp', 'DCP', 'special'],
            ];
            $ins = $db->prepare("INSERT INTO tests (project_id, test_key, name, category) VALUES (?, ?, ?, ?)");
            foreach ($defaults as $t) {
                $ins->execute([$id, $t[0], $t[1], $t[2]]);
            }

            jsonResponse(['id' => $id, 'message' => 'Project created'], 201);
        }

        // PUT /projects/{id}
        if ($method === 'PUT' && $projectId) {
            $body = getRequestBody();
            $stmt = $db->prepare("UPDATE projects SET name=?, location=?, client=?, consultant=?, contractor=?, date=? WHERE id=?");
            $stmt->execute([
                $body['name'] ?? '',
                $body['location'] ?? '',
                $body['client'] ?? '',
                $body['consultant'] ?? '',
                $body['contractor'] ?? '',
                $body['date'] ?? null,
                $projectId,
            ]);
            jsonResponse(['message' => 'Project updated']);
        }

        // DELETE /projects/{id}
        if ($method === 'DELETE' && $projectId) {
            $stmt = $db->prepare("DELETE FROM projects WHERE id = ?");
            $stmt->execute([$projectId]);
            jsonResponse(['message' => 'Project deleted']);
        }
    }

    // Route: /tests
    if (($segments[0] ?? '') === 'tests') {
        $projectId = $_GET['project_id'] ?? null;
        $testId = $segments[1] ?? null;

        // GET /tests?project_id={id}
        if ($method === 'GET' && !$testId) {
            if (!$projectId) jsonError('project_id required');
            $stmt = $db->prepare("
                SELECT t.*, 
                    (SELECT JSON_ARRAYAGG(JSON_OBJECT('label', tr.label, 'value', tr.value)) 
                     FROM test_results tr WHERE tr.test_id = t.id) as key_results
                FROM tests t WHERE t.project_id = ? ORDER BY t.category, t.name
            ");
            $stmt->execute([$projectId]);
            $tests = $stmt->fetchAll();
            foreach ($tests as &$test) {
                $test['key_results'] = $test['key_results'] ? json_decode($test['key_results']) : [];
            }
            jsonResponse($tests);
        }

        // GET /tests/{id}
        if ($method === 'GET' && $testId) {
            $stmt = $db->prepare("SELECT * FROM tests WHERE id = ?");
            $stmt->execute([$testId]);
            $test = $stmt->fetch();
            if (!$test) jsonError('Test not found', 404);

            // Include results and data
            $results = $db->prepare("SELECT label, value FROM test_results WHERE test_id = ?");
            $results->execute([$testId]);
            $test['key_results'] = $results->fetchAll();

            $data = $db->prepare("SELECT field_name, field_value FROM test_data WHERE test_id = ?");
            $data->execute([$testId]);
            $test['data'] = $data->fetchAll();

            jsonResponse($test);
        }

        // PUT /tests/{id}
        if ($method === 'PUT' && $testId) {
            $body = getRequestBody();

            // Update test status and data_points
            if (isset($body['status']) || isset($body['data_points'])) {
                $fields = [];
                $values = [];
                if (isset($body['status'])) { $fields[] = "status=?"; $values[] = $body['status']; }
                if (isset($body['data_points'])) { $fields[] = "data_points=?"; $values[] = $body['data_points']; }
                $values[] = $testId;
                $db->prepare("UPDATE tests SET " . implode(',', $fields) . " WHERE id=?")->execute($values);
            }

            // Update key results
            if (isset($body['key_results']) && is_array($body['key_results'])) {
                $db->prepare("DELETE FROM test_results WHERE test_id = ?")->execute([$testId]);
                $ins = $db->prepare("INSERT INTO test_results (test_id, label, value) VALUES (?, ?, ?)");
                foreach ($body['key_results'] as $r) {
                    $ins->execute([$testId, $r['label'] ?? '', $r['value'] ?? '']);
                }
            }

            // Update test data fields
            if (isset($body['data']) && is_array($body['data'])) {
                foreach ($body['data'] as $field) {
                    $db->prepare("
                        INSERT INTO test_data (test_id, field_name, field_value) VALUES (?, ?, ?)
                        ON DUPLICATE KEY UPDATE field_value = VALUES(field_value)
                    ")->execute([$testId, $field['field_name'], $field['field_value'] ?? '']);
                }
            }

            jsonResponse(['message' => 'Test updated']);
        }
    }

    // Route: /reports
    if (($segments[0] ?? '') === 'reports') {
        $projectId = $_GET['project_id'] ?? null;
        if (!$projectId) jsonError('project_id required');

        // GET /reports/summary?project_id={id}
        if ($method === 'GET' && ($segments[1] ?? '') === 'summary') {
            $project = $db->prepare("SELECT * FROM projects WHERE id = ?")->execute([$projectId]);
            $project = $db->prepare("SELECT * FROM projects WHERE id = ?");
            $project->execute([$projectId]);
            $project = $project->fetch();
            if (!$project) jsonError('Project not found', 404);

            $tests = $db->prepare("
                SELECT t.test_key, t.name, t.category, t.status, t.data_points,
                    (SELECT JSON_ARRAYAGG(JSON_OBJECT('label', tr.label, 'value', tr.value)) 
                     FROM test_results tr WHERE tr.test_id = t.id) as key_results
                FROM tests t WHERE t.project_id = ?
            ");
            $tests->execute([$projectId]);
            $allTests = $tests->fetchAll();

            $total = count($allTests);
            $completed = count(array_filter($allTests, fn($t) => $t['status'] === 'completed'));
            $inProgress = count(array_filter($allTests, fn($t) => $t['status'] === 'in-progress'));

            jsonResponse([
                'project' => $project,
                'summary' => [
                    'total_tests' => $total,
                    'completed' => $completed,
                    'in_progress' => $inProgress,
                    'not_started' => $total - $completed - $inProgress,
                    'progress_percent' => $total > 0 ? round(($completed / $total) * 100) : 0,
                ],
                'tests' => $allTests,
            ]);
        }

        // GET /reports/dashboard?project_id={id}
        if ($method === 'GET' && ($segments[1] ?? '') === 'dashboard') {
            $tests = $db->prepare("
                SELECT t.test_key, t.name, t.category, t.status, t.data_points,
                    (SELECT JSON_ARRAYAGG(JSON_OBJECT('label', tr.label, 'value', tr.value)) 
                     FROM test_results tr WHERE tr.test_id = t.id) as key_results
                FROM tests t WHERE t.project_id = ? ORDER BY t.category
            ");
            $tests->execute([$projectId]);
            $rows = $tests->fetchAll();

            $grouped = [];
            foreach ($rows as $r) {
                $r['key_results'] = $r['key_results'] ? json_decode($r['key_results']) : [];
                $grouped[$r['category']][] = $r;
            }

            jsonResponse(['categories' => $grouped]);
        }
    }

    jsonError('Not found', 404);

} catch (PDOException $e) {
    jsonError('Database error: ' . $e->getMessage(), 500);
} catch (Exception $e) {
    jsonError('Server error: ' . $e->getMessage(), 500);
}
