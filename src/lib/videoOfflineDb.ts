const DB_NAME = 'StardustOfflineVideos';
const STORE_NAME = 'videos';
const DB_VERSION = 1;

export interface OfflineVideo {
  id: string;
  title: string;
  blob: Blob;
  mimeType: string;
  savedAt: string;
}

export const initOfflineDb = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => {
      reject(request.error);
    };

    request.onsuccess = () => {
      resolve(request.result);
    };

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    };
  });
};

export const saveOfflineVideo = async (
  id: string,
  title: string,
  blob: Blob,
  mimeType: string
): Promise<void> => {
  const db = await initOfflineDb();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);

    const record: OfflineVideo = {
      id,
      title,
      blob,
      mimeType,
      savedAt: new Date().toISOString(),
    };

    const request = store.put(record);

    request.onsuccess = () => {
      resolve();
    };

    request.onerror = () => {
      reject(request.error);
    };
  });
};

export const getOfflineVideo = async (id: string): Promise<OfflineVideo | null> => {
  const db = await initOfflineDb();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.get(id);

    request.onsuccess = () => {
      resolve(request.result || null);
    };

    request.onerror = () => {
      reject(request.error);
    };
  });
};

export const deleteOfflineVideo = async (id: string): Promise<void> => {
  const db = await initOfflineDb();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.delete(id);

    request.onsuccess = () => {
      resolve();
    };

    request.onerror = () => {
      reject(request.error);
    };
  });
};

export const listOfflineVideos = async (): Promise<string[]> => {
  const db = await initOfflineDb();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.getAllKeys();

    request.onsuccess = () => {
      resolve((request.result as string[]) || []);
    };

    request.onerror = () => {
      reject(request.error);
    };
  });
};
