import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { RoomAssignment, CreateRoomAssignmentData, UpdateRoomAssignmentData } from '@/types/room';
import { offlineManager } from '@/lib/offline/offline-manager';
import { backgroundSyncService } from '@/lib/offline/background-sync';
import { useEffect } from 'react';
import { toast } from 'react-toastify';

// Query keys
export const roomAssignmentKeys = {
  all: ['room-assignments'] as const,
  lists: () => [...roomAssignmentKeys.all, 'list'] as const,
  list: (filters?: any) => [...roomAssignmentKeys.lists(), { filters }] as const,
  details: () => [...roomAssignmentKeys.all, 'detail'] as const,
  detail: (id: string) => [...roomAssignmentKeys.details(), id] as const,
};

// Offline-first data fetcher that prioritizes IndexedDB
async function fetchRoomAssignmentsUnified(): Promise<RoomAssignment[]> {
  console.log('🔄 fetchRoomAssignmentsUnified: Starting data fetch');
  
  try {
    console.log('🔄 fetchRoomAssignmentsUnified: Initializing offline manager');
    // Ensure offline manager is initialized before using it
    await offlineManager.init();
    console.log('✅ fetchRoomAssignmentsUnified: Offline manager initialized');
    
    console.log('🔄 fetchRoomAssignmentsUnified: Getting local rooms from IndexedDB');
    // Always return IndexedDB data first (offline-first approach)
    const localRooms = await offlineManager.getAllRooms();
    console.log(`📊 fetchRoomAssignmentsUnified: Found ${localRooms.length} local rooms`);
    
    // If we have local data, return it immediately
    if (localRooms.length > 0) {
      console.log('✅ fetchRoomAssignmentsUnified: Returning cached room assignments from IndexedDB');
      return localRooms;
    }

    // If no local data and we're online, fetch from server
    const isOnline = typeof window !== 'undefined' ? navigator.onLine : false;
    console.log(`🌐 fetchRoomAssignmentsUnified: Online status: ${isOnline}`);
    
    if (isOnline) {
      console.log('🔄 fetchRoomAssignmentsUnified: No local data found, fetching from server');
      const response = await fetch('/api/room-assignments');
      console.log(`📡 fetchRoomAssignmentsUnified: Server response status: ${response.status}`);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch room assignments from server: ${response.status}`);
      }
      const serverRooms = await response.json();
      console.log(`📊 fetchRoomAssignmentsUnified: Received ${serverRooms.length} rooms from server`);
      
      // Store in IndexedDB for future offline access
      console.log('🔄 fetchRoomAssignmentsUnified: Syncing server data to IndexedDB');
      await offlineManager.syncFromServer(serverRooms);
      console.log('✅ fetchRoomAssignmentsUnified: Server data synced to IndexedDB');
      
      return serverRooms;
    }

    // Offline with no local data
    console.log('⚠️ fetchRoomAssignmentsUnified: Offline with no cached data available');
    return [];
  } catch (error) {
    console.error('❌ fetchRoomAssignmentsUnified: Error occurred:', error);
    
    // Fallback to local data even if there was an error
    try {
      console.log('🔄 fetchRoomAssignmentsUnified: Attempting fallback to local data');
      const localRooms = await offlineManager.getAllRooms();
      console.log(`📊 fetchRoomAssignmentsUnified: Fallback found ${localRooms.length} local rooms`);
      console.log('✅ fetchRoomAssignmentsUnified: Returning fallback data from IndexedDB due to error');
      return localRooms;
    } catch (localError) {
      console.error('❌ fetchRoomAssignmentsUnified: Failed to get fallback data from IndexedDB:', localError);
      return [];
    }
  }
}

export function useRoomAssignments() {
  const queryClient = useQueryClient();

  // Initialize offline manager and setup event listeners
  useEffect(() => {
    let mounted = true;
    console.log('🔄 useRoomAssignments: Starting initialization effect');

    const initializeOfflineFirst = async () => {
      try {
        console.log('🔄 useRoomAssignments: Initializing offline manager');
        await offlineManager.init();
        console.log('✅ useRoomAssignments: Offline manager initialized');
        
        if (!mounted) {
          console.log('⚠️ useRoomAssignments: Component unmounted during initialization');
          return;
        }

        // Listen for room updates from offline manager
        // Enhanced debounced invalidation to prevent cascade effects
        let invalidationTimeout: NodeJS.Timeout | null = null;
        let lastInvalidationTime = 0;
        const INVALIDATION_COOLDOWN = 1000; // 1 second cooldown between invalidations
        
        const debouncedInvalidation = (source: string = 'unknown') => {
          const now = Date.now();
          
          // Skip if we just invalidated recently (cooldown period)
          if (now - lastInvalidationTime < INVALIDATION_COOLDOWN) {
            console.log(`⏭️ useRoomAssignments: Skipping invalidation from ${source} (cooldown active)`);
            return;
          }
          
          if (invalidationTimeout) {
            clearTimeout(invalidationTimeout);
          }
          
          invalidationTimeout = setTimeout(() => {
            console.log(`🔄 useRoomAssignments: Invalidating queries from ${source}`);
            queryClient.invalidateQueries({ queryKey: roomAssignmentKeys.all });
            lastInvalidationTime = Date.now();
          }, 500); // Increased debounce time
        };

        const handleRoomUpdated = (room: any) => {
          console.log('🔄 useRoomAssignments: Room updated via offline manager:', room.id);
          debouncedInvalidation('room-updated');
        };

        const handleDataUpdated = (roomId: string) => {
          console.log('🔄 useRoomAssignments: Data updated for room:', roomId);
          // Skip data-updated events if we just handled a room-updated event
          // This prevents duplicate invalidations for the same change
          debouncedInvalidation('data-updated');
        };

        const handleSyncStatusChanged = (status: 'idle' | 'syncing' | 'error') => {
          console.log('🔄 useRoomAssignments: Sync status changed:', status);
          if (status === 'idle') {
            // Only refresh after sync completion, not for individual room updates
            debouncedInvalidation('sync-completed');
          }
        };

        // Setup event listeners
        console.log('🔄 useRoomAssignments: Setting up event listeners');
        offlineManager.on('room-updated', handleRoomUpdated);
        offlineManager.on('data-updated', handleDataUpdated);
        offlineManager.on('sync-status-changed', handleSyncStatusChanged);

        // Listen for background sync events
        backgroundSyncService.on('sync-completed', (results) => {
          console.log('🔄 useRoomAssignments: Background sync completed:', results);
          // Only invalidate if sync actually completed successfully
          if (results && results.length > 0) {
            debouncedInvalidation('background-sync-completed');
          }
        });

        // Listen for network status changes
        const handleOnline = () => {
          console.log('🌐 useRoomAssignments: Network restored, triggering background sync');
          backgroundSyncService.forcSync();
          // Don't immediately invalidate - let the sync completion handle it
        };

        const handleOffline = () => {
          console.log('🌐 useRoomAssignments: Network lost, switching to offline-only mode');
        };

        if (typeof window !== 'undefined') {
          window.addEventListener('online', handleOnline);
          window.addEventListener('offline', handleOffline);
        }

        console.log('✅ useRoomAssignments: All event listeners set up successfully');

        // Cleanup function
        return () => {
          console.log('🧹 useRoomAssignments: Cleaning up event listeners');
          offlineManager.off('room-updated', handleRoomUpdated);
          offlineManager.off('data-updated', handleDataUpdated);
          offlineManager.off('sync-status-changed', handleSyncStatusChanged);
          if (typeof window !== 'undefined') {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
          }
        };
      } catch (error) {
        console.error('❌ useRoomAssignments: Failed to initialize offline-first system:', error);
      }
    };

    const cleanup = initializeOfflineFirst();

    return () => {
      console.log('🧹 useRoomAssignments: Component cleanup');
      mounted = false;
      cleanup.then(cleanupFn => cleanupFn?.());
    };
  }, [queryClient]);

  return useQuery({
    queryKey: roomAssignmentKeys.all,
    queryFn: fetchRoomAssignmentsUnified,
    staleTime: 1000 * 60 * 5, // Consider data fresh for 5 minutes
    gcTime: 1000 * 60 * 30, // Keep in cache for 30 minutes
    refetchOnWindowFocus: false, // Don't refetch on focus, rely on offline-first approach
    refetchOnReconnect: false, // Don't auto-refetch on reconnect, let event handlers manage it
    retry: (failureCount, error) => {
      // Don't retry if offline, let offline manager handle it
      if (!navigator.onLine) return false;
      return failureCount < 2;
    },
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  });
}

// API functions
async function createRoomAssignment(data: CreateRoomAssignmentData): Promise<RoomAssignment> {
  const response = await fetch('/api/room-assignments', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to create room assignment');
  }
  
  return response.json();
}

export function useCreateRoomAssignment() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: createRoomAssignment,
    onSuccess: () => {
      // Invalidate and refetch room assignments
      queryClient.invalidateQueries({ queryKey: roomAssignmentKeys.all });
    },
  });
}

export function useUpdateRoomAssignment() {
  const queryClient = useQueryClient();
  
  const updateRoomAssignment = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: UpdateRoomAssignmentData }) => {
      // Update locally first for immediate UI feedback
      await offlineManager.updateRoom(id, data);
      
      // The sync service will handle server synchronization
      return { id, ...data };
    },
    onSuccess: (data) => {
      // Don't invalidate immediately - let the event system handle it
      // This prevents duplicate invalidations and race conditions
      
      // Show success message
      toast.success('Room updated successfully');
    },
    onError: (error) => {
      console.error('Failed to update room:', error);
      toast.error('Failed to update room');
      
      // Only invalidate on error to refresh from source
      queryClient.invalidateQueries({ queryKey: ['room-assignments'] });
    },
  });
  
  return updateRoomAssignment;
}

// Additional utility hooks
export function useRoomAssignmentsByStatus(status?: string) {
  const { data: assignments, ...rest } = useRoomAssignments();
  
  const filteredAssignments = assignments?.filter(assignment => 
    !status || assignment.status === status
  );
  
  return {
    data: filteredAssignments,
    ...rest,
  };
}

export function useRoomAssignmentsByPriority(priority?: string) {
  const { data: assignments, ...rest } = useRoomAssignments();
  
  const filteredAssignments = assignments?.filter(assignment => 
    !priority || assignment.priority === priority
  );
  
  return {
    data: filteredAssignments,
    ...rest,
  };
}