

# Borehole-Based Test Structure

## Overview
Restructure the app so a project contains multiple boreholes (e.g., BH-1, BH-2), each borehole has its own set of tests (starting with Atterberg Limits), and reports can be generated per-borehole or combined across all boreholes in a project.

## Data Model Change

```text
Project ("My Project at Road 7")
  ├── Borehole BH-1 (depth: 3m, location: "Chainage 0+100")
  │     ├── Atterberg Limits (LL=45, PL=22, PI=23)
  │     ├── Grading Test
  │     └── ...
  ├── Borehole BH-2 (depth: 5m, location: "Chainage 0+200")
  │     ├── Atterberg Limits (LL=38, PL=19, PI=19)
  │     └── ...
  └── Combined Report (all boreholes side-by-side)
```

## Plan

### 1. Backend: Add boreholes table and update migration
- Add `boreholes` table: `id`, `project_id` (FK), `name` (e.g. "BH-1"), `depth`, `location`, `description`, timestamps
- Add `borehole_id` column to the `tests` table (nullable FK to boreholes), so tests belong to a borehole rather than directly to a project
- Update the seed data accordingly

### 2. Backend: Add borehole CRUD endpoints to api.php
- `GET /boreholes?project_id={id}` -- list boreholes for a project
- `GET /boreholes/{id}` -- get borehole with its tests
- `POST /boreholes` -- create borehole (auto-seeds default tests)
- `PUT /boreholes/{id}` -- update name/depth/location
- `DELETE /boreholes/{id}` -- cascade-delete borehole and its tests

### 3. Backend: Add borehole report endpoints
- `GET /reports/borehole?borehole_id={id}` -- single borehole report data (all tests + results)
- `GET /reports/combined?project_id={id}` -- combined report across all boreholes (grouped by borehole, with summary table comparing key results side-by-side)

### 4. Frontend: Borehole management context and UI
- Create `BoreholeContext` to manage the list of boreholes and active borehole selection
- Add a borehole selector/manager panel below the project header: list of boreholes with add/remove buttons, name and depth inputs per borehole
- When a borehole is selected, tests show data for that borehole only

### 5. Frontend: Update AtterbergTest and test components
- Each test component receives/uses the active borehole ID
- Test data is keyed per borehole (so BH-1 and BH-2 each have independent Atterberg values)
- `useTestReport` hook updated to include borehole context

### 6. Frontend: Borehole and combined reports
- Add "Per Borehole" report option in Reports page -- select a borehole, download its PDF/CSV with all test results
- Add "Combined Report" option -- generates a summary table with all boreholes as columns and test results as rows (e.g., LL/PL/PI for each borehole side by side)
- Update `reportGenerator.ts` and `pdfGenerator.ts` with new report formats

## Technical Details

**Migration additions** (`backend/migration.sql`):
```sql
CREATE TABLE boreholes (
    id INT AUTO_INCREMENT PRIMARY KEY,
    project_id INT NOT NULL,
    name VARCHAR(100) NOT NULL,
    depth DECIMAL(10,2) DEFAULT NULL,
    location VARCHAR(255) DEFAULT '',
    description TEXT DEFAULT '',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
);

ALTER TABLE tests ADD COLUMN borehole_id INT NULL AFTER project_id,
    ADD FOREIGN KEY (borehole_id) REFERENCES boreholes(id) ON DELETE CASCADE;
```

**Frontend state structure** (in-memory, per borehole):
```typescript
// boreholes: { "bh-1": { name: "BH-1", depth: 3, tests: { atterberg: { ll, pl, pi }, ... } } }
```

**Files to create/modify**:
- `backend/migration.sql` -- add boreholes table, alter tests table
- `backend/api.php` -- add borehole CRUD + report endpoints
- `src/context/BoreholeContext.tsx` -- new context for borehole state
- `src/components/BoreholeManager.tsx` -- UI for adding/selecting boreholes
- `src/components/soil/AtterbergTest.tsx` -- use borehole-scoped state
- `src/context/TestDataContext.tsx` -- key test data by borehole
- `src/pages/Index.tsx` -- integrate borehole selector
- `src/pages/Reports.tsx` -- add per-borehole and combined report options
- `src/lib/reportGenerator.ts` -- add combined report generator

