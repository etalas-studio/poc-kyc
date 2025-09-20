/**
 * IndexedDB wrapper for offline storage
 * Handles room assignments and sync queue data
 */

export interface DBSchema {
  roomAssignments: {
    key: string;
    value: RoomAssignmentLocal;
  };
  syncQueue: {
    key: string;
    value: SyncQueueItem;
  };
  metadata: {
    key: string;
    value: any;
  };
}

export interface RoomAssignmentLocal {
  id: number; // Fixed: Changed from string to number to match database schema
  roomNumber: string;
  status: string;
  priority: string;
  occupancy: string;
  checkoutTime?: string | null;
  estimatedTime?: string | null;
  notes?: string | null;
  guestCheckout?: string | null;
  nextCheckin?: string | null;
  guestName?: string | null;
  occupancyStatus?: string | null;
  bedType?: string | null;
  serviceStatus: string;
  assignedTo?: string | null;
  createdAt: string;
  updatedAt: string;
  lastSyncedAt?: string;
  isDirty: boolean; // Indicates if local changes exist
  version?: number; // Version tracking for race condition prevention
}

export interface SyncQueueItem {
  id: string;
  roomId: number; // Fixed: Changed from string to number to match database schema
  changeType: 'update' | 'bulk_update';
  data: Record<string, any>;
  syncStatus: 'pending' | 'syncing' | 'synced' | 'failed';
  retryCount: number;
  createdAt: string;
  lastAttemptAt?: string;
  error?: string;
}

class IndexedDBManager {
  private dbName = 'HousekeepingPWA';
  private version = 2; // Increment version to trigger schema update
  private db: IDBDatabase | null = null;

  async init(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.version);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        const transaction = (event.target as IDBOpenDBRequest).transaction!;

        // Room assignments store
        if (!db.objectStoreNames.contains('roomAssignments')) {
          const roomStore = db.createObjectStore('roomAssignments', { keyPath: 'id' });
          roomStore.createIndex('roomNumber', 'roomNumber', { unique: false });
          roomStore.createIndex('isDirty', 'isDirty');
          roomStore.createIndex('updatedAt', 'updatedAt');
        } else {
          // Handle existing store - recreate roomNumber index without unique constraint
          const roomStore = transaction.objectStore('roomAssignments');
          if (roomStore.indexNames.contains('roomNumber')) {
            roomStore.deleteIndex('roomNumber');
          }
          roomStore.createIndex('roomNumber', 'roomNumber', { unique: false });
        }

        // Sync queue store
        if (!db.objectStoreNames.contains('syncQueue')) {
          const syncStore = db.createObjectStore('syncQueue', { keyPath: 'id' });
          syncStore.createIndex('syncStatus', 'syncStatus');
          syncStore.createIndex('createdAt', 'createdAt');
          syncStore.createIndex('roomId', 'roomId');
        }

        // Metadata store for app state
        if (!db.objectStoreNames.contains('metadata')) {
          db.createObjectStore('metadata', { keyPath: 'key' });
        }
      };
    });
  }

  private ensureDB(): IDBDatabase {
    if (!this.db) {
      throw new Error('Database not initialized. Call init() first.');
    }
    return this.db;
  }

  // Room Assignments Operations
  async getRoomAssignment(roomId: number): Promise<RoomAssignmentLocal | null> {
    const db = this.ensureDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['roomAssignments'], 'readonly');
      const store = transaction.objectStore('roomAssignments');
      const request = store.get(roomId);

      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(request.error);
    });
  }

  async getAllRoomAssignments(): Promise<RoomAssignmentLocal[]> {
    const db = this.ensureDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['roomAssignments'], 'readonly');
      const store = transaction.objectStore('roomAssignments');
      const request = store.getAll();

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async saveRoomAssignment(room: RoomAssignmentLocal): Promise<void> {
    const db = this.ensureDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['roomAssignments'], 'readwrite');
      const store = transaction.objectStore('roomAssignments');
      const request = store.put(room);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async saveMultipleRoomAssignments(rooms: RoomAssignmentLocal[]): Promise<void> {
    const db = this.ensureDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['roomAssignments'], 'readwrite');
      const store = transaction.objectStore('roomAssignments');
      
      let completed = 0;
      const total = rooms.length;

      if (total === 0) {
        resolve();
        return;
      }

      rooms.forEach(room => {
        const request = store.put(room);
        request.onsuccess = () => {
          completed++;
          if (completed === total) resolve();
        };
        request.onerror = () => reject(request.error);
      });
    });
  }

  // Sync Queue Operations
  async addToSyncQueue(item: SyncQueueItem): Promise<void> {
    const db = this.ensureDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['syncQueue'], 'readwrite');
      const store = transaction.objectStore('syncQueue');
      const request = store.add(item);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async getSyncQueue(): Promise<SyncQueueItem[]> {
    const db = this.ensureDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['syncQueue'], 'readonly');
      const store = transaction.objectStore('syncQueue');
      const index = store.index('createdAt');
      const request = index.getAll();

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async updateSyncQueueItem(item: SyncQueueItem): Promise<void> {
    const db = this.ensureDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['syncQueue'], 'readwrite');
      const store = transaction.objectStore('syncQueue');
      const request = store.put(item);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async removeSyncQueueItem(id: string): Promise<void> {
    const db = this.ensureDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['syncQueue'], 'readwrite');
      const store = transaction.objectStore('syncQueue');
      const request = store.delete(id);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async getPendingSyncItems(): Promise<SyncQueueItem[]> {
    const db = this.ensureDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['syncQueue'], 'readonly');
      const store = transaction.objectStore('syncQueue');
      const index = store.index('syncStatus');
      const request = index.getAll('pending');

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  // Metadata Operations
  async setMetadata(key: string, value: any): Promise<void> {
    const db = this.ensureDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['metadata'], 'readwrite');
      const store = transaction.objectStore('metadata');
      const request = store.put({ key, value });

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async getMetadata(key: string): Promise<any> {
    const db = this.ensureDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['metadata'], 'readonly');
      const store = transaction.objectStore('metadata');
      const request = store.get(key);

      request.onsuccess = () => resolve(request.result?.value || null);
      request.onerror = () => reject(request.error);
    });
  }

  // Utility Methods
  async clearAllData(): Promise<void> {
    const db = this.ensureDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['roomAssignments', 'syncQueue', 'metadata'], 'readwrite');
      
      const roomStore = transaction.objectStore('roomAssignments');
      const syncStore = transaction.objectStore('syncQueue');
      const metaStore = transaction.objectStore('metadata');

      Promise.all([
        new Promise<void>((res, rej) => {
          const req = roomStore.clear();
          req.onsuccess = () => res();
          req.onerror = () => rej(req.error);
        }),
        new Promise<void>((res, rej) => {
          const req = syncStore.clear();
          req.onsuccess = () => res();
          req.onerror = () => rej(req.error);
        }),
        new Promise<void>((res, rej) => {
          const req = metaStore.clear();
          req.onsuccess = () => res();
          req.onerror = () => rej(req.error);
        })
      ]).then(() => resolve()).catch(reject);
    });
  }
}

// Singleton instance
export const indexedDBManager = new IndexedDBManager();