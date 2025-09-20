/**
 * Offline Manager Service
 * Handles all offline operations, local data management, and coordinates sync
 */

import { indexedDBManager, RoomAssignmentLocal, SyncQueueItem } from './indexeddb';
import { RoomAssignment, ServiceStatus, UpdateRoomAssignmentData } from '@/types/room';
import { backgroundSyncService } from './background-sync';
import { v4 as uuidv4 } from 'uuid';

export interface OfflineManagerEvents {
  'data-updated': (roomId: string) => void;
  'sync-status-changed': (status: 'idle' | 'syncing' | 'error') => void;
  'room-updated': (room: RoomAssignmentLocal) => void;
}

type EventCallback<K extends keyof OfflineManagerEvents> = OfflineManagerEvents[K];

class OfflineManager {
  private initialized = false;
  private eventListeners: Map<keyof OfflineManagerEvents, EventCallback<any>[]> = new Map();
  private syncStatus: 'idle' | 'syncing' | 'error' = 'idle';

  async init(): Promise<void> {
    if (this.initialized) return;

    try {
      await indexedDBManager.init();
      
      // Setup background sync event listeners
      backgroundSyncService.on('sync-started', () => {
        this.setSyncStatus('syncing');
      });

      backgroundSyncService.on('sync-completed', (results) => {
        this.setSyncStatus('idle');
        // Emit room-updated events for successfully synced items
        results.forEach(result => {
          if (result.success) {
            this.emit('data-updated', result.itemId);
          }
        });
      });

      backgroundSyncService.on('sync-failed', () => {
        this.setSyncStatus('error');
      });

      backgroundSyncService.on('item-synced', async (item) => {
        // Refresh the room data and emit update event
        const room = await indexedDBManager.getRoomAssignment(item.roomId);
        if (room) {
          this.emit('room-updated', room);
        }
      });

      this.initialized = true;
      console.log('OfflineManager initialized successfully with background sync');
    } catch (error) {
      console.error('Failed to initialize OfflineManager:', error);
      throw error;
    }
  }

  private ensureInitialized(): void {
    if (!this.initialized) {
      throw new Error('OfflineManager not initialized. Call init() first.');
    }
  }

  // Event Management
  on<K extends keyof OfflineManagerEvents>(event: K, callback: OfflineManagerEvents[K]): void {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, []);
    }
    this.eventListeners.get(event)!.push(callback);
  }

  off<K extends keyof OfflineManagerEvents>(event: K, callback: OfflineManagerEvents[K]): void {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      const index = listeners.indexOf(callback);
      if (index > -1) {
        listeners.splice(index, 1);
      }
    }
  }

  private emit<K extends keyof OfflineManagerEvents>(event: K, ...args: Parameters<OfflineManagerEvents[K]>): void {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      listeners.forEach(callback => {
        try {
          (callback as any)(...args);
        } catch (error) {
          console.error(`Error in event listener for ${event}:`, error);
        }
      });
    }
  }

  // Data Conversion Utilities
  private convertToLocal(room: RoomAssignment): RoomAssignmentLocal {
    // Helper function to safely convert dates to ISO strings
    const toISOString = (date: Date | string): string => {
      if (typeof date === 'string') {
        return date; // Already a string, assume it's in ISO format
      }
      return date.toISOString();
    };

    return {
      id: room.id, // Fixed: Use number type directly
      roomNumber: room.roomNumber,
      status: room.status,
      priority: room.priority,
      occupancy: room.occupancy,
      checkoutTime: room.checkoutTime,
      estimatedTime: room.estimatedTime,
      notes: room.notes,
      guestCheckout: room.guestCheckout,
      nextCheckin: room.nextCheckin,
      guestName: room.guestName,
      occupancyStatus: room.occupancyStatus,
      bedType: room.bedType,
      serviceStatus: room.serviceStatus,
      assignedTo: room.assignedTo,
      createdAt: toISOString(room.createdAt),
      updatedAt: toISOString(room.updatedAt),
      lastSyncedAt: new Date().toISOString(),
      isDirty: false
    };
  }

  private convertFromLocal(room: RoomAssignmentLocal): RoomAssignment {
    return {
      id: room.id, // Now correctly using number type
      roomNumber: room.roomNumber,
      status: room.status as any,
      priority: room.priority as any,
      occupancy: room.occupancy as any,
      checkoutTime: room.checkoutTime,
      estimatedTime: room.estimatedTime,
      notes: room.notes,
      guestCheckout: room.guestCheckout,
      nextCheckin: room.nextCheckin,
      guestName: room.guestName,
      occupancyStatus: room.occupancyStatus,
      bedType: room.bedType,
      serviceStatus: room.serviceStatus as ServiceStatus,
      assignedTo: room.assignedTo,
      createdAt: new Date(room.createdAt),
      updatedAt: new Date(room.updatedAt)
    };
  }

  // Room Data Operations
  async getAllRooms(): Promise<RoomAssignment[]> {
    this.ensureInitialized();
    
    try {
      const localRooms = await indexedDBManager.getAllRoomAssignments();
      const convertedRooms = localRooms.map(room => this.convertFromLocal(room));
      
      // Additional deduplication safeguard at the source
      const roomMap = new Map<number, RoomAssignment>(); // Fixed: Use number for room ID
      convertedRooms.forEach(room => {
        const existing = roomMap.get(room.id);
        if (!existing || new Date(room.updatedAt).getTime() > new Date(existing.updatedAt).getTime()) {
          roomMap.set(room.id, room);
        }
      });
      
      const deduplicatedRooms = Array.from(roomMap.values());
      console.log(`🔄 OfflineManager: getAllRooms - Input: ${localRooms.length}, Output: ${deduplicatedRooms.length}`);
      
      return deduplicatedRooms;
    } catch (error) {
      console.error('Failed to get all rooms:', error);
      throw error;
    }
  }

  async getRoom(roomId: number): Promise<RoomAssignment | null> { // Fixed: Use number for roomId
    this.ensureInitialized();
    
    try {
      const localRoom = await indexedDBManager.getRoomAssignment(roomId);
      return localRoom ? this.convertFromLocal(localRoom) : null;
    } catch (error) {
      console.error('Failed to get room:', error);
      throw error;
    }
  }

  async updateRoom(roomId: number, updateData: UpdateRoomAssignmentData): Promise<RoomAssignment> { // Fixed: Use number for roomId
    this.ensureInitialized();
    
    try {
      // Get current room data
      const currentRoom = await indexedDBManager.getRoomAssignment(roomId);
      
      if (!currentRoom) {
        throw new Error(`Room ${roomId} not found in local storage`);
      }

      // Create updated room with version tracking
      const now = new Date().toISOString();
      const updatedRoom: RoomAssignmentLocal = {
        ...currentRoom,
        ...updateData,
        updatedAt: now,
        isDirty: true, // Mark as having local changes
        version: (currentRoom.version || 0) + 1 // Add version tracking
      };

      // Save to local storage
      await indexedDBManager.saveRoomAssignment(updatedRoom);

      // Add to sync queue with version info
      const syncItem: SyncQueueItem = {
        id: uuidv4(),
        roomId: roomId,
        changeType: 'update',
        data: { ...updateData, version: updatedRoom.version },
        syncStatus: 'pending',
        retryCount: 0,
        createdAt: now
      };

      await indexedDBManager.addToSyncQueue(syncItem);

      // Emit events with debouncing and version info
      setTimeout(() => {
        this.emit('room-updated', updatedRoom);
        // Don't emit data-updated separately to prevent duplicate events
      }, 100);

      return this.convertFromLocal(updatedRoom);
    } catch (error) {
      console.error('Failed to update room:', error);
      throw error;
    }
  }

  async bulkUpdateRooms(updates: Array<{ roomId: number; data: UpdateRoomAssignmentData }>): Promise<RoomAssignment[]> { // Fixed: Use number for roomId
    this.ensureInitialized();
    
    try {
      const updatedRooms: RoomAssignmentLocal[] = [];
      const syncItems: SyncQueueItem[] = [];

      // Process all updates
      for (const update of updates) {
        const currentRoom = await indexedDBManager.getRoomAssignment(update.roomId);
        
        if (!currentRoom) {
          console.warn(`Room ${update.roomId} not found, skipping update`);
          continue;
        }

        const updatedRoom: RoomAssignmentLocal = {
          ...currentRoom,
          ...update.data,
          updatedAt: new Date().toISOString(),
          isDirty: true
        };

        updatedRooms.push(updatedRoom);

        // Create sync item for each update
        syncItems.push({
          id: uuidv4(),
          roomId: update.roomId,
          changeType: 'update',
          data: update.data,
          syncStatus: 'pending',
          retryCount: 0,
          createdAt: new Date().toISOString()
        });
      }

      // Save all updates
      await indexedDBManager.saveMultipleRoomAssignments(updatedRooms);

      // Add all to sync queue
      for (const syncItem of syncItems) {
        await indexedDBManager.addToSyncQueue(syncItem);
      }

      // Emit events
      updatedRooms.forEach(room => {
        this.emit('room-updated', room);
        // Don't emit data-updated separately to prevent duplicate events
      });

      return updatedRooms.map(room => this.convertFromLocal(room));
    } catch (error) {
      console.error('Failed to bulk update rooms:', error);
      throw error;
    }
  }

  // Server Data Sync
  async syncFromServer(serverRooms: RoomAssignment[]): Promise<void> {
    this.ensureInitialized();
    
    try {
      this.setSyncStatus('syncing');

      const localRooms = new Map<string, RoomAssignmentLocal>();
      const existingRooms = await indexedDBManager.getAllRoomAssignments();
      
      // Create map of existing local rooms
      existingRooms.forEach(room => {
        localRooms.set(room.id.toString(), room);
      });

      const roomsToSave: RoomAssignmentLocal[] = [];

      // Process server rooms
      for (const serverRoom of serverRooms) {
        const localRoom = localRooms.get(serverRoom.id.toString()); // Convert to string for map lookup
        
        if (!localRoom) {
          // New room from server
          roomsToSave.push(this.convertToLocal(serverRoom));
        } else if (!localRoom.isDirty) {
          // Room exists locally but no local changes, update from server
          const updatedRoom = this.convertToLocal(serverRoom);
          updatedRoom.lastSyncedAt = new Date().toISOString();
          roomsToSave.push(updatedRoom);
        }
        // If room is dirty (has local changes), keep local version for now
        // Conflict resolution will be handled separately
      }

      // Save updated rooms
      if (roomsToSave.length > 0) {
        await indexedDBManager.saveMultipleRoomAssignments(roomsToSave);
      }

      this.setSyncStatus('idle');
      console.log(`Synced ${roomsToSave.length} rooms from server`);
    } catch (error) {
      console.error('Failed to sync from server:', error);
      this.setSyncStatus('error');
      throw error;
    }
  }

  // Sync Queue Management
  async getPendingSyncItems(): Promise<SyncQueueItem[]> {
    this.ensureInitialized();
    return await indexedDBManager.getPendingSyncItems();
  }

  async markSyncItemCompleted(syncItemId: string): Promise<void> {
    this.ensureInitialized();
    await indexedDBManager.removeSyncQueueItem(syncItemId);
  }

  async markSyncItemFailed(syncItemId: string, error: string): Promise<void> {
    this.ensureInitialized();
    
    const syncItems = await indexedDBManager.getSyncQueue();
    const item = syncItems.find(item => item.id === syncItemId);
    
    if (item) {
      item.syncStatus = 'failed';
      item.retryCount += 1;
      item.lastAttemptAt = new Date().toISOString();
      item.error = error;
      
      await indexedDBManager.updateSyncQueueItem(item);
    }
  }

  // Status Management
  private setSyncStatus(status: 'idle' | 'syncing' | 'error'): void {
    if (this.syncStatus !== status) {
      this.syncStatus = status;
      this.emit('sync-status-changed', status);
    }
  }

  getSyncStatus(): 'idle' | 'syncing' | 'error' {
    return this.syncStatus;
  }

  // Utility Methods
  async getDirtyRooms(): Promise<RoomAssignmentLocal[]> {
    this.ensureInitialized();
    
    const allRooms = await indexedDBManager.getAllRoomAssignments();
    return allRooms.filter(room => room.isDirty);
  }

  async clearAllData(): Promise<void> {
    this.ensureInitialized();
    await indexedDBManager.clearAllData();
  }

  async getLastSyncTime(): Promise<Date | null> {
    this.ensureInitialized();
    
    const timestamp = await indexedDBManager.getMetadata('lastSyncTime');
    return timestamp ? new Date(timestamp) : null;
  }

  async setLastSyncTime(time: Date): Promise<void> {
    this.ensureInitialized();
    await indexedDBManager.setMetadata('lastSyncTime', time.toISOString());
  }
}

// Singleton instance
export const offlineManager = new OfflineManager();