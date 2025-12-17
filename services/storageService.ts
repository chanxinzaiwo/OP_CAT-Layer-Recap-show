import { PublishedReport, ContextSettings } from "../types";

const DB_NAME = 'OpCatDB';
const REPORT_STORE = 'published_reports';
const SETTINGS_STORE = 'app_settings';
const DB_VERSION = 2; // Bump version for new store

const openDB = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = (event) => {
      console.error("IndexedDB error:", request.error);
      reject(request.error);
    };

    request.onsuccess = (event) => {
      resolve(request.result);
    };

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(REPORT_STORE)) {
        db.createObjectStore(REPORT_STORE, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(SETTINGS_STORE)) {
        db.createObjectStore(SETTINGS_STORE, { keyPath: 'id' });
      }
    };
  });
};

export const saveReportToStorage = async (report: PublishedReport): Promise<void> => {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([REPORT_STORE], 'readwrite');
      const store = transaction.objectStore(REPORT_STORE);
      const request = store.put(report);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  } catch (error) {
    console.error("Failed to save report to storage", error);
    throw error;
  }
};

export const deleteReportFromStorage = async (id: string): Promise<void> => {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction([REPORT_STORE], 'readwrite');
        const store = transaction.objectStore(REPORT_STORE);
        const request = store.delete(id);
        
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
    });
  } catch (error) {
    console.error("Failed to delete report", error);
    throw error;
  }
}

export const loadReportsFromStorage = async (): Promise<PublishedReport[]> => {
  try {
    const db = await openDB();
    const reports: PublishedReport[] = await new Promise((resolve, reject) => {
      const transaction = db.transaction([REPORT_STORE], 'readonly');
      const store = transaction.objectStore(REPORT_STORE);
      const request = store.getAll();

      request.onsuccess = () => resolve(request.result as PublishedReport[]);
      request.onerror = () => reject(request.error);
    });

    // Sort by publishDate descending (newest first)
    return reports.sort((a, b) => b.publishDate - a.publishDate);
  } catch (error) {
    console.error("Failed to load reports from storage", error);
    return [];
  }
};

// --- Settings Persistence ---

export const saveSettingsToStorage = async (settings: ContextSettings): Promise<void> => {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([SETTINGS_STORE], 'readwrite');
      const store = transaction.objectStore(SETTINGS_STORE);
      // We use a fixed ID 'current_settings' to strictly overwrite
      const request = store.put({ id: 'current_settings', ...settings });

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  } catch (error) {
    console.error("Failed to save settings", error);
    throw error;
  }
};

export const loadSettingsFromStorage = async (): Promise<ContextSettings | null> => {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([SETTINGS_STORE], 'readonly');
      const store = transaction.objectStore(SETTINGS_STORE);
      const request = store.get('current_settings');

      request.onsuccess = () => {
        if (request.result) {
            const { id, ...settings } = request.result; // strip ID
            resolve(settings as ContextSettings);
        } else {
            resolve(null);
        }
      };
      request.onerror = () => reject(request.error);
    });
  } catch (error) {
    console.error("Failed to load settings", error);
    return null;
  }
};

// --- Auth Persistence (TOTP Secret) ---

export const saveAuthSecret = async (secret: string): Promise<void> => {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([SETTINGS_STORE], 'readwrite');
      const store = transaction.objectStore(SETTINGS_STORE);
      const request = store.put({ id: 'auth_secret', secret });
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  } catch (error) {
    throw error;
  }
};

export const loadAuthSecret = async (): Promise<string | null> => {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([SETTINGS_STORE], 'readonly');
      const store = transaction.objectStore(SETTINGS_STORE);
      const request = store.get('auth_secret');
      request.onsuccess = () => {
        resolve(request.result ? request.result.secret : null);
      };
      request.onerror = () => reject(request.error);
    });
  } catch (error) {
    return null;
  }
};