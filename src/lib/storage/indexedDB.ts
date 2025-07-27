// IndexedDB wrapper for offline storage
export interface StoredChat {
  id: string;
  title: string;
  messages: any[];
  createdAt: Date;
  updatedAt: Date;
  metadata?: any;
}

export interface StoredSettings {
  id: string;
  settings: any;
  updatedAt: Date;
}

export interface MedicalData {
  id: string;
  type: 'protocol' | 'medication' | 'reference';
  data: any;
  lastAccessed: Date;
}

class IndexedDBManager {
  private dbName = 'NelsonGPT';
  private version = 1;
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

        // Chats store
        if (!db.objectStoreNames.contains('chats')) {
          const chatStore = db.createObjectStore('chats', { keyPath: 'id' });
          chatStore.createIndex('updatedAt', 'updatedAt', { unique: false });
        }

        // Settings store
        if (!db.objectStoreNames.contains('settings')) {
          db.createObjectStore('settings', { keyPath: 'id' });
        }

        // Medical data store
        if (!db.objectStoreNames.contains('medicalData')) {
          const medicalStore = db.createObjectStore('medicalData', { keyPath: 'id' });
          medicalStore.createIndex('type', 'type', { unique: false });
          medicalStore.createIndex('lastAccessed', 'lastAccessed', { unique: false });
        }

        // Patient info store
        if (!db.objectStoreNames.contains('patientInfo')) {
          db.createObjectStore('patientInfo', { keyPath: 'id' });
        }
      };
    });
  }

  // Chat operations
  async saveChat(chat: StoredChat): Promise<void> {
    if (!this.db) await this.init();
    
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['chats'], 'readwrite');
      const store = transaction.objectStore('chats');
      const request = store.put(chat);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve();
    });
  }

  async getChat(id: string): Promise<StoredChat | null> {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['chats'], 'readonly');
      const store = transaction.objectStore('chats');
      const request = store.get(id);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result || null);
    });
  }

  async getAllChats(): Promise<StoredChat[]> {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['chats'], 'readonly');
      const store = transaction.objectStore('chats');
      const index = store.index('updatedAt');
      const request = index.getAll();

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        const chats = request.result.sort((a, b) => 
          new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
        );
        resolve(chats);
      };
    });
  }

  async deleteChat(id: string): Promise<void> {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['chats'], 'readwrite');
      const store = transaction.objectStore('chats');
      const request = store.delete(id);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve();
    });
  }

  // Settings operations
  async saveSettings(settings: any): Promise<void> {
    if (!this.db) await this.init();

    const storedSettings: StoredSettings = {
      id: 'user-settings',
      settings,
      updatedAt: new Date()
    };

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['settings'], 'readwrite');
      const store = transaction.objectStore('settings');
      const request = store.put(storedSettings);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve();
    });
  }

  async getSettings(): Promise<any | null> {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['settings'], 'readonly');
      const store = transaction.objectStore('settings');
      const request = store.get('user-settings');

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        const result = request.result;
        resolve(result ? result.settings : null);
      };
    });
  }

  // Medical data operations
  async saveMedicalData(data: MedicalData): Promise<void> {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['medicalData'], 'readwrite');
      const store = transaction.objectStore('medicalData');
      const request = store.put(data);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve();
    });
  }

  async getMedicalData(type?: string): Promise<MedicalData[]> {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['medicalData'], 'readonly');
      const store = transaction.objectStore('medicalData');
      
      let request: IDBRequest;
      if (type) {
        const index = store.index('type');
        request = index.getAll(type);
      } else {
        request = store.getAll();
      }

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result);
    });
  }

  // Patient info operations
  async savePatientInfo(patientInfo: any): Promise<void> {
    if (!this.db) await this.init();

    const data = {
      id: 'current-patient',
      ...patientInfo,
      updatedAt: new Date()
    };

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['patientInfo'], 'readwrite');
      const store = transaction.objectStore('patientInfo');
      const request = store.put(data);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve();
    });
  }

  async getPatientInfo(): Promise<any | null> {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['patientInfo'], 'readonly');
      const store = transaction.objectStore('patientInfo');
      const request = store.get('current-patient');

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result || null);
    });
  }

  // Utility operations
  async clearAllData(): Promise<void> {
    if (!this.db) await this.init();

    const storeNames = ['chats', 'settings', 'medicalData', 'patientInfo'];
    
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(storeNames, 'readwrite');
      let completed = 0;

      const checkComplete = () => {
        completed++;
        if (completed === storeNames.length) {
          resolve();
        }
      };

      storeNames.forEach(storeName => {
        const store = transaction.objectStore(storeName);
        const request = store.clear();
        request.onerror = () => reject(request.error);
        request.onsuccess = () => checkComplete();
      });
    });
  }

  async exportData(): Promise<any> {
    if (!this.db) await this.init();

    const [chats, settings, medicalData, patientInfo] = await Promise.all([
      this.getAllChats(),
      this.getSettings(),
      this.getMedicalData(),
      this.getPatientInfo()
    ]);

    return {
      chats,
      settings,
      medicalData,
      patientInfo,
      exportDate: new Date().toISOString(),
      version: this.version
    };
  }

  async importData(data: any): Promise<void> {
    if (!this.db) await this.init();

    // Clear existing data
    await this.clearAllData();

    // Import chats
    if (data.chats) {
      for (const chat of data.chats) {
        await this.saveChat(chat);
      }
    }

    // Import settings
    if (data.settings) {
      await this.saveSettings(data.settings);
    }

    // Import medical data
    if (data.medicalData) {
      for (const medData of data.medicalData) {
        await this.saveMedicalData(medData);
      }
    }

    // Import patient info
    if (data.patientInfo) {
      await this.savePatientInfo(data.patientInfo);
    }
  }
}

// Singleton instance
export const indexedDBManager = new IndexedDBManager();

// Initialize on module load
if (typeof window !== 'undefined' && 'indexedDB' in window) {
  indexedDBManager.init().catch(console.error);
}

