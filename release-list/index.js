// @ts-check
// NAME: Release List
// AUTHOR: daviidpaark
// DESCRIPTION: Power-user Spotify release tracker inspired by jakubito/spotify-release-list. Day-by-day feed, multi-type toggles, persistent IndexedDB caching, and optimized lazy pagination.

const { React } = Spicetify;
const { useState, useEffect, useCallback, useMemo, useRef } = React;

// ---------------------------------------------------------------------------
// 0. Global Style Injection
// ---------------------------------------------------------------------------
if (typeof document !== "undefined" && !document.getElementById("release-list-styles")) {
  const styleEl = document.createElement("style");
  styleEl.id = "release-list-styles";
  styleEl.textContent = `
    @keyframes rl-spin {
      from { transform: rotate(0deg); }
      to { transform: rotate(360deg); }
    }
    @keyframes rl-fade-in {
      from { opacity: 0; transform: translateY(6px); }
      to { opacity: 1; transform: translateY(0); }
    }
    @keyframes rl-slide-down {
      from { opacity: 0; transform: translateY(-10px); }
      to { opacity: 1; transform: translateY(0); }
    }

    .rl-container {
      padding: 24px 32px 64px 32px;
      animation: rl-fade-in 0.25s cubic-bezier(0.16, 1, 0.3, 1);
      color: var(--spice-text, #ffffff);
      box-sizing: border-box;
      min-height: 100vh;
    }

    .rl-grid {
      display: grid !important;
      grid-template-columns: repeat(auto-fill, minmax(max(var(--grid-column-min-width, 185px), 160px), 1fr)) !important;
      gap: 20px !important;
    }

    @media (min-width: 2200px) {
      .rl-grid {
        grid-template-columns: repeat(auto-fill, minmax(230px, 1fr)) !important;
        gap: 26px !important;
      }
    }
    @media (min-width: 1600px) and (max-width: 2199px) {
      .rl-grid {
        grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)) !important;
        gap: 22px !important;
      }
    }
    @media (max-width: 799px) {
      .rl-grid {
        grid-template-columns: repeat(auto-fill, minmax(140px, 1fr)) !important;
        gap: 14px !important;
      }
      .rl-container {
        padding: 16px 16px 48px 16px;
      }
    }

    /* High-Performance Card with Off-screen Rendering Optimization */
    .rl-card {
      position: relative;
      padding: 0 0 8px;
      transition: transform 0.18s ease;
      display: flex;
      flex-direction: column;
      min-width: 0;
      cursor: pointer;
      user-select: none;
    }
    .rl-card:hover {
      transform: translateY(-3px);
    }

    .rl-card-artwork-wrapper {
      position: relative;
      width: 100%;
      padding-bottom: 100%;
      border-radius: 6px;
      overflow: hidden;
      margin-bottom: 12px;
      background: #181818;
      box-shadow: 0 4px 14px rgba(0, 0, 0, 0.3);
    }
    .rl-card-artwork {
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      object-fit: cover;
      transition: transform 0.25s ease;
    }
    .rl-card:hover .rl-card-artwork {
      transform: scale(1.03);
    }

    .rl-play-btn {
      position: absolute;
      right: 10px;
      bottom: 10px;
      width: 44px;
      height: 44px;
      border-radius: 50%;
      background: #1ed760;
      color: #000;
      display: flex;
      align-items: center;
      justify-content: center;
      opacity: 0;
      transform: translateY(8px);
      transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
      box-shadow: 0 8px 18px rgba(0, 0, 0, 0.5);
      border: none;
      cursor: pointer;
      z-index: 5;
    }
    .rl-card:hover .rl-play-btn {
      opacity: 1;
      transform: translateY(0);
    }
    .rl-play-btn:hover {
      transform: scale(1.08) !important;
      background: #1fdf64 !important;
    }

    .rl-in-library-badge {
      position: absolute;
      top: 10px;
      right: 10px;
      width: 24px;
      height: 24px;
      border-radius: 50%;
      background: var(--spice-button, #1ed760);
      color: #121212;
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.6);
      z-index: 4;
      cursor: pointer;
      transition: transform 0.15s ease, background 0.15s ease;
    }
    .rl-in-library-badge:hover {
      transform: scale(1.12);
      background: #1fdf64;
    }

    /* Reactive Interactive Card Elements */
    .rl-card-title {
      font-size: 14px;
      font-weight: 700;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      color: #ffffff;
      cursor: pointer;
      width: fit-content;
      max-width: 100%;
      transition: text-decoration 0.12s ease;
    }
    .rl-card-title:hover {
      text-decoration: underline !important;
    }

    .rl-card-artist {
      font-size: 13px;
      color: rgba(255, 255, 255, 0.7);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      cursor: pointer;
      display: inline-block;
      width: fit-content;
      max-width: 100%;
      transition: color 0.15s ease, text-decoration 0.15s ease;
    }
    .rl-card-artist:hover {
      color: #ffffff !important;
      text-decoration: underline !important;
    }

    .rl-action-btn-mini {
      background: rgba(0, 0, 0, 0.65);
      backdrop-filter: blur(8px);
      border: 1px solid rgba(255, 255, 255, 0.12);
      color: rgba(255, 255, 255, 0.85);
      border-radius: 50%;
      width: 28px;
      height: 28px;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      transition: all 0.15s ease;
    }
    .rl-action-btn-mini:hover {
      background: rgba(255, 255, 255, 0.2);
      color: #fff;
      transform: scale(1.1);
    }

    .rl-chip {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 6px 14px;
      border-radius: 9999px;
      font-size: 12px;
      font-weight: 700;
      cursor: pointer;
      transition: all 0.18s ease;
      background: rgba(255, 255, 255, 0.08);
      border: 1px solid rgba(255, 255, 255, 0.1);
      color: rgba(255, 255, 255, 0.8);
      user-select: none;
    }
    .rl-chip:hover {
      background: rgba(255, 255, 255, 0.14);
      color: #ffffff;
      border-color: rgba(255, 255, 255, 0.2);
    }
    .rl-chip.active {
      background: #1ed760;
      color: #000000;
      border-color: #1ed760;
      box-shadow: 0 2px 10px rgba(30, 215, 96, 0.35);
    }

    .rl-tag-block {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 4px 10px;
      background: rgba(239, 68, 68, 0.18);
      color: #fca5a5;
      border: 1px solid rgba(239, 68, 68, 0.3);
      border-radius: 6px;
      font-size: 12px;
      font-weight: 500;
    }

    /* Modal Layout (Perfect Center in Window via Portal) */
    .rl-modal-backdrop {
      position: fixed !important;
      inset: 0 !important;
      top: 0 !important;
      left: 0 !important;
      right: 0 !important;
      bottom: 0 !important;
      width: 100vw !important;
      height: 100vh !important;
      background: rgba(0, 0, 0, 0.82) !important;
      backdrop-filter: blur(8px) !important;
      display: flex !important;
      align-items: center !important;
      justify-content: center !important;
      z-index: 999999 !important;
      animation: rl-fade-in 0.18s ease;
      margin: 0 !important;
      padding: 0 !important;
      box-sizing: border-box !important;
      color: var(--spice-text, #ffffff);
      font-family: var(--encore-body-font-stack, sans-serif);
    }
    .rl-modal-card {
      background: #181818 !important;
      border: 1px solid rgba(255, 255, 255, 0.14) !important;
      border-radius: 12px !important;
      width: 90% !important;
      max-width: 640px !important;
      max-height: 85vh !important;
      display: flex !important;
      flex-direction: column !important;
      box-shadow: 0 24px 56px rgba(0, 0, 0, 0.85) !important;
      overflow: hidden !important;
      animation: rl-slide-down 0.2s cubic-bezier(0.16, 1, 0.3, 1);
      margin: auto !important;
      box-sizing: border-box !important;
    }

    .rl-modal-body {
      padding: 20px 24px;
      overflow-y: auto;
      flex: 1 1 auto;
      display: flex;
      flex-direction: column;
      gap: 18px;
      max-height: calc(85vh - 135px);
      box-sizing: border-box;
    }

    /* Release Type Color Settings */
    .rl-color-picker {
      -webkit-appearance: none;
      -moz-appearance: none;
      appearance: none;
      width: 34px;
      height: 32px;
      border: 1px solid rgba(255, 255, 255, 0.2);
      border-radius: 6px;
      cursor: pointer;
      background: transparent;
      padding: 0;
      flex-shrink: 0;
      outline: none;
    }
    .rl-color-picker::-webkit-color-swatch-wrapper {
      padding: 2px;
    }
    .rl-color-picker::-webkit-color-swatch {
      border: none;
      border-radius: 4px;
    }
    .rl-color-hex {
      width: 80px;
      padding: 6px 8px;
      background: rgba(255, 255, 255, 0.06);
      border: 1px solid rgba(255, 255, 255, 0.15);
      border-radius: 6px;
      color: #ffffff;
      font-size: 12px;
      font-family: monospace;
      outline: none;
      text-transform: uppercase;
    }
    .rl-color-hex:focus {
      border-color: #1ed760;
    }
  `;
  document.head.appendChild(styleEl);
}

// ---------------------------------------------------------------------------
// 1. Persistent Storage Layer (IndexedDB + In-Memory Cache)
// ---------------------------------------------------------------------------
const DB_NAME = "ReleaseListDB";
const DB_VERSION = 1;
const STORE_NAME = "cache";
const CACHE_KEY = "releases_catalog";
const SAVED_ALBUMS_KEY = "saved_album_uris";

let inMemoryCatalog = null;
let inMemorySavedUris = null;
let dbInstance = null;
let dbPromise = null;

// Purge obsolete multi-megabyte localStorage cache entry to prevent QuotaExceededError
try {
  if (typeof localStorage !== "undefined" && localStorage.getItem("release-list:cache:v1")) {
    localStorage.removeItem("release-list:cache:v1");
  }
} catch (e) {}

function deleteDB() {
  if (dbInstance) {
    try {
      dbInstance.close();
    } catch (e) {}
    dbInstance = null;
  }
  dbPromise = null;
  return new Promise((resolve) => {
    if (typeof indexedDB === "undefined") return resolve(false);
    const req = indexedDB.deleteDatabase(DB_NAME);
    req.onsuccess = () => {
      console.log("[ReleaseList] Successfully deleted IndexedDB database from disk.");
      resolve(true);
    };
    req.onerror = () => resolve(false);
    req.onblocked = () => resolve(false);
  });
}

function openDBConnection() {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === "undefined") {
      reject(new Error("IndexedDB unavailable"));
      return;
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };

    request.onsuccess = () => {
      const db = request.result;
      db.onversionchange = () => {
        db.close();
        dbInstance = null;
        dbPromise = null;
      };
      db.onclose = () => {
        dbInstance = null;
        dbPromise = null;
      };
      resolve(db);
    };

    request.onerror = () => {
      reject(request.error || new Error("Failed to open IndexedDB"));
    };

    request.onblocked = () => {
      console.warn("[ReleaseList] IndexedDB open blocked by another connection");
      reject(new Error("IndexedDB blocked"));
    };
  });
}

async function getDB() {
  if (dbInstance) {
    return Promise.resolve(dbInstance);
  }
  if (dbPromise) {
    return dbPromise;
  }

  dbPromise = (async () => {
    try {
      dbInstance = await openDBConnection();
      return dbInstance;
    } catch (err) {
      // If an existing database has an older/mismatched version, purge it and recreate fresh at Version 1
      if (err && (err.name === "VersionError" || String(err).includes("VersionError"))) {
        console.warn("[ReleaseList] Detected old database version. Overwriting and resetting to Version 1...");
        await deleteDB();
        dbInstance = await openDBConnection();
        return dbInstance;
      }
      dbPromise = null;
      throw err;
    }
  })();

  return dbPromise;
}

async function getCachedCatalog() {
  // 1. In-memory fast cache (0ms instant)
  if (inMemoryCatalog && Array.isArray(inMemoryCatalog.items) && inMemoryCatalog.items.length > 0) {
    return inMemoryCatalog;
  }

  // 2. Persistent IndexedDB
  try {
    const db = await getDB();
    const data = await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readonly");
      const store = tx.objectStore(STORE_NAME);
      const req = store.get(CACHE_KEY);
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => reject(req.error || new Error("Failed to read IndexedDB cache"));
    });

    if (data && Array.isArray(data.items) && data.items.length > 0) {
      inMemoryCatalog = data;
      console.log(`[ReleaseList] Loaded ${data.items.length} releases from persistent IndexedDB.`);
      return data;
    }
  } catch (err) {
    console.warn("[ReleaseList] IndexedDB getCachedCatalog error:", err);
  }

  return null;
}

async function saveCachedCatalog(catalogObj) {
  if (!catalogObj || !Array.isArray(catalogObj.items)) return;
  inMemoryCatalog = catalogObj;

  // Save to IndexedDB with durable oncomplete
  try {
    const db = await getDB();
    await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readwrite");
      const store = tx.objectStore(STORE_NAME);
      store.put(catalogObj, CACHE_KEY);
      tx.oncomplete = () => {
        console.log(`[ReleaseList] Persisted ${catalogObj.items.length} releases to IndexedDB.`);
        resolve(true);
      };
      tx.onerror = () => reject(tx.error || new Error("IndexedDB write tx error"));
      tx.onabort = () => reject(tx.error || new Error("IndexedDB write tx abort"));
    });
  } catch (err) {
    console.warn("[ReleaseList] IndexedDB write error:", err);
  }
}

async function clearCachedCatalog() {
  inMemoryCatalog = null;
  inMemorySavedUris = null;
  cachedSearchQuery = null;
  cachedOnlySaved = null;
  cachedActiveTypes = null;
  cachedDateRangeDays = null;
  cachedCustomStartDate = null;
  cachedCustomEndDate = null;
  cachedSortOrder = null;
  cachedVisibleCount = INITIAL_BATCH_SIZE;
  cachedScrollTop = 0;
  if (typeof STORAGE_KEYS !== "undefined") {
    [
      STORAGE_KEYS.SEARCH_QUERY,
      STORAGE_KEYS.ONLY_SAVED,
      STORAGE_KEYS.ACTIVE_TYPES,
      STORAGE_KEYS.DATE_RANGE,
      STORAGE_KEYS.CUSTOM_START_DATE,
      STORAGE_KEYS.CUSTOM_END_DATE,
      STORAGE_KEYS.SORT_ORDER,
    ].forEach((k) => {
      if (k) removeSessionItem(k);
    });
  }
  // Completely delete the physical database from disk on cache clear
  await deleteDB();
  try {
    localStorage.removeItem("release-list:cache:v1");
  } catch (err) {}
}

async function getCachedSavedAlbumUris() {
  if (inMemorySavedUris && inMemorySavedUris instanceof Set && inMemorySavedUris.size > 0) {
    return inMemorySavedUris;
  }
  try {
    const db = await getDB();
    const data = await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readonly");
      const store = tx.objectStore(STORE_NAME);
      const req = store.get(SAVED_ALBUMS_KEY);
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => reject(req.error || new Error("Failed to read saved album cache"));
    });
    if (data && Array.isArray(data)) {
      inMemorySavedUris = new Set(data);
      return inMemorySavedUris;
    }
  } catch (err) {
    console.warn("[ReleaseList] getCachedSavedAlbumUris error:", err);
  }
  return inMemorySavedUris || new Set();
}

async function saveCachedSavedAlbumUris(urisSet) {
  if (!urisSet) return;
  inMemorySavedUris = urisSet instanceof Set ? urisSet : new Set(urisSet);
  try {
    const db = await getDB();
    const arr = Array.from(urisSet);
    await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readwrite");
      const store = tx.objectStore(STORE_NAME);
      store.put(arr, SAVED_ALBUMS_KEY);
      tx.oncomplete = () => resolve(true);
      tx.onerror = () => reject(tx.error);
    });
  } catch (err) {
    console.warn("[ReleaseList] saveCachedSavedAlbumUris error:", err);
  }
}

async function fetchSavedAlbumUris() {
  const uris = new Set();
  try {
    if (Spicetify.Platform?.LibraryAPI?.getContents) {
      let offset = 0;
      let total = Infinity;
      const limit = 50;
      while (offset < total) {
        const res = await Spicetify.Platform.LibraryAPI.getContents({
          filters: ["0"], // Saved albums in library
          sortOrder: "RECENTLY_ADDED",
          limit,
          offset,
        });
        if (!res || !res.items || res.items.length === 0) break;
        for (const item of res.items) {
          if (item.uri && item.uri.startsWith("spotify:album:")) {
            uris.add(item.uri);
          }
        }
        total = res.totalLength ?? res.total ?? uris.size;
        offset += limit;
      }
    }
  } catch (err) {
    console.warn("[ReleaseList] fetchSavedAlbumUris error:", err);
  }
  return uris;
}

async function toggleSaveAlbum(uri, currentlySaved) {
  try {
    if (currentlySaved) {
      if (typeof Spicetify.Platform?.LibraryAPI?.remove === "function") {
        await Spicetify.Platform.LibraryAPI.remove({ uris: [uri] });
      }
      Spicetify.showNotification?.("Removed from Your Library");
    } else {
      if (typeof Spicetify.Platform?.LibraryAPI?.add === "function") {
        await Spicetify.Platform.LibraryAPI.add({ uris: [uri] });
      }
      Spicetify.showNotification?.("Saved to Your Library");
    }
    return true;
  } catch (err) {
    console.warn("[ReleaseList] Error toggling library status:", err);
    return false;
  }
}

// ---------------------------------------------------------------------------
// 2. Constants & Settings Helpers
// ---------------------------------------------------------------------------
const STORAGE_KEYS = {
  SETTINGS: "release-list:settings",
  SEARCH_QUERY: "release-list:search-query",
  ONLY_SAVED: "release-list:only-saved",
  ACTIVE_TYPES: "release-list:active-types",
  DATE_RANGE: "release-list:date-range",
  CUSTOM_START_DATE: "release-list:custom-start-date",
  CUSTOM_END_DATE: "release-list:custom-end-date",
  SORT_ORDER: "release-list:sort-order",
};

const DAY_MS = 86400000;
const INITIAL_BATCH_SIZE = 40;
const LOAD_MORE_STEP = 40;

const RELEASE_TYPES = ["album", "ep", "single"];
const isReleaseType = (t) => RELEASE_TYPES.includes(t);

// Spotify files EPs under singles; a "single" with this many tracks is treated as an EP
const EP_MIN_TRACKS = 4;

const TYPE_LABELS = {
  album: "ALBUM",
  ep: "EP",
  single: "SINGLE",
};

const TYPE_ORDER_INDEX = {
  album: 0,
  ep: 1,
  single: 2,
};

function getContrastYIQ(hexcolor) {
  if (!hexcolor || typeof hexcolor !== "string") return "#ffffff";
  let hex = hexcolor.replace("#", "").trim();
  if (hex.length === 3) {
    hex = hex.split("").map((c) => c + c).join("");
  }
  if (hex.length !== 6) return "#ffffff";
  const r = parseInt(hex.substr(0, 2), 16);
  const g = parseInt(hex.substr(2, 2), 16);
  const b = parseInt(hex.substr(4, 2), 16);
  const yiq = (r * 299 + g * 587 + b * 114) / 1000;
  return yiq >= 135 ? "#121212" : "#ffffff";
}

const DEFAULT_SETTINGS = {
  defaultRange: 30, // days (0 = All Time)
  sortOrder: "newest", // 'newest' | 'oldest'
  groupBy: "date", // 'date' | 'date_type' | 'type'
  releasesOrder: "artist", // 'artist' | 'album-group' | 'time'
  groupColors: {
    album: "#e0b766",
    ep: "#6ec6d8",
    single: "#bc8edd",
  },
  syncWindowDays: 180, // Track up to 6 months of releases (0 = All Time)
  allowedTypes: RELEASE_TYPES, // release types enabled
};

// Optional push of the synced catalog to a Spicetify Library container.
// The URL is shared with Random Library, which pushes the saved albums.
const STORAGE_WEB_SYNC_URL = "spicetify-library:url";

function getWebSyncUrl() {
  try {
    return (localStorage.getItem(STORAGE_WEB_SYNC_URL) || "").trim().replace(/\/+$/, "");
  } catch (e) {
    return "";
  }
}

// notify: report the outcome even on success (manual sync)
async function pushReleasesToWeb(releases, settings, notify = false) {
  const baseUrl = getWebSyncUrl();
  if (!baseUrl || !releases?.length) {
    if (notify) Spicetify.showNotification?.(baseUrl ? "No releases to sync yet." : "Set a Web Sync address first.", true);
    return;
  }

  const items = releases.map((r) => ({
    uri: r.uri,
    name: r.title,
    artist: r.artist?.name || "",
    artistUri: r.artist?.uri || "",
    imageUrl: r.imageURL || "",
    type: r.type,
    releaseDate: r.dateStr || "",
    trackCount: r.trackCount || 0,
  }));

  try {
    const res = await fetch(`${baseUrl}/api/releases`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ items, settings: { groupColors: settings?.groupColors, groupBy: settings?.groupBy, releasesOrder: settings?.releasesOrder } }),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    if (notify) Spicetify.showNotification?.(`Synced ${items.length} releases to the web.`);
  } catch (err) {
    console.warn("[ReleaseList] Web sync failed:", err);
    Spicetify.showNotification?.(`Web sync failed: ${err.message || err}`, true);
  }
}

function getStoredJSON(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch (e) {
    return fallback;
  }
}

function setStoredJSON(key, val) {
  try {
    localStorage.setItem(key, JSON.stringify(val));
  } catch (e) {
    console.error("[ReleaseList] Storage error:", e);
  }
}

// Formatters are expensive to construct, so build them once
const FULL_DATE_FORMAT = new Intl.DateTimeFormat("en-US", {
  weekday: "long",
  year: "numeric",
  month: "long",
  day: "numeric",
});
const WEEKDAY_FORMAT = new Intl.DateTimeFormat("en-US", { weekday: "long" });

function formatDate(dateObj) {
  return FULL_DATE_FORMAT.format(dateObj);
}

function parseReleaseDate(dateStr) {
  if (!dateStr || typeof dateStr !== "string") return { time: 0, dateStr: "" };
  const clean = dateStr.split("T")[0].trim();
  const parts = clean.split("-").map(Number);
  const year = parts[0];
  const month = parts[1] != null && !isNaN(parts[1]) ? parts[1] - 1 : 0;
  const day = parts[2] != null && !isNaN(parts[2]) ? parts[2] : 1;

  if (isNaN(year) || year <= 0) return { time: 0, dateStr: clean };

  // Midday local time (12:00:00) avoids UTC midnight timezone regressions and DST boundary shifts
  const localDate = new Date(year, month, day, 12, 0, 0);
  return {
    time: localDate.getTime(),
    dateStr: clean,
  };
}

function getDayHeader(timeMs, now = Date.now(), dateStr = "") {
  let target;
  if (dateStr) {
    const parsed = parseReleaseDate(dateStr);
    target = new Date(parsed.time || timeMs);
  } else {
    target = new Date(timeMs);
  }
  const nowDate = new Date(now);

  const targetDayStart = new Date(target.getFullYear(), target.getMonth(), target.getDate()).getTime();
  const nowDayStart = new Date(nowDate.getFullYear(), nowDate.getMonth(), nowDate.getDate()).getTime();

  const diffDays = Math.round((nowDayStart - targetDayStart) / DAY_MS);

  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  if (diffDays > 1 && diffDays <= 6) {
    return WEEKDAY_FORMAT.format(target);
  }
  return formatDate(target);
}

function normalizeType(rawType, trackCount = 0) {
  const t = String(rawType || "").toUpperCase();
  if (t.includes("COMPILATION") || t.includes("APPEARS_ON")) return null;
  if (t === "EP") return "ep";
  if (t.includes("SINGLE") || t.includes("EP")) return trackCount >= EP_MIN_TRACKS ? "ep" : "single";
  return "album";
}

const badgeCache = new Map();

function getTypeBadge(type, groupColors = {}) {
  const t = type || "album";
  const bg = groupColors[t] || DEFAULT_SETTINGS.groupColors[t] || "#e0b766";
  const cacheKey = `${t}_${bg}`;
  if (badgeCache.has(cacheKey)) return badgeCache.get(cacheKey);

  const label = TYPE_LABELS[t] || "ALBUM";
  const fg = getContrastYIQ(bg);
  const badge = { label, bg, fg };
  badgeCache.set(cacheKey, badge);
  return badge;
}

// ---------------------------------------------------------------------------
// 3. Data Fetching Layer (Polite Rate-Limited Concurrency)
// ---------------------------------------------------------------------------
async function fetchFollowedArtists() {
  try {
    const config = {
      filters: ["1"], // 1 = Artists
      sortOrder: ["0"],
      textFilter: "",
      offset: 0,
      limit: 50000,
    };
    const artists = await Spicetify.Platform.LibraryAPI.getContents(config);
    return artists?.items || [];
  } catch (err) {
    console.error("[ReleaseList] Failed to fetch followed artists:", err);
    return [];
  }
}

const DISCOGRAPHY_PAGE_SIZE = 100;

// Spotify rate limits arrive in bursts, so one 429 pauses every worker instead of only the request that hit it.
// Each further 429 on the same request waits longer before that request gives up.
const RATE_LIMIT_BACKOFF_MS = [5000, 15000, 30000];
let rateLimitedUntil = 0;
let rateLimitPauses = 0;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function isRateLimitText(text) {
  const t = String(text || "").toLowerCase();
  return t.includes("429") || t.includes("rate limit") || t.includes("too many requests");
}

// One page of an artist's discography; { error } with a short reason when the request fails after retries
async function fetchDiscographyPage(artistUri, offset, retries = 2) {
  let attempt = 0;
  let rateLimitHits = 0;

  while (true) {
    const wait = rateLimitedUntil - Date.now();
    if (wait > 0) await sleep(wait);

    let reason;
    try {
      const { data, errors } = await Spicetify.GraphQL.Request(
        {
          name: "queryArtistDiscographyAll",
          operation: "query",
          sha256Hash: "9380995a9d4663cbcb5113fef3c6aabf70ae6d407ba61793fd01e2a1dd6929b0",
          value: null,
        },
        {
          uri: artistUri,
          offset,
          limit: DISCOGRAPHY_PAGE_SIZE,
        }
      );
      const all = data?.artistUnion?.discography?.all;
      const rateLimited = (errors || []).some((e) => isRateLimitText(e?.message) || isRateLimitText(e?.extensions?.code));
      // Spotify can report errors for one field and still return the discography; use it when present
      if (all && !rateLimited) {
        const groups = all.items || [];
        return {
          releases: groups.flatMap((group) => group.releases?.items || []),
          groupCount: groups.length,
          total: typeof all.totalCount === "number" ? all.totalCount : null,
        };
      }
      const first = errors?.[0] || {};
      reason = rateLimited ? "429" : String(first.message || first.extensions?.code || "empty response");
    } catch (e) {
      // Spotify's HttpResponseError stringifies to its name only; the status lives on the object
      const status = e?.status ?? e?.code ?? e?.response?.status ?? "";
      reason = [e?.name, status, e?.message].filter(Boolean).join(" ") || String(e || "request failed");
    }

    if (isRateLimitText(reason)) {
      if (rateLimitHits >= RATE_LIMIT_BACKOFF_MS.length) return { error: "rate limited (429)" };
      const until = Date.now() + RATE_LIMIT_BACKOFF_MS[rateLimitHits++];
      if (until > rateLimitedUntil) {
        // Count a pause once, not once per worker caught in the same burst
        if (rateLimitedUntil <= Date.now()) rateLimitPauses++;
        rateLimitedUntil = until;
      }
      continue;
    }

    if (attempt >= retries) {
      console.warn("[ReleaseList] Discography request failed for", artistUri, reason);
      return { error: reason.slice(0, 100) };
    }
    attempt++;
    await sleep(attempt * 600);
  }
}

// Paged discography; most artists fit in one request.
// knownTotal is the release count from the last complete sync: when it still matches, nothing
// was added or removed, so only the first page is fetched.
// Returns { releases, total, complete, requests }, or { error } when the first page fails.
async function fetchArtistReleasesGraphQL(artistUri, knownTotal = null, pacingDelayMs = 80) {
  const releases = [];
  let offset = 0;
  let total = null;
  let requests = 0;

  while (true) {
    const page = await fetchDiscographyPage(artistUri, offset);
    // A failed later page keeps what was fetched, marked incomplete so the next sync retries
    if (page.error) return offset === 0 ? { error: page.error } : { releases, total, complete: false, requests };

    requests++;
    releases.push(...page.releases);
    total = page.total;
    offset += page.groupCount;

    const unchanged = total !== null && total === knownTotal;
    const lastPage = page.groupCount < DISCOGRAPHY_PAGE_SIZE || (total !== null && offset >= total);
    if (unchanged || lastPage) return { releases, total, complete: true, requests };

    await new Promise((r) => setTimeout(r, pacingDelayMs));
  }
}

// Controlled concurrency pool (3 workers, 80ms delay) with abort capability
async function runConcurrentPool(items, concurrencyLimit, fn, onProgress, pacingDelayMs = 80, shouldAbort = () => false) {
  const results = [];
  let index = 0;
  let finished = 0;

  const workers = new Array(concurrencyLimit).fill(0).map(async () => {
    while (index < items.length) {
      if (shouldAbort()) break;
      const curIndex = index++;
      try {
        const res = await fn(items[curIndex], curIndex);
        results[curIndex] = res;
      } catch (err) {
        results[curIndex] = null;
      } finally {
        finished++;
        if (onProgress && !shouldAbort()) onProgress(finished, items.length);
        if (pacingDelayMs > 0 && !shouldAbort()) {
          await new Promise((r) => setTimeout(r, pacingDelayMs));
        }
      }
    }
  });

  await Promise.all(workers);
  return results;
}

// ---------------------------------------------------------------------------
// 4. React Components
// ---------------------------------------------------------------------------

// --- Modal Component with Non-Clipping Flexbox & Body Portal ---
function Modal({ title, children, onClose }) {
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  const modalNode = React.createElement(
    "div",
    {
      className: "rl-modal-backdrop",
      onClick: (e) => {
        if (e.target === e.currentTarget) onClose();
      },
    },
    React.createElement(
      "div",
      { className: "rl-modal-card" },
      // Header (Fixed)
      React.createElement(
        "div",
        {
          style: {
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "16px 22px",
            borderBottom: "1px solid rgba(255,255,255,0.08)",
            background: "#202020",
            flexShrink: 0,
          },
        },
        React.createElement("h2", { style: { margin: 0, fontSize: 18, fontWeight: 700 } }, title),
        React.createElement(
          "button",
          {
            onClick: onClose,
            className: "rl-action-btn-mini",
            style: { width: 30, height: 30 },
          },
          "✕"
        )
      ),
      // Body (Scrollable with explicit padding)
      React.createElement(
        "div",
        { className: "rl-modal-body" },
        children
      ),
      // Footer (Fixed)
      React.createElement(
        "div",
        {
          style: {
            display: "flex",
            justifyContent: "flex-end",
            padding: "12px 22px",
            borderTop: "1px solid rgba(255,255,255,0.08)",
            background: "#1c1c1c",
            flexShrink: 0,
          },
        },
        React.createElement(
          "button",
          {
            className: "rl-chip active",
            onClick: onClose,
          },
          "Done"
        )
      )
    )
  );

  const reactDOM = Spicetify.ReactDOM || (typeof ReactDOM !== "undefined" ? ReactDOM : null);
  if (reactDOM && typeof reactDOM.createPortal === "function" && typeof document !== "undefined" && document.body) {
    return reactDOM.createPortal(modalNode, document.body);
  }

  return modalNode;
}

// --- Card Component ---
const ReleaseCard = React.memo(function ReleaseCard({ release, groupColors, isSaved = false, onToggleSave }) {
  const typeBadge = getTypeBadge(release.type, groupColors);

  const handleCardClick = (e) => {
    if (e.target.closest("button") || e.target.closest(".rl-action-btn-mini") || e.target.closest(".rl-in-library-badge") || e.target.closest(".rl-card-artist")) return;
    Spicetify.Platform.History.push({
      pathname: `/album/${release.uri.split(":").pop()}`,
    });
  };

  const handlePlay = (e) => {
    e.stopPropagation();
    Spicetify.Player.playUri(release.uri);
  };

  const handleArtistClick = (e) => {
    e.stopPropagation();
    Spicetify.Platform.History.push({
      pathname: `/artist/${release.artist.uri.split(":").pop()}`,
    });
  };

  return React.createElement(
    "div",
    {
      className: "rl-card",
      onClick: handleCardClick,
    },
    // Artwork container
    React.createElement(
      "div",
      { className: "rl-card-artwork-wrapper" },
      release.imageURL
        ? React.createElement("img", {
            className: "rl-card-artwork",
            src: release.imageURL,
            alt: release.title,
            loading: "lazy",
            decoding: "async",
          })
        : React.createElement("div", {
            style: { position: "absolute", inset: 0, background: "#181818" },
          }),
      // In Library Indicator (on artwork, top right)
      isSaved &&
        React.createElement(
          "div",
          {
            className: "rl-in-library-badge",
            title: "In your Library (click to remove)",
            onClick: (e) => {
              e.stopPropagation();
              onToggleSave?.(release.uri, true);
            },
          },
          React.createElement(
            "svg",
            { width: "13", height: "13", viewBox: "0 0 16 16", fill: "currentColor" },
            React.createElement("path", {
              d: "M15.53 2.47a.75.75 0 0 1 0 1.06L4.907 14.153.47 9.716a.75.75 0 0 1 1.06-1.06l3.377 3.376L14.47 2.47a.75.75 0 0 1 1.06 0z",
            })
          )
        ),
      // Play Button on hover
      React.createElement(
        "button",
        {
          className: "rl-play-btn",
          title: "Play",
          onClick: handlePlay,
        },
        React.createElement(
          "svg",
          { width: "20", height: "20", viewBox: "0 0 24 24", fill: "currentColor" },
          React.createElement("polygon", { points: "5,3 19,12 5,21" })
        )
      )
    ),
    // Metadata
    React.createElement(
      "div",
      { style: { display: "flex", flexDirection: "column", gap: 4 } },
      // Title
      React.createElement(
        "div",
        {
          className: "rl-card-title",
          title: release.title,
        },
        release.title
      ),
      // Artist
      React.createElement(
        "div",
        {
          className: "rl-card-artist",
          onClick: handleArtistClick,
          title: release.artist.name,
        },
        release.artist.name
      ),
      // Badges & Date Row
      React.createElement(
        "div",
        {
          style: {
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginTop: 6,
          },
        },
        React.createElement(
          "div",
          { style: { display: "flex", alignItems: "center", gap: 6, minWidth: 0 } },
          React.createElement(
            "span",
            {
              style: {
                fontSize: 10,
                fontWeight: 800,
                padding: "2px 6px",
                borderRadius: 4,
                backgroundColor: typeBadge.bg,
                color: typeBadge.fg,
                letterSpacing: "0.5px",
                whiteSpace: "nowrap",
                flexShrink: 0,
              },
            },
            typeBadge.label
          ),
          release.trackCount > 1 &&
            React.createElement(
              "span",
              {
                style: {
                  fontSize: 11,
                  color: "rgba(255, 255, 255, 0.5)",
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  minWidth: 0,
                },
              },
              `${release.trackCount} tracks`
            )
        ),
        React.createElement(
          "span",
          {
            style: {
              fontSize: 12,
              color: "rgba(255, 255, 255, 0.5)",
              whiteSpace: "nowrap",
              flexShrink: 0,
              marginLeft: 6,
            },
          },
          release.dateStr
        )
      )
    )
  );
});

// Normalize text for resilient search matching (strips accents & diacritics, lowercases)
function normalizeSearchString(str) {
  if (!str) return "";
  return String(str)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\$/g, "s")
    .trim();
}

// Fast search matcher that compiles query once for high-performance batch filtering
function createSearchMatcher(rawQuery) {
  if (!rawQuery || !rawQuery.trim()) return () => true;
  const q = rawQuery.trim();
  const normQuery = normalizeSearchString(q);
  if (!normQuery) return () => true;

  const strippedQuery = normQuery.replace(/[^\p{L}\p{N}\s]/gu, " ").replace(/\s+/g, " ").trim();
  const compactQuery = normQuery.replace(/[^\p{L}\p{N}]/gu, "");

  return function matches(text) {
    if (!text) return false;
    const normText = normalizeSearchString(text);
    if (normText.includes(normQuery)) return true;

    if (strippedQuery) {
      const strippedText = normText.replace(/[^\p{L}\p{N}\s]/gu, " ").replace(/\s+/g, " ").trim();
      if (strippedText.includes(strippedQuery)) return true;
    }

    if (compactQuery) {
      const compactText = normText.replace(/[^\p{L}\p{N}]/gu, "");
      if (compactText.includes(compactQuery)) return true;
    }

    return false;
  };
}

// ---------------------------------------------------------------------------
// Module-level caches for search, filters, pagination, and scroll persistence across navigation
// ---------------------------------------------------------------------------
let cachedSearchQuery = null;
let cachedOnlySaved = null;
let cachedActiveTypes = null;
let cachedDateRangeDays = null;
let cachedCustomStartDate = null;
let cachedCustomEndDate = null;
let cachedSortOrder = null;
let cachedVisibleCount = INITIAL_BATCH_SIZE;
let cachedScrollTop = 0;

function getSessionItem(key, fallback = "") {
  try {
    if (typeof Spicetify !== "undefined" && Spicetify.LocalStorage?.get) {
      const val = Spicetify.LocalStorage.get(key);
      return val !== null && val !== undefined ? val : fallback;
    }
    if (typeof localStorage !== "undefined") {
      const val = localStorage.getItem(key);
      return val !== null && val !== undefined ? val : fallback;
    }
  } catch {}
  return fallback;
}

function setSessionItem(key, val) {
  try {
    if (val === null || val === undefined) {
      removeSessionItem(key);
      return;
    }
    if (typeof Spicetify !== "undefined" && Spicetify.LocalStorage?.set) {
      Spicetify.LocalStorage.set(key, String(val));
      return;
    }
    if (typeof localStorage !== "undefined") {
      localStorage.setItem(key, String(val));
    }
  } catch {}
}

function removeSessionItem(key) {
  try {
    if (typeof Spicetify !== "undefined" && Spicetify.LocalStorage?.remove) {
      Spicetify.LocalStorage.remove(key);
      return;
    }
    if (typeof localStorage !== "undefined") {
      localStorage.removeItem(key);
    }
  } catch {}
}

function getSpotifyScrollContainer() {
  if (typeof document === "undefined") return null;
  const selectors = [
    ".main-view-container__scroll-node [data-overlayscrollbars-viewport]",
    ".main-view-container__scroll-node .os-viewport",
    "[data-overlayscrollbars-viewport]",
    ".os-viewport",
    ".main-view-container__scroll-node",
    ".main-view-container",
    "main",
  ];
  for (const s of selectors) {
    const el = document.querySelector(s);
    if (el && (el.scrollHeight > el.clientHeight || el.scrollTop > 0)) {
      return el;
    }
  }
  for (const s of selectors) {
    const el = document.querySelector(s);
    if (el) return el;
  }
  return document.scrollingElement || document.documentElement || window;
}

// ---------------------------------------------------------------------------
// 5. Main Application Component
// ---------------------------------------------------------------------------
function ReleaseListApp() {
  // Settings State
  const [settings, setSettings] = useState(() => {
    const saved = getStoredJSON(STORAGE_KEYS.SETTINGS, {});
    let allowed = Array.isArray(saved.allowedTypes)
      ? saved.allowedTypes.filter(isReleaseType)
      : DEFAULT_SETTINGS.allowedTypes;
    if (allowed.length === 0) allowed = DEFAULT_SETTINGS.allowedTypes;

    // One-time: EPs used to be part of "single", so keep them visible wherever singles were
    if (!saved.epSplit) {
      if (allowed.includes("single") && !allowed.includes("ep")) allowed = [...allowed, "ep"];
      cachedActiveTypes = null;
      removeSessionItem(STORAGE_KEYS.ACTIVE_TYPES);
      setStoredJSON(STORAGE_KEYS.SETTINGS, {
        ...saved,
        allowedTypes: allowed,
        epSplit: true,
        // Random Library reads these colors, so a customized set needs the EP entry too
        ...(saved.groupColors ? { groupColors: { ...DEFAULT_SETTINGS.groupColors, ...saved.groupColors } } : {}),
      });
    }

    return {
      ...DEFAULT_SETTINGS,
      ...saved,
      epSplit: true,
      allowedTypes: allowed,
      groupColors: {
        ...DEFAULT_SETTINGS.groupColors,
        ...(saved.groupColors || {}),
      },
    };
  });

  // State (Instantly uses in-memory cache if available, preventing blank flash)
  const [loading, setLoading] = useState(() => !inMemoryCatalog?.items?.length);
  const [syncProgress, setSyncProgress] = useState({ current: 0, total: 0 });
  const [releases, setReleases] = useState(() => inMemoryCatalog?.items || []);
  const [cacheMeta, setCacheMeta] = useState(() => ({
    timestamp: inMemoryCatalog?.timestamp || 0,
    artistCount: inMemoryCatalog?.artistCount || 0,
    lastSync: inMemoryCatalog?.lastSync,
  }));
  const [isCached, setIsCached] = useState(() => Boolean(inMemoryCatalog?.items?.length));

  // Active Filters State (Persisted across navigation and app restarts)
  const [searchQuery, setSearchQuery] = useState(() => {
    if (cachedSearchQuery !== null) return cachedSearchQuery;
    return getSessionItem(STORAGE_KEYS.SEARCH_QUERY, "");
  });
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState(searchQuery);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearchQuery(searchQuery), 150);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const [onlySaved, setOnlySaved] = useState(() => {
    if (cachedOnlySaved !== null) return cachedOnlySaved;
    return getSessionItem(STORAGE_KEYS.ONLY_SAVED, "false") === "true";
  });

  const [savedAlbumUris, setSavedAlbumUris] = useState(() => inMemorySavedUris || new Set());

  const [activeTypes, setActiveTypes] = useState(() => {
    if (cachedActiveTypes !== null && Array.isArray(cachedActiveTypes) && cachedActiveTypes.length > 0) {
      return cachedActiveTypes;
    }
    const stored = getSessionItem(STORAGE_KEYS.ACTIVE_TYPES, "");
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const valid = parsed.filter(isReleaseType);
          if (valid.length > 0) {
            cachedActiveTypes = valid;
            return valid;
          }
        }
      } catch {}
    }
    const saved = settings.allowedTypes;
    const valid = Array.isArray(saved) ? saved.filter(isReleaseType) : [];
    const fallback = valid.length > 0 ? valid : RELEASE_TYPES;
    cachedActiveTypes = fallback;
    return fallback;
  });

  const [dateRangeDays, setDateRangeDays] = useState(() => {
    if (cachedDateRangeDays !== null) return cachedDateRangeDays;
    const stored = getSessionItem(STORAGE_KEYS.DATE_RANGE, "");
    if (stored !== "") {
      const parsed = Number(stored);
      if (!isNaN(parsed)) {
        cachedDateRangeDays = parsed;
        return parsed;
      }
    }
    const fallback = settings.defaultRange ?? 30;
    cachedDateRangeDays = fallback;
    return fallback;
  });

  const [customStartDate, setCustomStartDate] = useState(() => {
    if (cachedCustomStartDate !== null) return cachedCustomStartDate;
    return getSessionItem(STORAGE_KEYS.CUSTOM_START_DATE, "");
  });

  const [customEndDate, setCustomEndDate] = useState(() => {
    if (cachedCustomEndDate !== null) return cachedCustomEndDate;
    return getSessionItem(STORAGE_KEYS.CUSTOM_END_DATE, "");
  });

  const [sortOrder, setSortOrder] = useState(() => {
    if (cachedSortOrder !== null) return cachedSortOrder;
    const stored = getSessionItem(STORAGE_KEYS.SORT_ORDER, "");
    if (stored === "newest" || stored === "oldest") {
      cachedSortOrder = stored;
      return stored;
    }
    const fallback = settings.sortOrder || "newest";
    cachedSortOrder = fallback;
    return fallback;
  });

  // Pagination / Lazy Rendering State (Restores previous count across navigation)
  const [visibleCount, setVisibleCount] = useState(() => cachedVisibleCount || INITIAL_BATCH_SIZE);

  // Synchronize state with module-level caches and persistent storage
  useEffect(() => {
    cachedSearchQuery = searchQuery;
    if (searchQuery) setSessionItem(STORAGE_KEYS.SEARCH_QUERY, searchQuery);
    else removeSessionItem(STORAGE_KEYS.SEARCH_QUERY);
  }, [searchQuery]);

  useEffect(() => {
    cachedOnlySaved = onlySaved;
    setSessionItem(STORAGE_KEYS.ONLY_SAVED, String(onlySaved));
  }, [onlySaved]);

  useEffect(() => {
    cachedActiveTypes = activeTypes;
    setSessionItem(STORAGE_KEYS.ACTIVE_TYPES, JSON.stringify(activeTypes));
  }, [activeTypes]);

  useEffect(() => {
    cachedDateRangeDays = dateRangeDays;
    setSessionItem(STORAGE_KEYS.DATE_RANGE, String(dateRangeDays));
  }, [dateRangeDays]);

  useEffect(() => {
    cachedCustomStartDate = customStartDate;
    if (customStartDate) setSessionItem(STORAGE_KEYS.CUSTOM_START_DATE, customStartDate);
    else removeSessionItem(STORAGE_KEYS.CUSTOM_START_DATE);
  }, [customStartDate]);

  useEffect(() => {
    cachedCustomEndDate = customEndDate;
    if (customEndDate) setSessionItem(STORAGE_KEYS.CUSTOM_END_DATE, customEndDate);
    else removeSessionItem(STORAGE_KEYS.CUSTOM_END_DATE);
  }, [customEndDate]);

  useEffect(() => {
    cachedSortOrder = sortOrder;
    setSessionItem(STORAGE_KEYS.SORT_ORDER, sortOrder);
  }, [sortOrder]);

  useEffect(() => {
    cachedVisibleCount = visibleCount;
  }, [visibleCount]);

  // Scroll Position Tracking and Restoration across navigation
  const hasRestoredScroll = useRef(false);
  useEffect(() => {
    let scrollEl = null;
    let ticking = false;

    const handleScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          if (scrollEl) {
            cachedScrollTop = scrollEl.scrollTop;
          }
          ticking = false;
        });
        ticking = true;
      }
    };

    const timer = setTimeout(() => {
      scrollEl = getSpotifyScrollContainer();
      if (scrollEl && typeof scrollEl.addEventListener === "function") {
        scrollEl.addEventListener("scroll", handleScroll, { passive: true });
        if (cachedScrollTop > 0 && !hasRestoredScroll.current) {
          scrollEl.scrollTop = cachedScrollTop;
          hasRestoredScroll.current = true;
        }
      }
    }, 40);

    return () => {
      clearTimeout(timer);
      if (scrollEl && typeof scrollEl.removeEventListener === "function") {
        if (scrollEl.scrollTop > 0) {
          cachedScrollTop = scrollEl.scrollTop;
        }
        scrollEl.removeEventListener("scroll", handleScroll);
      }
    };
  }, []);

  // Settings Modal State
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [settingsTab, setSettingsTab] = useState("general");

  const searchInputRef = useRef(null);
  const sentinelRef = useRef(null);
  const isSyncingRef = useRef(false);
  const abortSyncRef = useRef(false);

  // Clean up running sync on unmount to prevent worker leaks
  useEffect(() => {
    return () => {
      abortSyncRef.current = true;
      isSyncingRef.current = false;
    };
  }, []);

  // Save Settings helper
  const updateSettings = (newPartial) => {
    setSettings((prev) => {
      const updated = {
        ...prev,
        ...newPartial,
        groupColors: {
          ...(prev.groupColors || DEFAULT_SETTINGS.groupColors),
          ...(newPartial.groupColors || {}),
        },
      };
      setStoredJSON(STORAGE_KEYS.SETTINGS, updated);
      return updated;
    });
  };

  // Sync / Load Releases (Checks In-Memory & IndexedDB FIRST)
  const loadReleases = useCallback(async (forceRefresh = false) => {
    // 1. Check Persistent Cache if not forcing manual refresh
    if (!forceRefresh) {
      const cached = await getCachedCatalog();
      if (cached && Array.isArray(cached.items) && cached.items.length > 0) {
        // Heal cached items: old UTC midnight timestamps, and EPs cached as singles
        let wasHealed = false;
        const healedItems = cached.items.map((item) => {
          let healed = item;
          if (item?.dateStr) {
            const { time } = parseReleaseDate(item.dateStr);
            if (time > 0 && time !== item.time) healed = { ...healed, time };
          }
          if (item?.type === "single" && item.trackCount >= EP_MIN_TRACKS) healed = { ...healed, type: "ep" };
          if (healed !== item) wasHealed = true;
          return healed;
        });

        if (wasHealed) {
          healedItems.sort((a, b) => b.time - a.time);
          cached.items = healedItems;
          saveCachedCatalog(cached).catch(() => {});
        }

        setReleases(healedItems);
        setCacheMeta({ timestamp: cached.timestamp, artistCount: cached.artistCount || 0, lastSync: cached.lastSync });
        setIsCached(true);
        setLoading(false);
        return;
      }
    }

    // 2. Otherwise run sync
    await refreshCatalog();
  }, [settings.syncWindowDays]);

  // full: page every discography again instead of only the artists whose release count changed
  const refreshCatalog = async ({ windowDays: overrideSyncWindow = null, full = false } = {}) => {
    if (isSyncingRef.current) {
      Spicetify.showNotification?.("Release sync is already in progress...");
      return;
    }
    isSyncingRef.current = true;
    abortSyncRef.current = false;
    try {
      setLoading(true);
      const artists = await fetchFollowedArtists();
      if (!artists || artists.length === 0) {
        console.warn("[ReleaseList] Followed artists returned empty. Keeping existing cached releases.");
        if (inMemoryCatalog?.items?.length) {
          setReleases(inMemoryCatalog.items);
        }
        Spicetify.showNotification?.("Could not load followed artists. Check connection.", true);
        setLoading(false);
        return;
      }

      setSyncProgress({ current: 0, total: artists.length });

      // Window cutoff (default 180 days / 6 months; 0 = All Time complete discographies)
      const windowDays = overrideSyncWindow !== null ? overrideSyncWindow : (settings.syncWindowDays ?? 180);
      const cutoffTime = windowDays > 0 ? Date.now() - windowDays * DAY_MS : 0;

      const previousTotals = inMemoryCatalog?.artistTotals || {};
      const artistTotals = {};
      const startedAt = Date.now();
      const stats = { requests: 0, changed: 0, failed: 0 };
      rateLimitPauses = 0;
      const failures = new Map(); // reason -> { count, sample artists }

      // Controlled concurrency (3 workers, 80ms pacing delay) with abort capability
      const discographyArrays = await runConcurrentPool(
        artists,
        3,
        async (artist) => {
          const knownTotal = full ? null : previousTotals[artist.uri] ?? null;
          const result = await fetchArtistReleasesGraphQL(artist.uri, knownTotal);
          if (result.error) {
            stats.failed++;
            const failure = failures.get(result.error) || { reason: result.error, count: 0, sample: "" };
            failure.count++;
            if (failure.count <= 6) failure.sample += (failure.sample ? ", " : "") + artist.name;
            failures.set(result.error, failure);
            // Keep the old count so a failed request does not force a full fetch next time
            if (previousTotals[artist.uri] != null) artistTotals[artist.uri] = previousTotals[artist.uri];
            return null;
          }
          stats.requests += result.requests;
          if (knownTotal !== null && result.total !== knownTotal) stats.changed++;
          if (result.complete && result.total !== null) artistTotals[artist.uri] = result.total;
          const mapped = [];

          for (const item of result.releases) {
            const rawDate = item.date?.isoString || item.date?.year || "";
            const { time: timeMs, dateStr: cleanDateStr } = parseReleaseDate(rawDate);

            // Discard releases older than the sync window
            if (cutoffTime > 0 && timeMs > 0 && timeMs < cutoffTime) {
              continue;
            }

            const trackCount = item.tracks?.totalCount || 1;
            const releaseType = normalizeType(item.type, trackCount);
            if (!releaseType) {
              continue; // Exclude compilation, appears_on, and unrecognized types
            }

            const coverUrl =
              item.coverArt?.sources?.reduce((max, src) => (src.width > max.width ? src : max), { width: 0, url: "" })?.url ||
              "";

            mapped.push({
              uri: item.uri,
              id: item.uri.split(":").pop(),
              title: item.name,
              artist: {
                name: artist.name,
                uri: artist.uri,
              },
              imageURL: coverUrl,
              dateStr: cleanDateStr,
              time: timeMs,
              type: releaseType,
              trackCount,
            });
          }
          return mapped;
        },
        (done, total) => {
          setSyncProgress({ current: done, total });
        },
        80,
        () => abortSyncRef.current
      );

      if (abortSyncRef.current) {
        console.log("[ReleaseList] Sync was cancelled or unmounted.");
        return;
      }

      const flattened = discographyArrays.filter(Boolean).flat();

      // Deduplicate releases by URI, seeding with existing releases so partial syncs never drop catalog data.
      // Releases from artists that are no longer followed are dropped.
      const followedUris = new Set(artists.map((a) => a.uri));
      const uniqueMap = new Map();
      if (Array.isArray(inMemoryCatalog?.items)) {
        inMemoryCatalog.items.forEach((r) => {
          if (r?.uri && followedUris.has(r.artist?.uri)) uniqueMap.set(r.uri, r);
        });
      }
      flattened.forEach((r) => {
        if (r?.uri) {
          uniqueMap.set(r.uri, r);
        }
      });
      const allUnique = Array.from(uniqueMap.values()).sort((a, b) => b.time - a.time);

      // Save to persistent IndexedDB & memory cache
      const now = Date.now();
      const catalogObj = {
        timestamp: now,
        artistCount: artists.length,
        artistTotals,
        lastSync: {
          ...stats,
          rateLimitPauses,
          seconds: Math.round((now - startedAt) / 1000),
          full: full || Object.keys(previousTotals).length === 0,
          failReasons: [...failures.values()].sort((a, b) => b.count - a.count).slice(0, 3),
        },
        items: allUnique,
      };

      await saveCachedCatalog(catalogObj);
      pushReleasesToWeb(allUnique, settings);

      setCacheMeta({ timestamp: now, artistCount: artists.length, lastSync: catalogObj.lastSync });
      setIsCached(true);
      setReleases(allUnique);

      Spicetify.showNotification(
        `Synced ${allUnique.length} releases from ${artists.length} artists in ${catalogObj.lastSync.seconds}s (${stats.requests} requests).`
      );
    } catch (err) {
      console.error("[ReleaseList] Catalog refresh error:", err);
      Spicetify.showNotification("Error syncing releases. Check console.", true);
    } finally {
      isSyncingRef.current = false;
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReleases(false);
  }, [loadReleases]);

  // Toggle Release Type Filter
  const toggleTypeFilter = (typeKey) => {
    setActiveTypes((prev) => {
      let next;
      if (prev.includes(typeKey)) {
        if (prev.length === 1) return prev;
        next = prev.filter((t) => t !== typeKey);
      } else {
        next = [...prev, typeKey];
      }
      updateSettings({ allowedTypes: next });
      return next;
    });
  };

  // Reset visibleCount ONLY when user explicitly changes filters while on page (avoids resetting on remount)
  const isFilterMount = useRef(true);
  useEffect(() => {
    if (isFilterMount.current) {
      isFilterMount.current = false;
      return;
    }
    setVisibleCount(INITIAL_BATCH_SIZE);
    cachedVisibleCount = INITIAL_BATCH_SIZE;
    cachedScrollTop = 0;
  }, [debouncedSearchQuery, activeTypes, onlySaved, dateRangeDays, customStartDate, customEndDate, sortOrder]);

  // Load saved album URIs on startup (cached first, then sync from LibraryAPI)
  useEffect(() => {
    let isMounted = true;
    (async () => {
      const cachedUris = await getCachedSavedAlbumUris();
      if (isMounted && cachedUris && cachedUris.size > 0) {
        setSavedAlbumUris(cachedUris);
      }
      try {
        const freshUris = await fetchSavedAlbumUris();
        if (isMounted && freshUris && freshUris.size > 0) {
          setSavedAlbumUris(freshUris);
          await saveCachedSavedAlbumUris(freshUris);
        }
      } catch (err) {
        console.warn("[ReleaseList] Background library fetch error:", err);
      }
    })();
    return () => {
      isMounted = false;
    };
  }, []);

  const handleToggleSave = useCallback(async (uri, currentlySaved) => {
    const success = await toggleSaveAlbum(uri, currentlySaved);
    if (success) {
      setSavedAlbumUris((prev) => {
        const next = new Set(prev);
        if (currentlySaved) {
          next.delete(uri);
        } else {
          next.add(uri);
        }
        saveCachedSavedAlbumUris(next);
        return next;
      });
    }
  }, []);

  // Filtered and Sorted Releases
  const filteredReleases = useMemo(() => {
    const now = Date.now();
    const searchMatcher = createSearchMatcher(debouncedSearchQuery);

    const result = releases.filter((r) => {
      // 1. Category Type filter (strictly Albums, EPs and Singles only)
      if (!isReleaseType(r.type)) return false;
      if (!activeTypes.includes(r.type)) return false;

      // 2. Date Range filter
      if (dateRangeDays > 0) {
        const cutoff = now - dateRangeDays * DAY_MS;
        if (r.time < cutoff) return false;
      } else if (dateRangeDays === -1) {
        if (customStartDate) {
          const startMs = parseReleaseDate(customStartDate).time - 12 * 3600 * 1000;
          if (!isNaN(startMs) && r.time < startMs) return false;
        }
        if (customEndDate) {
          const endMs = parseReleaseDate(customEndDate).time + 12 * 3600 * 1000;
          if (!isNaN(endMs) && r.time > endMs) return false;
        }
      }

      // 3. Search query filter (smart diacritics and special character matching)
      if (debouncedSearchQuery.trim()) {
        const titleMatch = searchMatcher(r.title);
        const artistMatch = searchMatcher(r.artist?.name);
        if (!titleMatch && !artistMatch) return false;
      }

      // 4. In-Library filter
      if (onlySaved && !savedAlbumUris.has(r.uri)) {
        return false;
      }

      return true;
    });

    if (sortOrder === "oldest") {
      result.sort((a, b) => a.time - b.time);
    } else {
      result.sort((a, b) => b.time - a.time);
    }

    return result;
  }, [releases, activeTypes, onlySaved, savedAlbumUris, dateRangeDays, customStartDate, customEndDate, debouncedSearchQuery, sortOrder]);

  const visibleItemCount = Math.min(visibleCount, filteredReleases.length);

  // IntersectionObserver for Infinite Scrolling near bottom
  useEffect(() => {
    if (!sentinelRef.current) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          setVisibleCount((prev) => {
            if (prev < filteredReleases.length) {
              const next = Math.min(prev + LOAD_MORE_STEP, filteredReleases.length);
              cachedVisibleCount = next;
              return next;
            }
            return prev;
          });
        }
      },
      { rootMargin: "2000px" }
    );
    observer.observe(sentinelRef.current);
    return () => observer.disconnect();
  }, [filteredReleases.length]);

  // Ensure scroll position is restored when items are rendered
  useEffect(() => {
    if (cachedScrollTop > 0 && visibleItemCount > 0 && !hasRestoredScroll.current) {
      const scrollEl = getSpotifyScrollContainer();
      if (scrollEl) {
        scrollEl.scrollTop = cachedScrollTop;
        hasRestoredScroll.current = true;
      }
    }
  }, [visibleItemCount]);

  // Group all filtered items by Feed Mode (Date, Date + Type, or Type) & Order.
  // Grouping happens before pagination so loading more only appends to the end of the layout.
  const allFeedSections = useMemo(() => {
    const now = Date.now();
    const headerCache = new Map();
    const dayHeaderFor = (r) => {
      const key = r.dateStr || r.time;
      let header = headerCache.get(key);
      if (header === undefined) {
        header = getDayHeader(r.time, now, r.dateStr);
        headerCache.set(key, header);
      }
      return header;
    };
    const mode = settings.groupBy || "date";
    const order = settings.releasesOrder || "artist";

    // Helper to sort items according to settings.releasesOrder
    const sortWithinGroup = (items) => {
      if (order === "album-group") {
        return [...items].sort((a, b) => {
          const typeDiff = (TYPE_ORDER_INDEX[a.type] ?? 99) - (TYPE_ORDER_INDEX[b.type] ?? 99);
          if (typeDiff !== 0) return typeDiff;
          return (a.artist?.name || "").localeCompare(b.artist?.name || "");
        });
      }
      if (order === "artist") {
        return [...items].sort((a, b) => (a.artist?.name || "").localeCompare(b.artist?.name || ""));
      }
      return items;
    };

    if (mode === "type") {
      // Group feed by release type: Albums, EPs, Singles
      const typeMap = new Map();
      const typeKeys = RELEASE_TYPES;
      typeKeys.forEach((k) => typeMap.set(k, []));

      filteredReleases.forEach((r) => {
        if (!typeMap.has(r.type)) typeMap.set(r.type, []);
        typeMap.get(r.type).push(r);
      });

      return typeKeys
        .filter((k) => (typeMap.get(k) || []).length > 0)
        .map((typeKey) => {
          const badge = getTypeBadge(typeKey, settings.groupColors);
          return {
            id: `type-${typeKey}`,
            title: badge.label,
            badgeBg: badge.bg,
            badgeFg: badge.fg,
            isTypeHeader: true,
            count: typeMap.get(typeKey).length,
            items: typeMap.get(typeKey),
            subgroups: null,
          };
        });
    }

    if (mode === "date_type") {
      // Day-by-Day with release type subheadings
      const dateMap = new Map();
      filteredReleases.forEach((r) => {
        const header = dayHeaderFor(r);
        if (!dateMap.has(header)) dateMap.set(header, []);
        dateMap.get(header).push(r);
      });

      return Array.from(dateMap.entries()).map(([dateHeader, dayItems]) => {
        const subMap = new Map();
        RELEASE_TYPES.forEach((k) => subMap.set(k, []));
        dayItems.forEach((item) => {
          if (!subMap.has(item.type)) subMap.set(item.type, []);
          subMap.get(item.type).push(item);
        });

        const subgroups = RELEASE_TYPES
          .filter((k) => (subMap.get(k) || []).length > 0)
          .map((typeKey) => {
            const badge = getTypeBadge(typeKey, settings.groupColors);
            return {
              typeKey,
              title: badge.label,
              badgeBg: badge.bg,
              badgeFg: badge.fg,
              count: subMap.get(typeKey).length,
              items: subMap.get(typeKey),
            };
          });

        return {
          id: `date-${dateHeader}`,
          title: dateHeader,
          isTypeHeader: false,
          count: dayItems.length,
          items: dayItems,
          subgroups,
        };
      });
    }

    // Default: 'date' mode (Day-by-Day Timeline)
    const dateMap = new Map();
    filteredReleases.forEach((r) => {
      const header = dayHeaderFor(r);
      if (!dateMap.has(header)) dateMap.set(header, []);
      dateMap.get(header).push(r);
    });

    return Array.from(dateMap.entries()).map(([dateHeader, dayItems]) => {
      const sorted = sortWithinGroup(dayItems);
      return {
        id: `date-${dateHeader}`,
        title: dateHeader,
        isTypeHeader: false,
        count: sorted.length,
        items: sorted,
        subgroups: null,
      };
    });
  }, [filteredReleases, settings.groupBy, settings.releasesOrder, settings.groupColors]);

  // Take the first visibleCount items in rendered order, keeping full group counts in headers
  const feedSections = useMemo(() => {
    let remaining = visibleItemCount;
    const result = [];
    for (const section of allFeedSections) {
      if (remaining <= 0) break;
      if (section.subgroups) {
        const subgroups = [];
        for (const sub of section.subgroups) {
          if (remaining <= 0) break;
          const items = sub.items.slice(0, remaining);
          remaining -= items.length;
          subgroups.push({ ...sub, items });
        }
        result.push({ ...section, subgroups });
      } else {
        const items = section.items.slice(0, remaining);
        remaining -= items.length;
        result.push({ ...section, items });
      }
    }
    return result;
  }, [allFeedSections, visibleItemCount]);

  // Render UI
  return React.createElement(
    "div",
    { className: "rl-container" },
    // Top Bar Header
    React.createElement(
      "div",
      {
        style: {
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: 16,
          marginBottom: 24,
        },
      },
      // App Title & Subtitle (Standardized Design Language)
      React.createElement(
        "div",
        null,
        React.createElement(
          "h1",
          {
            style: {
              margin: 0,
              fontSize: 26,
              fontWeight: 800,
              letterSpacing: "-0.5px",
              color: "var(--spice-text, #ffffff)",
            },
          },
          "Release List"
        ),
        React.createElement(
          "div",
          {
            style: {
              fontSize: 13,
              color: "var(--spice-subtext, rgba(255, 255, 255, 0.6))",
              marginTop: 4,
            },
          },
          `${filteredReleases.length} releases`
        )
      ),

      // Header Actions (Layout, Settings, Refresh)
      React.createElement(
        "div",
        { style: { display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" } },
        // Settings Button
        React.createElement(
          "button",
          {
            className: "rl-chip",
            style: {
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
            },
            onClick: () => setShowSettingsModal(true),
            title: "Open Settings",
            "aria-label": "Settings",
          },
          React.createElement(
            "svg",
            { width: "15", height: "15", viewBox: "0 0 24 24", fill: "currentColor" },
            React.createElement("path", {
              d: "M19.14 12.94c.04-.3.06-.61.06-.94 0-.32-.02-.64-.07-.94l2.03-1.58c.18-.14.23-.41.12-.61l-1.92-3.32c-.12-.22-.37-.29-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54c-.04-.24-.24-.41-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.05.3-.09.63-.09.94s.02.64.07.94l-2.03 1.58c-.18.14-.23.41-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6 3.6z",
            })
          ),
          "Settings"
        ),

        // Refresh Button
        React.createElement(
          "button",
          {
            className: "rl-chip",
            style: {
              background: "#1ed760",
              color: "#000000",
              border: "none",
              fontWeight: "700",
              opacity: loading ? 0.7 : 1,
              cursor: loading ? "default" : "pointer",
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
            },
            onClick: () => refreshCatalog(),
            disabled: loading,
            title: "Sync fresh releases from Spotify",
          },
          React.createElement(
            "svg",
            {
              width: "14",
              height: "14",
              viewBox: "0 0 24 24",
              fill: "currentColor",
              style: {
                animation: loading ? "rl-spin 0.8s linear infinite" : "none",
                display: "block",
              },
            },
            React.createElement("path", {
              d: "M17.65 6.35C16.2 4.9 14.21 4 12 4c-4.42 0-7.99 3.58-7.99 8s3.57 8 7.99 8c3.73 0 6.84-2.55 7.73-6h-2.08c-.82 2.33-3.04 4-5.65 4-3.31 0-6-2.69-6-6s2.69-6 6-6c1.66 0 3.14.69 4.22 1.78L13 11h7V4l-2.35 2.35z",
            })
          ),
          loading ? "Syncing\u2026" : "Refresh"
        )
      )
    ),

    // Search and Filters Bar
    React.createElement(
      "div",
      {
        style: {
          display: "flex",
          flexDirection: "column",
          gap: 14,
          padding: "16px 20px",
          background: "rgba(255, 255, 255, 0.03)",
          border: "1px solid rgba(255, 255, 255, 0.08)",
          borderRadius: 10,
          marginBottom: 28,
        },
      },
      // Search Row & Sort
      React.createElement(
        "div",
        { style: { display: "flex", gap: 12, alignItems: "center" } },
        React.createElement(
          "div",
          { style: { position: "relative", flex: 1 } },
          React.createElement("input", {
            ref: searchInputRef,
            type: "text",
            placeholder: "Search releases by artist or title...",
            value: searchQuery,
            onChange: (e) => setSearchQuery(e.target.value),
            style: {
              width: "100%",
              padding: "8px 16px 8px 34px",
              background: "rgba(255, 255, 255, 0.07)",
              border: "1px solid rgba(255, 255, 255, 0.12)",
              borderRadius: "500px",
              color: "#ffffff",
              fontSize: 13,
              outline: "none",
              boxSizing: "border-box",
            },
          }),
          React.createElement(
            "svg",
            {
              width: "16",
              height: "16",
              viewBox: "0 0 24 24",
              fill: "rgba(255,255,255,0.45)",
              style: { position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)" },
            },
            React.createElement("path", {
              d: "M15.5 14h-.79l-.28-.27A6.471 6.471 0 0 0 16 9.5 6.5 6.5 0 1 0 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z",
            })
          ),
          searchQuery &&
            React.createElement(
              "button",
              {
                onClick: () => setSearchQuery(""),
                style: {
                  position: "absolute",
                  right: 10,
                  top: "50%",
                  transform: "translateY(-50%)",
                  background: "transparent",
                  border: "none",
                  color: "rgba(255,255,255,0.5)",
                  cursor: "pointer",
                  fontSize: 14,
                },
              },
              "✕"
            )
        ),
        // Sort Order Toggle
        React.createElement(
          "button",
          {
            className: "rl-chip",
            onClick: () => {
              const nextOrder = sortOrder === "newest" ? "oldest" : "newest";
              setSortOrder(nextOrder);
              updateSettings({ sortOrder: nextOrder });
            },
            title: "Toggle release sort order",
          },
          sortOrder === "newest" ? "Newest First ▾" : "Oldest First ▴"
        )
      ),

      // Filter Chips (Date Range & Multi-Type Toggles)
      React.createElement(
        "div",
        {
          style: {
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: 12,
          },
        },
        // Date Presets
        React.createElement(
          "div",
          { style: { display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" } },
          React.createElement(
            "span",
            { style: { fontSize: 12, color: "rgba(255,255,255,0.5)", fontWeight: 600 } },
            "Range:"
          ),
          [
            { label: "7 Days", val: 7 },
            { label: "14 Days", val: 14 },
            { label: "30 Days", val: 30 },
            { label: "60 Days", val: 60 },
            { label: "90 Days", val: 90 },
            { label: "All Time", val: 0 },
            { label: "Custom", val: -1 },
          ].map((item) =>
            React.createElement(
              "button",
              {
                key: item.val,
                className: `rl-chip ${dateRangeDays === item.val ? "active" : ""}`,
                onClick: () => {
                  setDateRangeDays(item.val);
                  updateSettings({ defaultRange: item.val });
                },
              },
              item.label
            )
          ),
          // Custom Date Inputs if active
          dateRangeDays === -1 &&
            React.createElement(
              "div",
              { style: { display: "flex", gap: 8, alignItems: "center" } },
              React.createElement("input", {
                type: "date",
                value: customStartDate,
                onChange: (e) => setCustomStartDate(e.target.value),
                style: {
                  background: "rgba(255,255,255,0.08)",
                  border: "1px solid rgba(255,255,255,0.15)",
                  color: "#fff",
                  borderRadius: 6,
                  padding: "4px 8px",
                  fontSize: 12,
                },
              }),
              React.createElement("span", null, "to"),
              React.createElement("input", {
                type: "date",
                value: customEndDate,
                onChange: (e) => setCustomEndDate(e.target.value),
                style: {
                  background: "rgba(255,255,255,0.08)",
                  border: "1px solid rgba(255,255,255,0.15)",
                  color: "#fff",
                  borderRadius: 6,
                  padding: "4px 8px",
                  fontSize: 12,
                },
              })
            )
        ),

        // Type Multi-Select Toggles
        React.createElement(
          "div",
          { style: { display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" } },
          React.createElement(
            "span",
            { style: { fontSize: 12, color: "rgba(255,255,255,0.5)", fontWeight: 600 } },
            "Types:"
          ),
          [
            { label: "Albums", val: "album" },
            { label: "EPs", val: "ep" },
            { label: "Singles", val: "single" },
          ].map((item) =>
            React.createElement(
              "button",
              {
                key: item.val,
                className: `rl-chip ${activeTypes.includes(item.val) ? "active" : ""}`,
                onClick: () => toggleTypeFilter(item.val),
                title: `Toggle ${item.label}`,
              },
              `${activeTypes.includes(item.val) ? "✓ " : ""}${item.label}`
            )
          ),
          // In Library Filter Toggle
          React.createElement(
            "button",
            {
              className: `rl-chip ${onlySaved ? "active" : ""}`,
              style: {
                borderColor: onlySaved ? "var(--spice-button, #1ed760)" : "rgba(255, 255, 255, 0.15)",
                background: onlySaved ? "rgba(30, 215, 96, 0.2)" : "transparent",
                color: onlySaved ? "#1ed760" : "var(--spice-text, #ffffff)",
                marginLeft: 4,
              },
              onClick: () => setOnlySaved((prev) => !prev),
              title: "Show only releases in your Library",
            },
            React.createElement(
              "svg",
              { width: "12", height: "12", viewBox: "0 0 16 16", fill: "currentColor" },
              React.createElement("path", {
                d: "M15.53 2.47a.75.75 0 0 1 0 1.06L4.907 14.153.47 9.716a.75.75 0 0 1 1.06-1.06l3.377 3.376L14.47 2.47a.75.75 0 0 1 1.06 0z",
              })
            ),
            "In Library"
          )
        )
      )
    ),

    // Loading Progress Banner (Only shows during active network sync)
    loading &&
      React.createElement(
        "div",
        {
          style: {
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "24px",
            background: "rgba(30, 215, 96, 0.08)",
            border: "1px solid rgba(30, 215, 96, 0.2)",
            borderRadius: 8,
            marginBottom: 24,
            gap: 16,
          },
        },
        React.createElement("div", {
          style: {
            width: 20,
            height: 20,
            border: "2px solid #1ed760",
            borderTopColor: "transparent",
            borderRadius: "50%",
            animation: "rl-spin 0.8s linear infinite",
          },
        }),
        React.createElement(
          "div",
          { style: { fontSize: 14, fontWeight: 600 } },
          syncProgress.total > 0
            ? `Syncing releases from followed artists (${syncProgress.current} / ${syncProgress.total})...`
            : "Loading releases from local cache..."
        )
      ),

    // Empty State
    !loading && filteredReleases.length === 0 &&
      React.createElement(
        "div",
        {
          style: {
            textAlign: "center",
            padding: "80px 20px",
            color: "rgba(255, 255, 255, 0.55)",
          },
        },
        React.createElement("div", { style: { fontSize: 44, marginBottom: 12 } }, "📅"),
        React.createElement("h3", { style: { margin: "0 0 8px 0", color: "#fff", fontSize: 18 } }, "No releases match your filters"),
        React.createElement("p", { style: { margin: 0, fontSize: 14 } }, "Try expanding your date range, toggling more release types, or searching for a different artist.")
      ),

    // Feed Timeline / Type Sections
    feedSections.map((section) =>
      React.createElement(
        "section",
        { key: section.id, style: { marginBottom: 36 } },
        // Sticky Section Header
        React.createElement(
          "div",
          {
            style: {
              position: "sticky",
              top: 0,
              zIndex: 10,
              background: "rgba(18, 18, 18, 0.88)",
              backdropFilter: "blur(12px)",
              padding: "10px 0",
              marginBottom: 16,
              borderBottom: "1px solid rgba(255, 255, 255, 0.08)",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            },
          },
          React.createElement(
            "div",
            { style: { display: "flex", alignItems: "center", gap: 10 } },
            section.isTypeHeader &&
              React.createElement(
                "span",
                {
                  style: {
                    fontSize: 12,
                    fontWeight: 800,
                    padding: "3px 10px",
                    borderRadius: 4,
                    backgroundColor: section.badgeBg,
                    color: section.badgeFg,
                    letterSpacing: "0.5px",
                  },
                },
                section.title
              ),
            !section.isTypeHeader &&
              React.createElement(
                "h2",
                {
                  style: {
                    margin: 0,
                    fontSize: 18,
                    fontWeight: 800,
                    letterSpacing: "-0.2px",
                    color: "#ffffff",
                  },
                },
                section.title
              )
          ),
          React.createElement(
            "span",
            {
              style: {
                fontSize: 12,
                color: "rgba(255, 255, 255, 0.5)",
                fontWeight: 600,
              },
            },
            `${section.count} ${section.count === 1 ? "release" : "releases"}`
          )
        ),

        // If Section has subgroups (mode === 'date_type')
        section.subgroups
          ? section.subgroups.map((sub) =>
              React.createElement(
                "div",
                { key: sub.typeKey, style: { marginBottom: 20 } },
                // Subgroup mini header
                React.createElement(
                  "div",
                  {
                    style: {
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      marginBottom: 10,
                      marginTop: 4,
                    },
                  },
                  React.createElement(
                    "span",
                    {
                      style: {
                        fontSize: 10,
                        fontWeight: 800,
                        padding: "2px 7px",
                        borderRadius: 4,
                        backgroundColor: sub.badgeBg,
                        color: sub.badgeFg,
                        letterSpacing: "0.5px",
                      },
                    },
                    sub.title
                  ),
                  React.createElement(
                    "span",
                    { style: { fontSize: 11, color: "rgba(255, 255, 255, 0.4)" } },
                    `(${sub.count})`
                  )
                ),
                // Subgroup items
                React.createElement(
                  "div",
                  { className: "rl-grid" },
                  sub.items.map((release) =>
                    React.createElement(ReleaseCard, {
                      key: release.uri,
                      release,
                      groupColors: settings.groupColors,
                      isSaved: savedAlbumUris.has(release.uri),
                      onToggleSave: handleToggleSave,
                    })
                  )
                )
              )
            )
          : // Normal items container
            React.createElement(
              "div",
              { className: "rl-grid" },
              section.items.map((release) =>
                React.createElement(ReleaseCard, {
                  key: release.uri,
                  release,
                  groupColors: settings.groupColors,
                  isSaved: savedAlbumUris.has(release.uri),
                  onToggleSave: handleToggleSave,
                })
              )
            )
      )
    ),

    // Bottom Sentinel & Load More Controls
    !loading && filteredReleases.length > 0 &&
      React.createElement(
        "div",
        {
          style: {
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            padding: "32px 16px 48px 16px",
            gap: 14,
          },
        },
        // Scroll Sentinel for smooth infinite loading
        visibleCount < filteredReleases.length &&
          React.createElement("div", { ref: sentinelRef, style: { height: 1 } }),

        // Status / Count Counter
        React.createElement(
          "div",
          { style: { fontSize: 13, color: "rgba(255,255,255,0.5)", fontWeight: 500 } },
          `Showing ${visibleItemCount} of ${filteredReleases.length} releases`
        ),

        // Load More Buttons
        visibleCount < filteredReleases.length &&
          React.createElement(
            "div",
            { style: { display: "flex", gap: 10 } },
            React.createElement(
              "button",
              {
                className: "rl-chip active",
                style: { padding: "8px 24px", fontSize: 14 },
                onClick: () =>
                  setVisibleCount((prev) => Math.min(prev + LOAD_MORE_STEP, filteredReleases.length)),
              },
              `Load More (+${Math.min(LOAD_MORE_STEP, filteredReleases.length - visibleCount)})`
            ),
            React.createElement(
              "button",
              {
                className: "rl-chip",
                style: { padding: "8px 16px", fontSize: 14 },
                onClick: () => setVisibleCount(filteredReleases.length),
                title: "Render all remaining releases",
              },
              "Load All"
            )
          )
      ),

    // --- Tabbed Settings Modal (Cut-off Safe) ---
    showSettingsModal &&
      React.createElement(
        Modal,
        {
          title: "Release List Settings",
          onClose: () => setShowSettingsModal(false),
        },
        // Settings Tab Navigation (Wrapped so never cut off)
        React.createElement(
          "div",
          {
            style: {
              display: "flex",
              gap: 6,
              flexWrap: "wrap",
              paddingBottom: 8,
              borderBottom: "1px solid rgba(255,255,255,0.1)",
            },
          },
          [
            { id: "general", label: "General" },
            { id: "types", label: "Grouping & Release Types" },
            { id: "cache", label: "Cache & Storage" },
          ].map((tab) =>
            React.createElement(
              "button",
              {
                key: tab.id,
                className: `rl-chip ${settingsTab === tab.id ? "active" : ""}`,
                style: { padding: "4px 12px", fontSize: 12 },
                onClick: () => setSettingsTab(tab.id),
              },
              tab.label
            )
          )
        ),

        // Tab 1: General Settings
        settingsTab === "general" &&
          React.createElement(
            "div",
            { style: { display: "flex", flexDirection: "column", gap: 16 } },
            // Default Range
            React.createElement(
              "div",
              null,
              React.createElement("label", { style: { fontSize: 13, fontWeight: 600, display: "block", marginBottom: 6 } }, "Default Filter Range"),
              React.createElement(
                "select",
                {
                  value: settings.defaultRange,
                  onChange: (e) => {
                    const val = Number(e.target.value);
                    setDateRangeDays(val);
                    updateSettings({ defaultRange: val });
                  },
                  style: {
                    width: "100%",
                    padding: "8px 12px",
                    background: "#282828",
                    border: "1px solid rgba(255,255,255,0.15)",
                    borderRadius: 6,
                    color: "#fff",
                  },
                },
                React.createElement("option", { value: 7 }, "7 Days"),
                React.createElement("option", { value: 14 }, "14 Days"),
                React.createElement("option", { value: 30 }, "30 Days"),
                React.createElement("option", { value: 60 }, "60 Days"),
                React.createElement("option", { value: 90 }, "90 Days"),
                React.createElement("option", { value: 0 }, "All Time")
              )
            ),
            // Default Sort Order
            React.createElement(
              "div",
              null,
              React.createElement("label", { style: { fontSize: 13, fontWeight: 600, display: "block", marginBottom: 6 } }, "Release Date Sorting"),
              React.createElement(
                "select",
                {
                  value: settings.sortOrder,
                  onChange: (e) => {
                    setSortOrder(e.target.value);
                    updateSettings({ sortOrder: e.target.value });
                  },
                  style: {
                    width: "100%",
                    padding: "8px 12px",
                    background: "#282828",
                    border: "1px solid rgba(255,255,255,0.15)",
                    borderRadius: 6,
                    color: "#fff",
                  },
                },
                React.createElement("option", { value: "newest" }, "Newest Releases First"),
                React.createElement("option", { value: "oldest" }, "Oldest Releases First")
              )
            ),
            // Sync History Window
            React.createElement(
              "div",
              null,
              React.createElement("label", { style: { fontSize: 13, fontWeight: 600, display: "block", marginBottom: 6 } }, "Sync History Window (Catalog Depth)"),
              React.createElement(
                "select",
                {
                  value: settings.syncWindowDays ?? 180,
                  onChange: (e) => {
                    const val = Number(e.target.value);
                    updateSettings({ syncWindowDays: val });
                    Spicetify.showNotification(`Catalog depth set to ${val === 0 ? "All Time" : `${val} days`}. Syncing...`);
                    refreshCatalog({ windowDays: val, full: true });
                  },
                  style: {
                    width: "100%",
                    padding: "8px 12px",
                    background: "#282828",
                    border: "1px solid rgba(255,255,255,0.15)",
                    borderRadius: 6,
                    color: "#fff",
                  },
                },
                React.createElement("option", { value: 90 }, "90 Days (Fastest sync)"),
                React.createElement("option", { value: 180 }, "180 Days (Recommended / 6 Months)"),
                React.createElement("option", { value: 365 }, "365 Days (1 Full Year)"),
                React.createElement("option", { value: 0 }, "All Time (Complete Discographies)")
              ),
              React.createElement(
                "div",
                { style: { fontSize: 11, color: "rgba(255,255,255,0.45)", marginTop: 4 } },
                "Limits how far back Release List scans for releases. Keeps your local cache lean, fast, and free of ancient albums."
              )
            ),
            // Web Sync
            React.createElement(
              "div",
              null,
              React.createElement("label", { style: { fontSize: 13, fontWeight: 600, display: "block", marginBottom: 6 } }, "Web Sync Address (Optional)"),
              React.createElement("input", {
                type: "url",
                placeholder: "http://192.168.1.100:8081",
                defaultValue: getWebSyncUrl(),
                onChange: (e) => {
                  try {
                    localStorage.setItem(STORAGE_WEB_SYNC_URL, e.target.value.trim());
                  } catch (err) {}
                },
                style: {
                  width: "100%",
                  padding: "8px 12px",
                  background: "#282828",
                  border: "1px solid rgba(255,255,255,0.15)",
                  borderRadius: 6,
                  color: "#fff",
                  boxSizing: "border-box",
                },
              }),
              React.createElement(
                "button",
                {
                  className: "rl-chip",
                  style: { marginTop: 8 },
                  title: "Push the cached catalog to the web without syncing from Spotify",
                  onClick: () => pushReleasesToWeb(releases, settings, true),
                },
                "Sync to Web Now"
              ),
              React.createElement(
                "div",
                { style: { fontSize: 11, color: "rgba(255,255,255,0.45)", marginTop: 4 } },
                "Address of a Spicetify Library sync endpoint; Refresh and Sync to Web Now push the release catalog to it. Shared with Random Library."
              )
            )
          ),

        // Tab 2: Release Types & Colors
        settingsTab === "types" &&
          React.createElement(
            "div",
            { style: { display: "flex", flexDirection: "column", gap: 20 } },
            // Section A: Grouping Mode
            React.createElement(
              "div",
              {
                style: {
                  padding: "12px 14px",
                  borderRadius: 8,
                  background: "rgba(255,255,255,0.03)",
                  border: "1px solid rgba(255,255,255,0.08)",
                },
              },
              React.createElement("div", { style: { fontWeight: 700, fontSize: 14, marginBottom: 8 } }, "Feed Grouping"),
              React.createElement(
                "div",
                { style: { display: "flex", gap: 12, flexWrap: "wrap" } },
                React.createElement(
                  "div",
                  { style: { flex: 1, minWidth: 200 } },
                  React.createElement("label", { style: { fontSize: 12, color: "rgba(255,255,255,0.6)", display: "block", marginBottom: 4 } }, "Group Feed By:"),
                  React.createElement(
                    "select",
                    {
                      value: settings.groupBy || "date",
                      onChange: (e) => updateSettings({ groupBy: e.target.value }),
                      style: {
                        width: "100%",
                        padding: "6px 10px",
                        background: "#282828",
                        border: "1px solid rgba(255,255,255,0.15)",
                        borderRadius: 6,
                        color: "#fff",
                        fontSize: 13,
                      },
                    },
                    React.createElement("option", { value: "date" }, "Day-by-Day Timeline"),
                    React.createElement("option", { value: "date_type" }, "Day-by-Day with Type Subgroups"),
                    React.createElement("option", { value: "type" }, "By Release Type (Albums, EPs, Singles)")
                  )
                ),
                React.createElement(
                  "div",
                  { style: { flex: 1, minWidth: 200 } },
                  React.createElement("label", { style: { fontSize: 12, color: "rgba(255,255,255,0.6)", display: "block", marginBottom: 4 } }, "Order Within Groups:"),
                  React.createElement(
                    "select",
                    {
                      value: settings.releasesOrder || "artist",
                      onChange: (e) => updateSettings({ releasesOrder: e.target.value }),
                      style: {
                        width: "100%",
                        padding: "6px 10px",
                        background: "#282828",
                        border: "1px solid rgba(255,255,255,0.15)",
                        borderRadius: 6,
                        color: "#fff",
                        fontSize: 13,
                      },
                    },
                    React.createElement("option", { value: "artist" }, "Artist Name (A-Z)"),
                    React.createElement("option", { value: "album-group" }, "Album Type → Artist Name"),
                    React.createElement("option", { value: "time" }, "Chronological (Time)")
                  )
                )
              )
            ),

            // Section B: Included Release Types
            React.createElement(
              "div",
              null,
              React.createElement("div", { style: { fontWeight: 700, fontSize: 14, marginBottom: 8 } }, "Included Release Types"),
              React.createElement("div", { style: { fontSize: 12, color: "rgba(255,255,255,0.6)", marginBottom: 10 } }, "Select which release groups to include in your catalog feed:"),
              React.createElement(
                "div",
                { style: { display: "flex", flexDirection: "column", gap: 8 } },
                [
                  { id: "album", label: "Albums (LP studio releases)", desc: "Full-length album releases" },
                  { id: "ep", label: "EPs", desc: `Short releases with ${EP_MIN_TRACKS} or more tracks` },
                  { id: "single", label: "Singles", desc: `Releases with fewer than ${EP_MIN_TRACKS} tracks` },
                ].map((type) =>
                  React.createElement(
                    "label",
                    {
                      key: type.id,
                      style: {
                        display: "flex",
                        gap: 12,
                        alignItems: "flex-start",
                        padding: "8px 12px",
                        borderRadius: 6,
                        background: "rgba(255,255,255,0.04)",
                        cursor: "pointer",
                      },
                    },
                    React.createElement("input", {
                      type: "checkbox",
                      checked: activeTypes.includes(type.id),
                      onChange: () => toggleTypeFilter(type.id),
                      style: { marginTop: 3 },
                    }),
                    React.createElement(
                      "div",
                      null,
                      React.createElement("div", { style: { fontWeight: 600, fontSize: 13 } }, type.label),
                      React.createElement("div", { style: { fontSize: 11, color: "rgba(255,255,255,0.45)" } }, type.desc)
                    )
                  )
                )
              )
            ),

            // Section C: Release Type Colors
            React.createElement(
              "div",
              null,
              React.createElement("div", { style: { fontWeight: 700, fontSize: 14, marginBottom: 4 } }, "Release Type Colors"),
              React.createElement(
                "div",
                { style: { fontSize: 12, color: "rgba(255,255,255,0.6)", marginBottom: 12 } },
                "Customize badge and accent colors for Albums, EPs and Singles:"
              ),

              // Color Rows
              React.createElement(
                "div",
                { style: { display: "flex", flexDirection: "column", gap: 8 } },
                [
                  { key: "album", label: "Albums", desc: "Full LP studio releases", defaultColor: DEFAULT_SETTINGS.groupColors.album },
                  { key: "ep", label: "EPs", desc: "Extended plays", defaultColor: DEFAULT_SETTINGS.groupColors.ep },
                  { key: "single", label: "Singles", desc: "Single track drops", defaultColor: DEFAULT_SETTINGS.groupColors.single },
                ].map(({ key, label, desc, defaultColor }) => {
                  const currentColor = (settings.groupColors && settings.groupColors[key]) || defaultColor;
                  const contrastFg = getContrastYIQ(currentColor);

                  return React.createElement(
                    "div",
                    {
                      key,
                      style: {
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        padding: "8px 12px",
                        borderRadius: 6,
                        background: "rgba(255,255,255,0.04)",
                        gap: 12,
                        flexWrap: "wrap",
                      },
                    },
                    // Left: Picker, Hex, Badge
                    React.createElement(
                      "div",
                      { style: { display: "flex", alignItems: "center", gap: 10, minWidth: 210 } },
                      React.createElement("input", {
                        type: "color",
                        className: "rl-color-picker",
                        value: currentColor,
                        onChange: (e) =>
                          updateSettings({
                            groupColors: { ...(settings.groupColors || {}), [key]: e.target.value },
                          }),
                        title: `Pick color for ${label}`,
                      }),
                      React.createElement("input", {
                        type: "text",
                        className: "rl-color-hex",
                        value: currentColor,
                        onChange: (e) => {
                          const val = e.target.value;
                          updateSettings({
                            groupColors: { ...(settings.groupColors || {}), [key]: val },
                          });
                        },
                        placeholder: "#RRGGBB",
                      }),
                      React.createElement(
                        "span",
                        {
                          style: {
                            backgroundColor: currentColor,
                            color: contrastFg,
                            padding: "3px 8px",
                            borderRadius: 4,
                            fontWeight: 800,
                            fontSize: 10,
                            letterSpacing: "0.5px",
                          },
                        },
                        TYPE_LABELS[key]
                      )
                    ),
                    // Middle: Label and Desc
                    React.createElement(
                      "div",
                      { style: { flex: 1, minWidth: 140 } },
                      React.createElement("div", { style: { fontWeight: 600, fontSize: 13 } }, label),
                      React.createElement("div", { style: { fontSize: 11, color: "rgba(255,255,255,0.4)" } }, desc)
                    ),
                    // Right: Reset button
                    React.createElement(
                      "button",
                      {
                        className: "rl-chip",
                        style: { fontSize: 11, padding: "3px 8px" },
                        onClick: () =>
                          updateSettings({
                            groupColors: { ...(settings.groupColors || {}), [key]: defaultColor },
                          }),
                        title: `Reset ${label} to default color (${defaultColor})`,
                      },
                      "Reset"
                    )
                  );
                })
              )
            )
          ),

        // Tab 3: Cache & Storage Status
        settingsTab === "cache" &&
          React.createElement(
            "div",
            { style: { display: "flex", flexDirection: "column", gap: 14 } },
            React.createElement(
              "div",
              {
                style: {
                  padding: "14px",
                  background: "rgba(255,255,255,0.04)",
                  borderRadius: 8,
                  display: "flex",
                  flexDirection: "column",
                  gap: 8,
                  fontSize: 13,
                  userSelect: "text",
                },
              },
              React.createElement("div", null, React.createElement("strong", null, "Storage Engine: "), "IndexedDB + In-Memory (Persistent, No 5MB Quota)"),
              React.createElement("div", null, React.createElement("strong", null, "Cached Releases: "), `${releases.length} releases stored`),
              React.createElement("div", null, React.createElement("strong", null, "Followed Artists Scanned: "), `${cacheMeta.artistCount} artists`),
              React.createElement(
                "div",
                null,
                React.createElement("strong", null, "Last Synchronized: "),
                cacheMeta.timestamp ? new Date(cacheMeta.timestamp).toLocaleString() : "Never"
              ),
              React.createElement(
                "div",
                null,
                React.createElement("strong", null, "Last Sync Run: "),
                cacheMeta.lastSync
                  ? `${cacheMeta.lastSync.full ? "full" : "incremental"}, ${cacheMeta.lastSync.seconds}s, ` +
                      `${cacheMeta.lastSync.requests} requests, ${cacheMeta.lastSync.changed} artists changed, ` +
                      `${cacheMeta.lastSync.failed} failed` +
                      (cacheMeta.lastSync.rateLimitPauses ? `, ${cacheMeta.lastSync.rateLimitPauses} rate-limit pauses` : "")
                  : "Not recorded yet (press Refresh)"
              ),
              (cacheMeta.lastSync?.failReasons || []).map((f) =>
                React.createElement(
                  "div",
                  { key: f.reason, style: { color: "#fca5a5", paddingLeft: 12 } },
                  `${f.count} failed: ${f.reason} (e.g. ${f.sample})`
                )
              ),
              React.createElement(
                "div",
                null,
                React.createElement("strong", null, "Rate-Limit Protection: "),
                "3 concurrent workers with 80ms delay pacing; a 429 pauses all workers (5s, 15s, 30s)"
              )
            ),
            React.createElement(
              "div",
              { style: { display: "flex", gap: 10 } },
              React.createElement(
                "button",
                {
                  className: "rl-chip active",
                  onClick: () => {
                    refreshCatalog({ full: true });
                    setShowSettingsModal(false);
                  },
                },
                "Force Full Resync"
              ),
              React.createElement(
                "button",
                {
                  className: "rl-chip",
                  style: { borderColor: "rgba(239, 68, 68, 0.4)", color: "#fca5a5" },
                  onClick: async () => {
                    await clearCachedCatalog();
                    setReleases([]);
                    setSavedAlbumUris(new Set());
                    setCacheMeta({ timestamp: 0, artistCount: 0 });
                    setIsCached(false);
                    Spicetify.showNotification("Local cache cleared.");
                  },
                },
                "Clear Local Cache"
              )
            )
          )
      )
  );
}

// ---------------------------------------------------------------------------
// 6. Entry Point Registration
// ---------------------------------------------------------------------------
function render() {
  return React.createElement(ReleaseListApp);
}
