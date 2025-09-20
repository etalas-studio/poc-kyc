/**
 * Sync Service
 * Handles background synchronization between local storage and server
 */

import { offlineManager } from './offline-manager';
import { indexedDBManager, SyncQueueItem, RoomAssignmentLocal } from './indexeddb';
import { RoomAssignment } from '@/types/room';

export interface SyncResult {
  success: boolean;
  syncedItems: number;
  failedItems: number;
  errors: string[];
}

export interface SyncOptions {
  maxRetries?: number;
  retryDelay?: number;
  batchSize?: number;
}

class SyncService {
  private isOnline = true;
  private isSyncing = false;
  private syncInterval: NodeJS.Timeout | null = null;
  private readonly defaultOptions: Required<SyncOptions> = {
    maxRetries: 3,
    retryDelay: 5000, // 5 seconds
    batchSize: 10
  };

  constructor() {
    this.setupNetworkListeners();
  }

  private setupNetworkListeners(): void {
    if (typeof window !== 'undefined') {
      // Listen for online/offline events
      const handleOnline = () => {
        this.isOnline = true;
        console.log('Network: Online - triggering sync');
        this.triggerSync();
      };

      const handleOffline = () => {
        this.isOnline = false;
        console.log('Network: Offline');
      };

      window.addEventListener('online', handleOnline);
      window.addEventListener('offline', handleOffline);

      // Initial network status
      this.isOnline = navigator.onLine;
    }
  }

  async init(): Promise<void> {
    await offlineManager.init();
    
    // Start periodic sync
    this.startPeriodicSync();
    
    // Initial sync if online
    if (this.isOnline) {
      await this.triggerSync();
    }
  }

  private startPeriodicSync(): void {
    // Sync every 5 minutes
    this.syncInterval = setInterval(() => {
      if (this.isOnline && !this.isSyncing) {
        this.triggerSync();
      }
    }, 5 * 60 * 1000);
  }

  stopPeriodicSync(): void {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
    }
  }

  async triggerSync(options: SyncOptions = {}): Promise<SyncResult> {
    if (!this.isOnline) {
      return {
        success: false,
        syncedItems: 0,
        failedItems: 0,
        errors: ['Device is offline']
      };
    }

    if (this.isSyncing) {
      console.log('Sync already in progress, skipping');
      return {
        success: false,
        syncedItems: 0,
        failedItems: 0,
        errors: ['Sync already in progress']
      };
    }

    this.isSyncing = true;
    const mergedOptions = { ...this.defaultOptions, ...options };

    try {
      console.log('Starting sync process...');
      
      // Step 1: Sync from server (pull latest data)
      await this.syncFromServer();
      
      // Step 2: Sync to server (push local changes)
      const result = await this.syncToServer(mergedOptions);
      
      // Update last sync time
      await offlineManager.setLastSyncTime(new Date());
      
      console.log('Sync completed:', result);
      return result;
      
    } catch (error) {
      console.error('Sync failed:', error);
      return {
        success: false,
        syncedItems: 0,
        failedItems: 0,
        errors: [error instanceof Error ? error.message : 'Unknown sync error']
      };
    } finally {
      this.isSyncing = false;
    }
  }

  private async syncFromServer(): Promise<void> {
    try {
      console.log('Syncing from server...');
      
      // Fetch latest room assignments from server using API route
      const response = await fetch('/api/room-assignments');
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const serverRoomsRaw = await response.json();
      
      // Convert server data to match RoomAssignment interface (id as string)
      const serverRooms: RoomAssignment[] = serverRoomsRaw.map((room: any) => ({
        ...room,
        id: room.id.toString()
      }));
      
      // Update local storage with server data
      await offlineManager.syncFromServer(serverRooms);
      
      console.log(`Synced ${serverRooms.length} rooms from server`);
    } catch (error) {
      console.error('Failed to sync from server:', error);
      throw new Error('Failed to fetch data from server');
    }
  }

  private async syncToServer(options: Required<SyncOptions>): Promise<SyncResult> {
    const result: SyncResult = {
      success: true,
      syncedItems: 0,
      failedItems: 0,
      errors: []
    };

    try {
      // Get pending sync items
      const pendingItems = await offlineManager.getPendingSyncItems();
      
      if (pendingItems.length === 0) {
        console.log('No pending items to sync');
        return result;
      }

      console.log(`Syncing ${pendingItems.length} pending items to server...`);

      // Process items in batches
      const batches = this.createBatches(pendingItems, options.batchSize);
      
      for (const batch of batches) {
        await this.processBatch(batch, options, result);
      }

      result.success = result.failedItems === 0;
      
    } catch (error) {
      console.error('Failed to sync to server:', error);
      result.success = false;
      result.errors.push(error instanceof Error ? error.message : 'Unknown error');
    }

    return result;
  }

  private createBatches<T>(items: T[], batchSize: number): T[][] {
    const batches: T[][] = [];
    for (let i = 0; i < items.length; i += batchSize) {
      batches.push(items.slice(i, i + batchSize));
    }
    return batches;
  }

  private async processBatch(
    batch: SyncQueueItem[], 
    options: Required<SyncOptions>, 
    result: SyncResult
  ): Promise<void> {
    for (const item of batch) {
      try {
        await this.syncSingleItem(item);
        
        // Mark as completed and remove from queue
        await offlineManager.markSyncItemCompleted(item.id);
        result.syncedItems++;
        
        console.log(`Successfully synced item ${item.id} for room ${item.roomId}`);
        
      } catch (error) {
        console.error(`Failed to sync item ${item.id}:`, error);
        
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        result.errors.push(`Room ${item.roomId}: ${errorMessage}`);
        
        // Handle retry logic
        if (item.retryCount < options.maxRetries) {
          await offlineManager.markSyncItemFailed(item.id, errorMessage);
          console.log(`Item ${item.id} will be retried (attempt ${item.retryCount + 1}/${options.maxRetries})`);
        } else {
          // Max retries reached, remove from queue
          await offlineManager.markSyncItemCompleted(item.id);
          console.error(`Item ${item.id} exceeded max retries, removing from queue`);
        }
        
        result.failedItems++;
      }
    }
  }

  private async syncSingleItem(item: SyncQueueItem): Promise<void> {
    switch (item.changeType) {
      case 'update':
        await this.syncRoomUpdate(item);
        break;
      case 'bulk_update':
        await this.syncBulkUpdate(item);
        break;
      default:
        throw new Error(`Unknown change type: ${item.changeType}`);
    }
  }

  private async syncRoomUpdate(item: SyncQueueItem): Promise<void> {
    try {
      // Ensure roomId is treated as number for consistency
      const roomId = typeof item.roomId === 'string' ? parseInt(item.roomId, 10) : item.roomId;
      
      if (isNaN(roomId)) {
        throw new Error(`Invalid roomId: ${item.roomId}`);
      }

      // Get the latest local data to ensure we're syncing current state
      const localRoom = await indexedDBManager.getRoomAssignment(roomId);
      
      if (!localRoom) {
        console.warn(`Room ${roomId} not found locally, marking sync as completed`);
        return;
      }

      // Prepare data for server update - filter out internal fields
      const { version, isDirty, lastSyncedAt, ...cleanData } = item.data;
      const updateData = {
        ...cleanData
        // Remove id and updatedAt as they shouldn't be sent in the request body
      };

      // Call server API with proper ID type
      const response = await fetch(`/api/room-assignments/${roomId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updateData),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Server update failed: ${response.status} - ${errorText}`);
      }

      const serverRoom = await response.json();

      // Update local storage with server response to maintain consistency
      const updatedLocalRoom: RoomAssignmentLocal = {
        ...localRoom,
        ...serverRoom,
        id: roomId, // Ensure ID remains number
        isDirty: false, // Mark as clean since it's synced
        updatedAt: serverRoom.updatedAt || new Date().toISOString()
      };

      await indexedDBManager.saveRoomAssignment(updatedLocalRoom);

      console.log(`Successfully synced room ${roomId} update`);
    } catch (error) {
      console.error(`Failed to sync room update for item ${item.id}:`, error);
      throw error;
    }
  }

  private async syncBulkUpdate(item: SyncQueueItem): Promise<void> {
    // For now, treat bulk updates as individual updates
    // In the future, this could be optimized with a dedicated bulk API endpoint
    await this.syncRoomUpdate(item);
  }

  // Public methods for manual sync control
  async forceSyncNow(): Promise<SyncResult> {
    return await this.triggerSync({ maxRetries: 1 });
  }

  async syncSpecificRoom(roomId: number): Promise<boolean> {
    if (!this.isOnline) {
      return false;
    }

    try {
      const pendingItems = await offlineManager.getPendingSyncItems();
      const roomItems = pendingItems.filter(item => item.roomId === roomId);
      
      if (roomItems.length === 0) {
        return true; // Nothing to sync
      }

      for (const item of roomItems) {
        await this.syncSingleItem(item);
        await offlineManager.markSyncItemCompleted(item.id);
      }

      return true;
    } catch (error) {
      console.error(`Failed to sync room ${roomId}:`, error);
      return false;
    }
  }

  // Status methods
  isOnlineStatus(): boolean {
    return this.isOnline;
  }

  isSyncingStatus(): boolean {
    return this.isSyncing;
  }

  async getPendingCount(): Promise<number> {
    const pendingItems = await offlineManager.getPendingSyncItems();
    return pendingItems.length;
  }

  async getLastSyncTime(): Promise<Date | null> {
    return await offlineManager.getLastSyncTime();
  }

  // Cleanup
  destroy(): void {
    this.stopPeriodicSync();
    
    // Note: Event listeners are already properly set up in setupNetworkListeners
    // No need to remove them here as they're handled by the browser
  }
}

// Singleton instance
export const syncService = new SyncService();