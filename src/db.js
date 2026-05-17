// ─────────────────────────────────────────────────────────────────────────────
// db.js — IndexedDB helpers for local photo storage and sync queue
// ─────────────────────────────────────────────────────────────────────────────

let _idb = null; // singleton IDB connection

/** Opens (or returns cached) the IndexedDB connection */
function openIDB() {
  if (_idb) return Promise.resolve(_idb);
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(IDB_NAME, IDB_VER);
    req.onupgradeneeded = e => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains(IDB_STORE)) {
        db.createObjectStore(IDB_STORE); // manual keys
      }
      if (!db.objectStoreNames.contains(IDB_QUEUE)) {
        db.createObjectStore(IDB_QUEUE, { keyPath:'id', autoIncrement:true });
      }
      if (!db.objectStoreNames.contains(IDB_DRAWINGS)) {
        db.createObjectStore(IDB_DRAWINGS); // manual keys — stores raw PDF ArrayBuffers
      }
    };
    req.onsuccess = e => { _idb = e.target.result; resolve(_idb); };
    req.onerror  = e => reject(e.target.error);
  });
}

/** Write value to store. If key is undefined, uses autoIncrement */
async function idbPut(storeName, key, value) {
  const db = await openIDB();
  return new Promise((resolve, reject) => {
    const tx  = db.transaction(storeName, 'readwrite');
    const st  = tx.objectStore(storeName);
    const req = key === undefined ? st.put(value) : st.put(value, key);
    req.onsuccess = () => resolve(req.result);
    req.onerror   = () => reject(req.error);
  });
}

/** Read one record by key */
async function idbGet(storeName, key) {
  const db = await openIDB();
  return new Promise((resolve, reject) => {
    const tx  = db.transaction(storeName, 'readonly');
    const req = tx.objectStore(storeName).get(key);
    req.onsuccess = () => resolve(req.result);
    req.onerror   = () => reject(req.error);
  });
}

/** Delete one record by key */
async function idbDelete(storeName, key) {
  const db = await openIDB();
  return new Promise((resolve, reject) => {
    const tx  = db.transaction(storeName, 'readwrite');
    const req = tx.objectStore(storeName).delete(key);
    req.onsuccess = () => resolve();
    req.onerror   = () => reject(req.error);
  });
}

/** Return all records from a store as an array */
async function idbGetAll(storeName) {
  const db = await openIDB();
  return new Promise((resolve, reject) => {
    const tx  = db.transaction(storeName, 'readonly');
    const req = tx.objectStore(storeName).getAll();
    req.onsuccess = () => resolve(req.result);
    req.onerror   = () => reject(req.error);
  });
}

// ── Photo helpers ──────────────────────────────────────────────────────────────

/** Save a photo blob locally, keyed by obsId */
async function savePhotoLocally(obsId, blob) {
  await idbPut(IDB_STORE, obsId, blob);
  return obsId;
}

/** Get a local photo as an object URL, or null if missing */
async function getLocalPhotoUrl(key) {
  const blob = await idbGet(IDB_STORE, key);
  return blob ? URL.createObjectURL(blob) : null;
}

/** Delete a local photo blob */
async function deleteLocalPhoto(key) {
  await idbDelete(IDB_STORE, key);
}

// ── Drawing PDF helpers ────────────────────────────────────────────────────────

/** Save a raw PDF ArrayBuffer to IndexedDB, keyed by drawingId */
async function saveDrawingPDF(key, arrayBuffer) {
  await idbPut(IDB_DRAWINGS, key, arrayBuffer);
}

/** Retrieve a raw PDF ArrayBuffer from IndexedDB, or null if missing */
async function getDrawingPDF(key) {
  const data = await idbGet(IDB_DRAWINGS, key);
  return data || null;
}
