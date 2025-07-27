import { useState, useEffect } from 'react';
import { indexedDBManager, StoredChat } from '../lib/storage/indexedDB';

export function useOfflineStorage() {
  const [isInitialized, setIsInitialized] = useState(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    // Initialize IndexedDB
    indexedDBManager.init()
      .then(() => setIsInitialized(true))
      .catch(console.error);

    // Listen for online/offline events
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Chat operations
  const saveChat = async (chat: any) => {
    if (!isInitialized) return;
    
    try {
      await indexedDBManager.saveChat(chat);
      
      // Also save to localStorage as backup
      const chats = JSON.parse(localStorage.getItem('nelsongpt-chats') || '[]');
      const existingIndex = chats.findIndex((c: any) => c.id === chat.id);
      
      if (existingIndex >= 0) {
        chats[existingIndex] = chat;
      } else {
        chats.unshift(chat);
      }
      
      localStorage.setItem('nelsongpt-chats', JSON.stringify(chats));
    } catch (error) {
      console.error('Error saving chat:', error);
      // Fallback to localStorage only
      const chats = JSON.parse(localStorage.getItem('nelsongpt-chats') || '[]');
      const existingIndex = chats.findIndex((c: any) => c.id === chat.id);
      
      if (existingIndex >= 0) {
        chats[existingIndex] = chat;
      } else {
        chats.unshift(chat);
      }
      
      localStorage.setItem('nelsongpt-chats', JSON.stringify(chats));
    }
  };

  const loadChats = async (): Promise<any[]> => {
    if (!isInitialized) {
      // Fallback to localStorage
      return JSON.parse(localStorage.getItem('nelsongpt-chats') || '[]');
    }

    try {
      const indexedDBChats = await indexedDBManager.getAllChats();
      
      // Merge with localStorage data if needed
      const localStorageChats = JSON.parse(localStorage.getItem('nelsongpt-chats') || '[]');
      
      // Create a map to avoid duplicates
      const chatMap = new Map();
      
      // Add IndexedDB chats first (they're more reliable)
      indexedDBChats.forEach(chat => chatMap.set(chat.id, chat));
      
      // Add localStorage chats that aren't already in IndexedDB
      localStorageChats.forEach((chat: any) => {
        if (!chatMap.has(chat.id)) {
          chatMap.set(chat.id, chat);
        }
      });
      
      return Array.from(chatMap.values()).sort((a: any, b: any) => 
        new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
      );
    } catch (error) {
      console.error('Error loading chats from IndexedDB:', error);
      return JSON.parse(localStorage.getItem('nelsongpt-chats') || '[]');
    }
  };

  const deleteChat = async (chatId: string) => {
    if (isInitialized) {
      try {
        await indexedDBManager.deleteChat(chatId);
      } catch (error) {
        console.error('Error deleting chat from IndexedDB:', error);
      }
    }

    // Also delete from localStorage
    const chats = JSON.parse(localStorage.getItem('nelsongpt-chats') || '[]');
    const filteredChats = chats.filter((chat: any) => chat.id !== chatId);
    localStorage.setItem('nelsongpt-chats', JSON.stringify(filteredChats));
  };

  // Settings operations
  const saveSettings = async (settings: any) => {
    if (isInitialized) {
      try {
        await indexedDBManager.saveSettings(settings);
      } catch (error) {
        console.error('Error saving settings to IndexedDB:', error);
      }
    }

    // Also save to localStorage
    localStorage.setItem('nelsongpt-settings', JSON.stringify(settings));
  };

  const loadSettings = async (): Promise<any | null> => {
    if (!isInitialized) {
      return JSON.parse(localStorage.getItem('nelsongpt-settings') || 'null');
    }

    try {
      const indexedDBSettings = await indexedDBManager.getSettings();
      if (indexedDBSettings) {
        return indexedDBSettings;
      }
      
      // Fallback to localStorage
      return JSON.parse(localStorage.getItem('nelsongpt-settings') || 'null');
    } catch (error) {
      console.error('Error loading settings from IndexedDB:', error);
      return JSON.parse(localStorage.getItem('nelsongpt-settings') || 'null');
    }
  };

  // Patient info operations
  const savePatientInfo = async (patientInfo: any) => {
    if (isInitialized) {
      try {
        await indexedDBManager.savePatientInfo(patientInfo);
      } catch (error) {
        console.error('Error saving patient info to IndexedDB:', error);
      }
    }

    // Also save to localStorage
    localStorage.setItem('nelsongpt-patient-info', JSON.stringify(patientInfo));
  };

  const loadPatientInfo = async (): Promise<any | null> => {
    if (!isInitialized) {
      return JSON.parse(localStorage.getItem('nelsongpt-patient-info') || 'null');
    }

    try {
      const indexedDBPatientInfo = await indexedDBManager.getPatientInfo();
      if (indexedDBPatientInfo) {
        return indexedDBPatientInfo;
      }
      
      // Fallback to localStorage
      return JSON.parse(localStorage.getItem('nelsongpt-patient-info') || 'null');
    } catch (error) {
      console.error('Error loading patient info from IndexedDB:', error);
      return JSON.parse(localStorage.getItem('nelsongpt-patient-info') || 'null');
    }
  };

  // Medical data operations
  const saveMedicalData = async (type: string, data: any) => {
    if (!isInitialized) return;

    try {
      await indexedDBManager.saveMedicalData({
        id: `${type}-${Date.now()}`,
        type: type as any,
        data,
        lastAccessed: new Date()
      });
    } catch (error) {
      console.error('Error saving medical data:', error);
    }
  };

  const loadMedicalData = async (type?: string) => {
    if (!isInitialized) return [];

    try {
      return await indexedDBManager.getMedicalData(type);
    } catch (error) {
      console.error('Error loading medical data:', error);
      return [];
    }
  };

  // Data management
  const exportAllData = async () => {
    if (!isInitialized) {
      // Export from localStorage only
      return {
        chats: JSON.parse(localStorage.getItem('nelsongpt-chats') || '[]'),
        settings: JSON.parse(localStorage.getItem('nelsongpt-settings') || 'null'),
        patientInfo: JSON.parse(localStorage.getItem('nelsongpt-patient-info') || 'null'),
        exportDate: new Date().toISOString(),
        source: 'localStorage'
      };
    }

    try {
      return await indexedDBManager.exportData();
    } catch (error) {
      console.error('Error exporting data:', error);
      // Fallback to localStorage
      return {
        chats: JSON.parse(localStorage.getItem('nelsongpt-chats') || '[]'),
        settings: JSON.parse(localStorage.getItem('nelsongpt-settings') || 'null'),
        patientInfo: JSON.parse(localStorage.getItem('nelsongpt-patient-info') || 'null'),
        exportDate: new Date().toISOString(),
        source: 'localStorage'
      };
    }
  };

  const importAllData = async (data: any) => {
    if (isInitialized) {
      try {
        await indexedDBManager.importData(data);
      } catch (error) {
        console.error('Error importing data to IndexedDB:', error);
      }
    }

    // Also import to localStorage
    if (data.chats) {
      localStorage.setItem('nelsongpt-chats', JSON.stringify(data.chats));
    }
    if (data.settings) {
      localStorage.setItem('nelsongpt-settings', JSON.stringify(data.settings));
    }
    if (data.patientInfo) {
      localStorage.setItem('nelsongpt-patient-info', JSON.stringify(data.patientInfo));
    }
  };

  const clearAllData = async () => {
    if (isInitialized) {
      try {
        await indexedDBManager.clearAllData();
      } catch (error) {
        console.error('Error clearing IndexedDB data:', error);
      }
    }

    // Also clear localStorage
    localStorage.removeItem('nelsongpt-chats');
    localStorage.removeItem('nelsongpt-settings');
    localStorage.removeItem('nelsongpt-patient-info');
  };

  return {
    isInitialized,
    isOnline,
    saveChat,
    loadChats,
    deleteChat,
    saveSettings,
    loadSettings,
    savePatientInfo,
    loadPatientInfo,
    saveMedicalData,
    loadMedicalData,
    exportAllData,
    importAllData,
    clearAllData
  };
}

