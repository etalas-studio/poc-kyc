/**
 * Background Sync Service
 * Handles automatic synchronization of offline operations when connection is restored
 */

import { offlineManager } from './offline-manager';
import { indexedDBManager, SyncQueueItem } from './indexeddb';

export interface BackgroundSyncEvents {
  'sync-started': () => void;
  'sync-completed': (results: SyncResult[]) => void;
  'sync-failed': (error: Error) => void;
  'item-synced': (item: SyncQueueItem) => void;
  'item-failed': (item: SyncQueueItem, error: Error) => void;
}

export interface SyncResult {
  itemId: string;
  success: boolean;
  error?: string;
}

class BackgroundSyncService {
  private isOnline = typeof window !== 'undefined' ? navigator.onLine : true;
  private syncInProgress = false;
  private syncInterval: NodeJS.Timeout | null = null;
  private eventListeners: Map<keyof BackgroundSyncEvents, ((...args: any[]) => void)[]> = new Map();
  private retryDelays = [1000, 5000, 15000, 30000, 60000]; // Progressive retry delays

  constructor() {
    // Only setup listeners in browser environment
    if (typeof window !== 'undefined') {
      this.setupNetworkListeners();
      this.startPeriodicSync();
    }
  }

  private setupNetworkListeners(): void {
    if (typeof window === 'undefined') return;
    
    window.addEventListener('online', () => {
      console.log('Network connection restored');
      this.isOnline = true;
      this.emit('sync-started');
      this.syncPendingItems();
    });

    window.addEventListener('offline', () => {
      console.log('Network connection lost');
      this.isOnline = false;
    });
  }

  private startPeriodicSync(): void {
    // Sync every 30 seconds when online
    this.syncInterval = setInterval(() => {
      if (this.isOnline && !this.syncInProgress) {
        this.syncPendingItems();
      }
    }, 30000);
  }

  on<K extends keyof BackgroundSyncEvents>(event: K, callback: BackgroundSyncEvents[K]): void {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, []);
    }
    this.eventListeners.get(event)!.push(callback);
  }

  off<K extends keyof BackgroundSyncEvents>(event: K, callback: BackgroundSyncEvents[K]): void {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      const index = listeners.indexOf(callback);
      if (index > -1) {
        listeners.splice(index, 1);
      }
    }
  }

  private emit<K extends keyof BackgroundSyncEvents>(event: K, ...args: Parameters<BackgroundSyncEvents[K]>): void {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      listeners.forEach(callback => {
        try {
          (callback as any)(...args);
        } catch (error) {
          console.error(`Error in ${event} listener:`, error);
        }
      });
    }
  }

  async syncPendingItems(): Promise<SyncResult[]> {
    if (this.syncInProgress || !this.isOnline) {
      return [];
    }

    this.syncInProgress = true;
    const results: SyncResult[] = [];

    try {
      this.emit('sync-started');
      const pendingItems = await indexedDBManager.getPendingSyncItems();
      
      console.log(`Starting sync of ${pendingItems.length} pending items`);

      for (const item of pendingItems) {
        try {
          const result = await this.syncItem(item);
          results.push(result);
          
          if (result.success) {
            this.emit('item-synced', item);
          } else {
            this.emit('item-failed', item, new Error(result.error || 'Sync failed'));
          }
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          results.push({
            itemId: item.id,
            success: false,
            error: errorMessage
          });
          this.emit('item-failed', item, error as Error);
        }
      }

      this.emit('sync-completed', results);
      console.log(`Sync completed. ${results.filter(r => r.success).length}/${results.length} items synced successfully`);

    } catch (error) {
      console.error('Background sync failed:', error);
      this.emit('sync-failed', error as Error);
    } finally {
      this.syncInProgress = false;
    }

    return results;
  }

  private async syncItem(item: SyncQueueItem): Promise<SyncResult> {
    try {
      // Update sync status to 'syncing'
      item.syncStatus = 'syncing';
      item.lastAttemptAt = new Date().toISOString();
      await indexedDBManager.updateSyncQueueItem(item);

      // Perform the actual sync based on change type
      let success = false;
      
      switch (item.changeType) {
        case 'update':
          success = await this.syncRoomUpdate(item);
          break;
        case 'bulk_update':
          success = await this.syncBulkUpdate(item);
          break;
        default:
          throw new Error(`Unknown change type: ${item.changeType}`);
      }

      if (success) {
        // Mark as synced and remove from queue
        await indexedDBManager.removeSyncQueueItem(item.id);
        
        // Update the room's sync status
        const room = await indexedDBManager.getRoomAssignment(item.roomId);
        if (room) {
          room.isDirty = false;
          room.lastSyncedAt = new Date().toISOString();
          await indexedDBManager.saveRoomAssignment(room);
        }

        return { itemId: item.id, success: true };
      } else {
        throw new Error('Sync operation failed');
      }

    } catch (error) {
      // Handle retry logic
      item.retryCount++;
      item.syncStatus = 'failed';
      item.error = error instanceof Error ? error.message : 'Unknown error';

      // Exponential backoff for retries
      if (item.retryCount < this.retryDelays.length) {
        item.syncStatus = 'pending'; // Will retry later
        setTimeout(() => {
          if (this.isOnline && !this.syncInProgress) {
            this.syncPendingItems();
          }
        }, this.retryDelays[item.retryCount - 1]);
      }

      await indexedDBManager.updateSyncQueueItem(item);

      return {
        itemId: item.id,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  private async syncRoomUpdate(item: SyncQueueItem): Promise<boolean> {
    try {
      // Filter out internal fields that shouldn't be sent to the API
      const { version, id, isDirty, lastSyncedAt, createdAt, updatedAt, ...apiData } = item.data;
      
      const response = await fetch(`/api/room-assignments/${item.roomId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(apiData),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const updatedRoom = await response.json();
      
      // Update local storage with server response
      const localRoom = await indexedDBManager.getRoomAssignment(item.roomId);
      if (localRoom) {
        // Only update if server data is newer or equal to avoid overwriting newer local changes
        const serverUpdatedAt = new Date(updatedRoom.updatedAt || 0).getTime();
        const localUpdatedAt = new Date(localRoom.updatedAt || 0).getTime();
        
        if (serverUpdatedAt >= localUpdatedAt) {
          const mergedRoom = {
            ...localRoom,
            ...updatedRoom,
            isDirty: false,
            lastSyncedAt: new Date().toISOString()
          };
          await indexedDBManager.saveRoomAssignment(mergedRoom);
        }
      }

      return true;
    } catch (error) {
      console.error('Failed to sync room update:', error);
      return false;
    }
  }

  private async syncBulkUpdate(item: SyncQueueItem): Promise<boolean> {
    try {
      const response = await fetch('/api/room-assignments/bulk', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(item.data),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      return true;
    } catch (error) {
      console.error('Failed to sync bulk update:', error);
      return false;
    }
  }

  async forcSync(): Promise<SyncResult[]> {
    return this.syncPendingItems();
  }

  getSyncStatus(): { isOnline: boolean; syncInProgress: boolean } {
    return {
      isOnline: this.isOnline,
      syncInProgress: this.syncInProgress
    };
  }

  destroy(): void {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
    }
    
    // Only remove event listeners if in browser environment
    if (typeof window !== 'undefined') {
      window.removeEventListener('online', this.syncPendingItems);
      window.removeEventListener('offline', () => {});
    }
    this.eventListeners.clear();
  }
}

export const backgroundSyncService = new BackgroundSyncService();