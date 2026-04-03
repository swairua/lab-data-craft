import { useCallback } from 'react';
import { ApiClient } from '@/lib/api';
import type { AtterbergProjectState, AtterbergRecord } from '@/context/TestDataContext';

const STORAGE_KEY = 'atterbergProjectState';
const SYNC_STATUS_KEY = 'atterbergSyncStatus';

export interface SyncStatus {
  projectId?: number;
  syncStatus: 'pending' | 'syncing' | 'synced' | 'error';
  lastSyncedAt?: string;
  error?: string;
}

export function useAtterbergSync(api: ApiClient) {
  // Load local cache from localStorage
  const loadLocalCache = useCallback((projectId?: number) => {
    try {
      const data = localStorage.getItem(projectId ? `${STORAGE_KEY}-${projectId}` : STORAGE_KEY);
      return data ? (JSON.parse(data) as AtterbergProjectState) : null;
    } catch {
      return null;
    }
  }, []);

  // Save local cache to localStorage
  const saveLocalCache = useCallback((data: AtterbergProjectState, projectId?: number) => {
    try {
      localStorage.setItem(
        projectId ? `${STORAGE_KEY}-${projectId}` : STORAGE_KEY,
        JSON.stringify(data),
      );
    } catch {
      console.error('Failed to save local cache');
    }
  }, []);

  // Get sync status from localStorage
  const getSyncStatus = useCallback((projectId?: number): SyncStatus => {
    try {
      const data = localStorage.getItem(projectId ? `${SYNC_STATUS_KEY}-${projectId}` : SYNC_STATUS_KEY);
      return data
        ? (JSON.parse(data) as SyncStatus)
        : { syncStatus: 'pending', lastSyncedAt: undefined };
    } catch {
      return { syncStatus: 'pending', lastSyncedAt: undefined };
    }
  }, []);

  // Save sync status to localStorage
  const saveSyncStatus = useCallback((status: SyncStatus, projectId?: number) => {
    try {
      localStorage.setItem(
        projectId ? `${SYNC_STATUS_KEY}-${projectId}` : SYNC_STATUS_KEY,
        JSON.stringify(status),
      );
    } catch {
      console.error('Failed to save sync status');
    }
  }, []);

  // Create a new project on the backend
  const createProject = useCallback(
    async (projectData: Omit<AtterbergProjectState, 'records'>) => {
      try {
        const response = await api.create('projects', {
          name: projectData.projectName || 'Untitled Project',
          client_name: projectData.clientName,
          project_date: new Date().toISOString().split('T')[0],
        });
        return (response.data as { id: number; name: string }).id;
      } catch (error) {
        console.error('Failed to create project:', error);
        throw error;
      }
    },
    [api],
  );

  // Load project data from backend
  const loadFromBackend = useCallback(
    async (projectId: number): Promise<AtterbergProjectState> => {
      try {
        saveSyncStatus({ projectId, syncStatus: 'syncing' });

        // Load project metadata
        const projectResponse = await api.read<{
          id: number;
          name: string;
          client_name?: string;
          created_at: string;
        }>('projects', projectId);

        const project = projectResponse.data;

        // Load all test results for this project
        const testsResponse = await api.list<{
          id: number;
          test_key: string;
          payload_json: string;
        }>('test_results', {
          offset: 0,
          limit: 1000,
        });

        // Filter test results for this project
        const projectTests = testsResponse.data.filter((t) => {
          const payload = JSON.parse(t.payload_json);
          return payload.projectId === projectId;
        });

        // Parse and reconstruct project state
        const records: AtterbergRecord[] = projectTests
          .filter((t) => t.test_key === 'atterberg')
          .map((t) => {
            const payload = JSON.parse(t.payload_json) as AtterbergProjectState;
            return payload.records?.[0] || null;
          })
          .filter((r): r is AtterbergRecord => r !== null);

        const state: AtterbergProjectState = {
          projectName: project.name,
          clientName: project.client_name,
          records,
        };

        // Save to local cache
        saveLocalCache(state, projectId);
        saveSyncStatus({
          projectId,
          syncStatus: 'synced',
          lastSyncedAt: new Date().toISOString(),
        });

        return state;
      } catch (error) {
        console.error('Failed to load from backend:', error);
        saveSyncStatus({
          projectId,
          syncStatus: 'error',
          error: error instanceof Error ? error.message : 'Sync failed',
        });
        throw error;
      }
    },
    [api, saveLocalCache, saveSyncStatus],
  );

  // Sync project data to backend
  const syncToBackend = useCallback(
    async (projectId: number, data: AtterbergProjectState) => {
      try {
        saveSyncStatus({ projectId, syncStatus: 'syncing' });

        // Update project metadata
        await api.update('projects', projectId, {
          name: data.projectName || 'Untitled Project',
          client_name: data.clientName,
        });

        // Save records as test results
        for (const record of data.records) {
          const payload: AtterbergProjectState = {
            projectName: data.projectName,
            clientName: data.clientName,
            records: [record],
          };

          // Try to find existing test result or create new one
          try {
            const testsResponse = await api.list<{
              id: number;
              payload_json: string;
            }>('test_results', { limit: 1000 });

            const existing = testsResponse.data.find((t) => {
              const p = JSON.parse(t.payload_json);
              return p.records?.[0]?.id === record.id;
            });

            if (existing) {
              await api.update('test_results', existing.id, {
                payload_json: JSON.stringify(payload),
              });
            } else {
              await api.create('test_results', {
                project_id: projectId,
                test_key: 'atterberg',
                name: record.title,
                category: 'soil',
                status: 'completed',
                data_points: record.tests.length,
                payload_json: JSON.stringify(payload),
                key_results_json: JSON.stringify(record.results),
              });
            }
          } catch (error) {
            console.error('Failed to sync record:', error);
            // Continue with other records
          }
        }

        // Save to local cache
        saveLocalCache(data, projectId);
        saveSyncStatus({
          projectId,
          syncStatus: 'synced',
          lastSyncedAt: new Date().toISOString(),
        });
      } catch (error) {
        console.error('Failed to sync to backend:', error);
        saveSyncStatus({
          projectId,
          syncStatus: 'error',
          error: error instanceof Error ? error.message : 'Sync failed',
        });
        throw error;
      }
    },
    [api, saveLocalCache, saveSyncStatus],
  );

  // Auto-sync helper with debounce
  const createAutoSyncHandler = useCallback(
    (projectId: number, data: AtterbergProjectState) => {
      let timeoutId: NodeJS.Timeout;

      return () => {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => {
          syncToBackend(projectId, data).catch((error) => {
            console.error('Auto-sync failed:', error);
          });
        }, 5000); // Debounce 5 seconds
      };
    },
    [syncToBackend],
  );

  return {
    loadLocalCache,
    saveLocalCache,
    getSyncStatus,
    saveSyncStatus,
    createProject,
    loadFromBackend,
    syncToBackend,
    createAutoSyncHandler,
  };
}
