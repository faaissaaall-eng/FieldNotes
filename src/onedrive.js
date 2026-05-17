// ─────────────────────────────────────────────────────────────────────────────
// onedrive.js — MSAL auth, OneDrive upload, sync queue, useOneDrive hook
// ─────────────────────────────────────────────────────────────────────────────
const { useState: useStateOD, useEffect: useEffectOD } = React;

let _msalApp    = null;  // singleton MSAL PublicClientApplication
let _odAccount  = null;  // currently signed-in AccountInfo
let _syncRunning = false; // mutex — prevents concurrent sync runs

// ── MSAL initialisation ────────────────────────────────────────────────────────
async function getMSAL() {
  if (_msalApp) return _msalApp;
  _msalApp = new msal.PublicClientApplication({
    auth: {
      clientId:    OD_CLIENT_ID,
      authority:   `https://login.microsoftonline.com/${OD_TENANT_ID}`,
      redirectUri: OD_REDIRECT,
    },
    cache: { cacheLocation:'localStorage', storeAuthStateInCookie:false },
  });
  await _msalApp.initialize();
  // Handle any outstanding redirect flow
  try {
    const result = await _msalApp.handleRedirectPromise();
    if (result && result.account) {
      _odAccount = result.account;
      _msalApp.setActiveAccount && _msalApp.setActiveAccount(result.account);
    }
  } catch {}
  // Fall back to cached session
  if (!_odAccount) {
    const accounts = _msalApp.getAllAccounts();
    if (accounts.length > 0) _odAccount = accounts[0];
  }
  return _msalApp;
}

async function isODSignedIn() {
  const app = await getMSAL();
  return app.getAllAccounts().length > 0;
}

async function getODUser() {
  const app = await getMSAL();
  return app.getAllAccounts()[0] || null;
}

// ── Authentication actions ─────────────────────────────────────────────────────
async function signInOD() {
  const app = await getMSAL();
  const result = await app.loginPopup({ scopes: OD_SCOPES, redirectUri: OD_REDIRECT });
  if (result && result.account) {
    _odAccount = result.account;
    app.setActiveAccount && app.setActiveAccount(result.account);
  }
}

async function signOutOD() {
  const app = await getMSAL();
  const accounts = app.getAllAccounts();
  if (accounts.length > 0) {
    await app.logoutRedirect({ account: accounts[0] });
    _odAccount = null;
  }
}

async function getODToken() {
  const app = await getMSAL();
  const account = _odAccount || app.getAllAccounts()[0];
  if (!account) throw new Error('Not signed in to OneDrive');
  try {
    const result = await app.acquireTokenSilent({ scopes: OD_SCOPES, account });
    return result.accessToken;
  } catch {
    const pr = await app.acquireTokenPopup({ scopes: OD_SCOPES, account, redirectUri: OD_REDIRECT });
    return pr.accessToken;
  }
}

// ── Graph API helpers ──────────────────────────────────────────────────────────
async function graphRequest(method, path, body, accessToken) {
  const isBlob = body instanceof Blob;
  const res = await fetch(`${GRAPH}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': isBlob ? (body.type || 'application/octet-stream') : 'application/json',
    },
    body: body ? (isBlob ? body : JSON.stringify(body)) : undefined,
  });
  if (!res.ok) {
    const txt = await res.text().catch(() => '');
    throw new Error(`Graph ${method} ${path} → ${res.status}: ${txt}`);
  }
  const text = await res.text();
  return text ? JSON.parse(text) : null;
}

async function ensureODFolder(folderPath, accessToken) {
  const segments = folderPath.split('/').filter(Boolean);
  let currentPath = '';
  for (const seg of segments) {
    const parentApi = currentPath
      ? `/me/drive/root:/${encodeURIComponent(currentPath)}:/children`
      : '/me/drive/root/children';
    try {
      const nextPath = currentPath ? `${currentPath}/${seg}` : seg;
      await graphRequest('GET', `/me/drive/root:/${encodeURIComponent(nextPath)}:`, null, accessToken);
    } catch {
      await graphRequest('POST', parentApi,
        { name: seg, folder: {}, '@microsoft.graph.conflictBehavior': 'ignore' },
        accessToken);
    }
    currentPath = currentPath ? `${currentPath}/${seg}` : seg;
  }
}

async function uploadToOD(blob, remotePath) {
  const token = await getODToken();
  const encoded = remotePath.split('/').map(encodeURIComponent).join('/');
  const res = await fetch(`${GRAPH}/me/drive/root:/${encoded}:/content`, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': blob.type || 'image/jpeg',
    },
    body: blob,
  });
  if (!res.ok) throw new Error(`Upload failed: ${res.status}`);
  const item = await res.json();
  return item.webUrl || item['@microsoft.graph.downloadUrl'] || null;
}

// ── Sync queue ─────────────────────────────────────────────────────────────────
/** Sanitise a string for use as a folder/file name */
const sanitiseName = s => s.replace(/[/\\?%*:|"<>]/g, '-').trim();

/** Queue a photo for OneDrive upload (does NOT upload immediately) */
async function queuePhotoUpload({ obsId, projName, visitDate, blob }) {
  const remotePath = `FieldStruct/${sanitiseName(projName)}/${sanitiseName(visitDate)}/obs-${obsId}.jpg`;
  await idbPut(IDB_QUEUE, undefined, {
    obsId, remotePath, blobKey: obsId,
    status: 'pending', attempts: 0,
    createdAt: new Date().toISOString(),
  });
}

/** Process all pending queue items, uploading each blob to OneDrive */
async function processSyncQueue(onUploaded) {
  if (_syncRunning || !navigator.onLine || !(await isODSignedIn())) return;
  _syncRunning = true;
  try {
    const all = await idbGetAll(IDB_QUEUE);
    const pending = all.filter(r => r.status === 'pending' && r.attempts < 3);
    for (const item of pending) {
      try {
        const blob = await idbGet(IDB_STORE, item.blobKey);
        if (!blob) { await idbDelete(IDB_QUEUE, item.id); continue; }
        const url = await uploadToOD(blob, item.remotePath);
        onUploaded && onUploaded({ obsId: item.obsId, url, status: 'uploaded' });
        window.dispatchEvent(new CustomEvent('od-photo-uploaded', {
          detail: { obsId: item.obsId, url }
        }));
        await idbDelete(IDB_QUEUE, item.id);
      } catch (err) {
        const updated = { ...item, attempts: item.attempts + 1, lastError: String(err) };
        if (updated.attempts >= 3) updated.status = 'failed';
        await idbDelete(IDB_QUEUE, item.id);
        await idbPut(IDB_QUEUE, undefined, updated);
      }
    }
  } finally {
    _syncRunning = false;
  }
}

async function getPendingSyncCount() {
  const all = await idbGetAll(IDB_QUEUE);
  return all.filter(r => r.status === 'pending').length;
}

// ── useOneDrive hook ──────────────────────────────────────────────────────────
function useOneDrive() {
  const [signedIn, setSignedIn] = useStateOD(false);
  const [user,     setUser]     = useStateOD(null);
  const [loading,  setLoading]  = useStateOD(false);
  const [syncing,  setSyncing]  = useStateOD(false);
  const [pending,  setPending]  = useStateOD(0);
  const [lastSync, setLastSync] = useStateOD(null);
  const [error,    setError]    = useStateOD(null);

  async function refresh() {
    try {
      const [si, u, p] = await Promise.all([isODSignedIn(), getODUser(), getPendingSyncCount()]);
      setSignedIn(si);
      setUser(u);
      setPending(p);
    } catch {}
  }

  async function triggerSync() {
    setSyncing(true);
    try {
      await processSyncQueue();
      const p = await getPendingSyncCount();
      setPending(p);
      setLastSync(new Date());
    } finally {
      setSyncing(false);
    }
  }

  useEffectOD(() => {
    refresh();

    // Auto-sync when coming online
    const onOnline = () => triggerSync();
    window.addEventListener('online', onOnline);

    // Attempt sync shortly after mount if already online
    const timer = navigator.onLine ? setTimeout(triggerSync, 1500) : null;

    return () => {
      window.removeEventListener('online', onOnline);
      if (timer) clearTimeout(timer);
    };
  }, []);

  async function signIn() {
    setLoading(true);
    setError(null);
    try {
      await signInOD();
      await refresh();
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  }

  async function signOut() {
    try {
      await signOutOD();
      setSignedIn(false);
      setUser(null);
      setPending(0);
    } catch {}
  }

  return { signedIn, user, loading, syncing, pending, lastSync, error, signIn, signOut, triggerSync, refresh };
}
