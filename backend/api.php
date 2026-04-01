<?php
require_once __DIR__ . '/config.php';

$method = $_SERVER['REQUEST_METHOD'];
$path = trim(parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH), '/');
$path = preg_replace('#^api\.php/?#', '', $path);
$segments = array_values(array_filter(explode('/', $path)));

$defaultTests = [
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

try {
    $db = getDB();

    // ─── Route: /projects ───
    if (($segments[0] ?? '') === 'projects') {
        $projectId = $segments[1] ?? null;

        if ($method === 'GET' && !$projectId) {
            $stmt = $db->query("SELECT * FROM projects ORDER BY created_at DESC");
            jsonResponse($stmt->fetchAll());
        }

        if ($method === 'GET' && $projectId) {
            $stmt = $db->prepare("SELECT * FROM projects WHERE id = ?");
            $stmt->execute([$projectId]);
            $project = $stmt->fetch();
            if (!$project) jsonError('Project not found', 404);
            jsonResponse($project);
        }

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
            jsonResponse(['id' => $id, 'message' => 'Project created'], 201);
        }

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

        if ($method === 'DELETE' && $projectId) {
            $stmt = $db->prepare("DELETE FROM projects WHERE id = ?");
            $stmt->execute([$projectId]);
            jsonResponse(['message' => 'Project deleted']);
        }
    }

    // ─── Route: /boreholes ───
    if (($segments[0] ?? '') === 'boreholes') {
        $boreholeId = $segments[1] ?? null;

        // GET /boreholes?project_id={id}
        if ($method === 'GET' && !$boreholeId) {
            $projectId = $_GET['project_id'] ?? null;
            if (!$projectId) jsonError('project_id required');
            $stmt = $db->prepare("SELECT * FROM boreholes WHERE project_id = ? ORDER BY created_at");
            $stmt->execute([$projectId]);
            jsonResponse($stmt->fetchAll());
        }

        // GET /boreholes/{id}
        if ($method === 'GET' && $boreholeId) {
            $stmt = $db->prepare("SELECT * FROM boreholes WHERE id = ?");
            $stmt->execute([$boreholeId]);
            $borehole = $stmt->fetch();
            if (!$borehole) jsonError('Borehole not found', 404);

            // Include tests
            $tests = $db->prepare("
                SELECT t.*, 
                    (SELECT JSON_ARRAYAGG(JSON_OBJECT('label', tr.label, 'value', tr.value)) 
                     FROM test_results tr WHERE tr.test_id = t.id) as key_results
                FROM tests t WHERE t.borehole_id = ? ORDER BY t.category, t.name
            ");
            $tests->execute([$boreholeId]);
            $testRows = $tests->fetchAll();
            foreach ($testRows as &$t) {
                $t['key_results'] = $t['key_results'] ? json_decode($t['key_results']) : [];
            }
            $borehole['tests'] = $testRows;

            jsonResponse($borehole);
        }

        // POST /boreholes
        if ($method === 'POST' && !$boreholeId) {
            global $defaultTests;
            $body = getRequestBody();
            $projectId = $body['project_id'] ?? null;
            if (!$projectId) jsonError('project_id required');

            $stmt = $db->prepare("INSERT INTO boreholes (project_id, name, depth, location, description) VALUES (?, ?, ?, ?, ?)");
            $stmt->execute([
                $projectId,
                $body['name'] ?? 'BH-1',
                $body['depth'] ?? null,
                $body['location'] ?? '',
                $body['description'] ?? '',
            ]);
            $bhId = $db->lastInsertId();

            // Seed default tests for this borehole
            $ins = $db->prepare("INSERT INTO tests (project_id, borehole_id, test_key, name, category) VALUES (?, ?, ?, ?, ?)");
            foreach ($defaultTests as $t) {
                $ins->execute([$projectId, $bhId, $t[0], $t[1], $t[2]]);
            }

            jsonResponse(['id' => $bhId, 'message' => 'Borehole created with default tests'], 201);
        }

        // PUT /boreholes/{id}
        if ($method === 'PUT' && $boreholeId) {
            $body = getRequestBody();
            $stmt = $db->prepare("UPDATE boreholes SET name=?, depth=?, location=?, description=? WHERE id=?");
            $stmt->execute([
                $body['name'] ?? '',
                $body['depth'] ?? null,
                $body['location'] ?? '',
                $body['description'] ?? '',
                $boreholeId,
            ]);
            jsonResponse(['message' => 'Borehole updated']);
        }

        // DELETE /boreholes/{id}
        if ($method === 'DELETE' && $boreholeId) {
            $stmt = $db->prepare("DELETE FROM boreholes WHERE id = ?");
            $stmt->execute([$boreholeId]);
            jsonResponse(['message' => 'Borehole and its tests deleted']);
        }
    }

    // ─── Route: /tests ───
    if (($segments[0] ?? '') === 'tests') {
        $testId = $segments[1] ?? null;

        // GET /tests?borehole_id={id}
        if ($method === 'GET' && !$testId) {
            $boreholeId = $_GET['borehole_id'] ?? null;
            $projectId = $_GET['project_id'] ?? null;

            if ($boreholeId) {
                $stmt = $db->prepare("
                    SELECT t.*, 
                        (SELECT JSON_ARRAYAGG(JSON_OBJECT('label', tr.label, 'value', tr.value)) 
                         FROM test_results tr WHERE tr.test_id = t.id) as key_results
                    FROM tests t WHERE t.borehole_id = ? ORDER BY t.category, t.name
                ");
                $stmt->execute([$boreholeId]);
            } elseif ($projectId) {
                $stmt = $db->prepare("
                    SELECT t.*, 
                        (SELECT JSON_ARRAYAGG(JSON_OBJECT('label', tr.label, 'value', tr.value)) 
                         FROM test_results tr WHERE tr.test_id = t.id) as key_results
                    FROM tests t WHERE t.project_id = ? ORDER BY t.category, t.name
                ");
                $stmt->execute([$projectId]);
            } else {
                jsonError('borehole_id or project_id required');
            }

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

            if (isset($body['status']) || isset($body['data_points'])) {
                $fields = [];
                $values = [];
                if (isset($body['status'])) { $fields[] = "status=?"; $values[] = $body['status']; }
                if (isset($body['data_points'])) { $fields[] = "data_points=?"; $values[] = $body['data_points']; }
                $values[] = $testId;
                $db->prepare("UPDATE tests SET " . implode(',', $fields) . " WHERE id=?")->execute($values);
            }

            if (isset($body['key_results']) && is_array($body['key_results'])) {
                $db->prepare("DELETE FROM test_results WHERE test_id = ?")->execute([$testId]);
                $ins = $db->prepare("INSERT INTO test_results (test_id, label, value) VALUES (?, ?, ?)");
                foreach ($body['key_results'] as $r) {
                    $ins->execute([$testId, $r['label'] ?? '', $r['value'] ?? '']);
                }
            }

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

    // ─── Route: /reports ───
    if (($segments[0] ?? '') === 'reports') {
        $reportType = $segments[1] ?? '';

        // GET /reports/borehole?borehole_id={id}
        if ($method === 'GET' && $reportType === 'borehole') {
            $boreholeId = $_GET['borehole_id'] ?? null;
            if (!$boreholeId) jsonError('borehole_id required');

            $bh = $db->prepare("SELECT * FROM boreholes WHERE id = ?");
            $bh->execute([$boreholeId]);
            $borehole = $bh->fetch();
            if (!$borehole) jsonError('Borehole not found', 404);

            $tests = $db->prepare("
                SELECT t.test_key, t.name, t.category, t.status, t.data_points,
                    (SELECT JSON_ARRAYAGG(JSON_OBJECT('label', tr.label, 'value', tr.value)) 
                     FROM test_results tr WHERE tr.test_id = t.id) as key_results
                FROM tests t WHERE t.borehole_id = ? ORDER BY t.category
            ");
            $tests->execute([$boreholeId]);
            $allTests = $tests->fetchAll();
            foreach ($allTests as &$t) {
                $t['key_results'] = $t['key_results'] ? json_decode($t['key_results']) : [];
            }

            jsonResponse(['borehole' => $borehole, 'tests' => $allTests]);
        }

        // GET /reports/combined?project_id={id}
        if ($method === 'GET' && $reportType === 'combined') {
            $projectId = $_GET['project_id'] ?? null;
            if (!$projectId) jsonError('project_id required');

            $bhStmt = $db->prepare("SELECT * FROM boreholes WHERE project_id = ? ORDER BY created_at");
            $bhStmt->execute([$projectId]);
            $boreholes = $bhStmt->fetchAll();

            $result = [];
            foreach ($boreholes as $bh) {
                $tests = $db->prepare("
                    SELECT t.test_key, t.name, t.category, t.status, t.data_points,
                        (SELECT JSON_ARRAYAGG(JSON_OBJECT('label', tr.label, 'value', tr.value)) 
                         FROM test_results tr WHERE tr.test_id = t.id) as key_results
                    FROM tests t WHERE t.borehole_id = ? ORDER BY t.category
                ");
                $tests->execute([$bh['id']]);
                $testRows = $tests->fetchAll();
                foreach ($testRows as &$t) {
                    $t['key_results'] = $t['key_results'] ? json_decode($t['key_results']) : [];
                }
                $result[] = ['borehole' => $bh, 'tests' => $testRows];
            }

            jsonResponse(['boreholes' => $result]);
        }

        // GET /reports/summary?project_id={id}
        if ($method === 'GET' && $reportType === 'summary') {
            $projectId = $_GET['project_id'] ?? null;
            if (!$projectId) jsonError('project_id required');

            $stmt = $db->prepare("SELECT * FROM projects WHERE id = ?");
            $stmt->execute([$projectId]);
            $project = $stmt->fetch();
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
        if ($method === 'GET' && $reportType === 'dashboard') {
            $projectId = $_GET['project_id'] ?? null;
            if (!$projectId) jsonError('project_id required');

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
