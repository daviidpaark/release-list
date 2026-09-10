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
      font-family: var(--font-family, spotify-circular, Helvetica, Arial, sans-serif);
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
      background: rgba(255, 255, 255, 0.04);
      border: 1px solid rgba(255, 255, 255, 0.07);
      border-radius: 8px;
      padding: 14px;
      transition: background 0.18s ease, border-color 0.18s ease, transform 0.18s ease;
      display: flex;
      flex-direction: column;
      cursor: pointer;
      overflow: hidden;
      user-select: none;
    }
    .rl-card:hover {
      background: rgba(255, 255, 255, 0.09);
      border-color: rgba(255, 255, 255, 0.16);
      transform: translateY(-3px);
      box-shadow: 0 10px 24px rgba(0, 0, 0, 0.45);
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

    .rl-in-library-badge-row {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      font-size: 10px;
      font-weight: 700;
      padding: 2px 7px;
      border-radius: 4px;
      background: rgba(30, 215, 96, 0.15);
      color: #1ed760;
      border: 1px solid rgba(30, 215, 96, 0.3);
      cursor: pointer;
      transition: background 0.15s ease;
    }
    .rl-in-library-badge-row:hover {
      background: rgba(30, 215, 96, 0.25);
    }

    /* Reactive Interactive Card & List Elements */
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

    .rl-list-title {
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
    .rl-list-title:hover {
      text-decoration: underline !important;
    }

    .rl-list-artist {
      font-size: 12px;
      color: rgba(255, 255, 255, 0.65);
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      width: fit-content;
      max-width: 100%;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      transition: color 0.15s ease, text-decoration 0.15s ease;
    }
    .rl-list-artist:hover {
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

    .rl-layout-btn {
      transition: all 0.15s ease;
    }
    .rl-layout-btn:hover {
      opacity: 0.9;
      transform: scale(1.04);
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
      font-family: var(--font-family, spotify-circular, Helvetica, Arial, sans-serif);
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

    /* List Row Mode */
    .rl-list-item {
      display: grid;
      grid-template-columns: 50px 1fr auto auto auto;
      gap: 16px;
      align-items: center;
      padding: 8px 14px;
      border-radius: 6px;
      transition: background 0.15s ease;
      cursor: pointer;
    }
    .rl-list-item:hover {
      background: rgba(255, 255, 255, 0.08);
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
};

const DAY_MS = 86400000;
const INITIAL_BATCH_SIZE = 40;
const LOAD_MORE_STEP = 40;

const TYPE_LABELS = {
  album: "ALBUM",
  single: "SINGLE / EP",
};

const TYPE_ORDER_INDEX = {
  album: 0,
  single: 1,
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
  defaultLayout: "grid", // 'grid' | 'list'
  groupBy: "date", // 'date' | 'date_type' | 'type'
  releasesOrder: "artist", // 'artist' | 'album-group' | 'time'
  groupColors: {
    album: "#e0b766",
    single: "#bc8edd",
  },
  cacheTTLHours: 12, // 0 = manual only, 6, 12, 24
  syncWindowDays: 180, // Track up to 6 months of releases (0 = All Time)
  allowedTypes: ["album", "single"], // release types enabled
};

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

function formatDate(dateObj, locale = "en-US") {
  return new Intl.DateTimeFormat(locale, {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(dateObj);
}

function getDayHeader(timeMs, now = Date.now()) {
  const target = new Date(timeMs);
  const nowDate = new Date(now);

  const targetDayStart = new Date(target.getFullYear(), target.getMonth(), target.getDate()).getTime();
  const nowDayStart = new Date(nowDate.getFullYear(), nowDate.getMonth(), nowDate.getDate()).getTime();

  const diffDays = Math.round((nowDayStart - targetDayStart) / DAY_MS);

  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  if (diffDays > 1 && diffDays <= 6) {
    return new Intl.DateTimeFormat("en-US", { weekday: "long" }).format(target);
  }
  return formatDate(target);
}

function normalizeType(rawType) {
  const t = String(rawType || "").toUpperCase();
  if (t.includes("COMPILATION") || t.includes("APPEARS_ON")) return null;
  if (t.includes("SINGLE") || t.includes("EP")) return "single";
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

async function fetchArtistReleasesGraphQL(artistUri, limit = 50) {
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
        offset: 0,
        limit,
      }
    );
    if (errors) {
      console.warn("[ReleaseList] GraphQL errors for artist", artistUri, errors);
      return [];
    }
    const allGroups = data?.artistUnion?.discography?.all?.items || [];
    return allGroups.flatMap((group) => group.releases?.items || []);
  } catch (e) {
    console.warn("[ReleaseList] Fetch artist discography error:", e);
    return [];
  }
}

// Controlled concurrency pool (3 workers, 60ms delay) to guarantee zero 429 errors
async function runConcurrentPool(items, concurrencyLimit, fn, onProgress, pacingDelayMs = 60) {
  const results = [];
  let index = 0;
  let finished = 0;

  const workers = new Array(concurrencyLimit).fill(0).map(async () => {
    while (index < items.length) {
      const curIndex = index++;
      try {
        const res = await fn(items[curIndex], curIndex);
        results[curIndex] = res;
      } catch (err) {
        results[curIndex] = null;
      } finally {
        finished++;
        if (onProgress) onProgress(finished, items.length);
        if (pacingDelayMs > 0) {
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
      React.createElement("img", {
        className: "rl-card-artwork",
        src: release.imageURL || "spotify:image:default",
        alt: release.title,
        loading: "lazy",
        decoding: "async",
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
              d: "M13.985 2.383L5.674 12.14 1.34 7.805l1.414-1.414 2.92 2.92 6.897-8.106 1.414 1.178z",
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
          { style: { display: "flex", alignItems: "center", gap: 6 } },
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
            },
          },
          release.dateStr
        )
      )
    )
  );
});

// --- List Row Component ---
const ReleaseListRow = React.memo(function ReleaseListRow({ release, groupColors, isSaved = false, onToggleSave }) {
  const typeBadge = getTypeBadge(release.type, groupColors);

  return React.createElement(
    "div",
    {
      className: "rl-list-item",
      onClick: (e) => {
        if (e.target.closest(".rl-list-artist") || e.target.closest(".rl-in-library-badge-row") || e.target.closest("button") || e.target.closest(".rl-action-btn-mini")) return;
        Spicetify.Platform.History.push({
          pathname: `/album/${release.uri.split(":").pop()}`,
        });
      },
    },
    // Thumbnail
    React.createElement(
      "div",
      {
        style: {
          width: 48,
          height: 48,
          borderRadius: 4,
          overflow: "hidden",
          position: "relative",
          background: "#222",
        },
      },
      React.createElement("img", {
        src: release.imageURL,
        alt: release.title,
        loading: "lazy",
        decoding: "async",
        style: { width: "100%", height: "100%", objectFit: "cover" },
      })
    ),
    // Details
    React.createElement(
      "div",
      { style: { display: "flex", flexDirection: "column", gap: 2, overflow: "hidden" } },
      React.createElement(
        "div",
        {
          className: "rl-list-title",
          title: release.title,
        },
        release.title
      ),
      React.createElement(
        "div",
        {
          className: "rl-list-artist",
          onClick: (e) => {
            e.stopPropagation();
            Spicetify.Platform.History.push({
              pathname: `/artist/${release.artist.uri.split(":").pop()}`,
            });
          },
          title: release.artist.name,
        },
        release.artist.name
      )
    ),
    // Badges (Type badge + In Library badge if saved)
    React.createElement(
      "div",
      { style: { display: "flex", alignItems: "center", gap: 6 } },
      React.createElement(
        "span",
        {
          style: {
            fontSize: 10,
            fontWeight: 800,
            padding: "3px 8px",
            borderRadius: 4,
            backgroundColor: typeBadge.bg,
            color: typeBadge.fg,
          },
        },
        typeBadge.label
      ),
      isSaved &&
        React.createElement(
          "span",
          {
            className: "rl-in-library-badge-row",
            title: "In your Library (click to remove)",
            onClick: (e) => {
              e.stopPropagation();
              onToggleSave?.(release.uri, true);
            },
          },
          React.createElement(
            "svg",
            { width: "10", height: "10", viewBox: "0 0 16 16", fill: "currentColor" },
            React.createElement("path", {
              d: "M13.985 2.383L5.674 12.14 1.34 7.805l1.414-1.414 2.92 2.92 6.897-8.106 1.414 1.178z",
            })
          ),
          "In Library"
        )
    ),
    // Date & Tracks
    React.createElement(
      "div",
      {
        style: {
          fontSize: 12,
          color: "rgba(255, 255, 255, 0.5)",
          minWidth: 100,
          textAlign: "right",
        },
      },
      release.dateStr
    ),
    // Actions
    React.createElement(
      "div",
      { style: { display: "flex", gap: 8, alignItems: "center" } },
      React.createElement(
        "button",
        {
          className: "rl-action-btn-mini",
          title: "Play",
          onClick: (e) => {
            e.stopPropagation();
            Spicetify.Player.playUri(release.uri);
          },
        },
        "▶"
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
// 5. Main Application Component
// ---------------------------------------------------------------------------
function ReleaseListApp() {
  // Settings State
  const [settings, setSettings] = useState(() => {
    const saved = getStoredJSON(STORAGE_KEYS.SETTINGS, {});
    const allowed = Array.isArray(saved.allowedTypes)
      ? saved.allowedTypes.filter((t) => t === "album" || t === "single")
      : DEFAULT_SETTINGS.allowedTypes;
    return {
      ...DEFAULT_SETTINGS,
      ...saved,
      allowedTypes: allowed && allowed.length > 0 ? allowed : ["album", "single"],
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
  }));
  const [isCached, setIsCached] = useState(() => Boolean(inMemoryCatalog?.items?.length));

  // Active Filters State
  const [searchQuery, setSearchQuery] = useState("");
  const [onlySaved, setOnlySaved] = useState(false);
  const [savedAlbumUris, setSavedAlbumUris] = useState(() => inMemorySavedUris || new Set());
  const [activeTypes, setActiveTypes] = useState(() => {
    const saved = settings.allowedTypes;
    const valid = Array.isArray(saved) ? saved.filter((t) => t === "album" || t === "single") : [];
    return valid.length > 0 ? valid : ["album", "single"];
  });
  const [dateRangeDays, setDateRangeDays] = useState(settings.defaultRange ?? 30);
  const [customStartDate, setCustomStartDate] = useState("");
  const [customEndDate, setCustomEndDate] = useState("");
  const [layoutMode, setLayoutMode] = useState(settings.defaultLayout || "grid");
  const [sortOrder, setSortOrder] = useState(settings.sortOrder || "newest");

  // Pagination / Lazy Rendering State
  const [visibleCount, setVisibleCount] = useState(INITIAL_BATCH_SIZE);

  // Settings Modal State
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [settingsTab, setSettingsTab] = useState("general");

  const searchInputRef = useRef(null);
  const sentinelRef = useRef(null);
  const isSyncingRef = useRef(false);

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
        setReleases(cached.items);
        setCacheMeta({ timestamp: cached.timestamp, artistCount: cached.artistCount || 0 });
        setIsCached(true);
        setLoading(false);

        // Check if cache TTL expired
        const ttlHours = settings.cacheTTLHours ?? 12;
        if (ttlHours > 0) {
          const ttlMs = ttlHours * 3600 * 1000;
          if (Date.now() - cached.timestamp > ttlMs) {
            console.log("[ReleaseList] Cache TTL expired, syncing in background...");
            refreshCatalog(true); // background silent sync
          }
        }
        return;
      }
    }

    // 2. Otherwise run sync
    await refreshCatalog(false);
  }, [settings.cacheTTLHours, settings.syncWindowDays]);

  const refreshCatalog = async (isBackground = false, overrideSyncWindow = null) => {
    if (isSyncingRef.current) {
      console.log("[ReleaseList] Sync already in progress, skipping duplicate call.");
      return;
    }
    isSyncingRef.current = true;
    try {
      if (!isBackground) setLoading(true);
      const artists = await fetchFollowedArtists();
      if (!artists || artists.length === 0) {
        console.warn("[ReleaseList] Followed artists returned empty. Keeping existing cached releases.");
        if (inMemoryCatalog?.items?.length) {
          setReleases(inMemoryCatalog.items);
        }
        setLoading(false);
        return;
      }

      setSyncProgress({ current: 0, total: artists.length });

      // Window cutoff (default 180 days / 6 months; 0 = All Time complete discographies)
      const windowDays = overrideSyncWindow !== null ? overrideSyncWindow : (settings.syncWindowDays ?? 180);
      const cutoffTime = windowDays > 0 ? Date.now() - windowDays * DAY_MS : 0;

      // Controlled concurrency (3 workers, 60ms pacing delay)
      const discographyArrays = await runConcurrentPool(
        artists,
        3,
        async (artist) => {
          const rawItems = await fetchArtistReleasesGraphQL(artist.uri, 50);
          const mapped = [];

          for (const item of rawItems) {
            const dateStr = item.date?.isoString || item.date?.year || "";
            const timeMs = Date.parse(dateStr) || 0;

            // Discard releases older than the sync window
            if (cutoffTime > 0 && timeMs > 0 && timeMs < cutoffTime) {
              continue;
            }

            const releaseType = normalizeType(item.type);
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
              dateStr: dateStr.split("T")[0],
              time: timeMs,
              type: releaseType,
              trackCount: item.tracks?.totalCount || 1,
            });
          }
          return mapped;
        },
        (done, total) => {
          setSyncProgress({ current: done, total });
        },
        60
      );

      const flattened = discographyArrays.filter(Boolean).flat();

      // Deduplicate releases by URI
      const uniqueMap = new Map();
      flattened.forEach((r) => {
        if (!uniqueMap.has(r.uri)) {
          uniqueMap.set(r.uri, r);
        }
      });
      const allUnique = Array.from(uniqueMap.values()).sort((a, b) => b.time - a.time);

      // Save to persistent IndexedDB & memory cache
      const now = Date.now();
      const catalogObj = {
        timestamp: now,
        artistCount: artists.length,
        items: allUnique,
      };

      await saveCachedCatalog(catalogObj);

      setCacheMeta({ timestamp: now, artistCount: artists.length });
      setIsCached(true);
      setReleases(allUnique);

      if (!isBackground) {
        Spicetify.showNotification(`Synced ${allUnique.length} releases from ${artists.length} artists! Saved to cache.`);
      }
    } catch (err) {
      console.error("[ReleaseList] Catalog refresh error:", err);
      if (!isBackground) Spicetify.showNotification("Error syncing releases. Check console.", true);
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

  // Reset visibleCount whenever filters change to keep DOM lightweight
  useEffect(() => {
    setVisibleCount(INITIAL_BATCH_SIZE);
  }, [searchQuery, activeTypes, onlySaved, dateRangeDays, customStartDate, customEndDate, sortOrder]);

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
    const searchMatcher = createSearchMatcher(searchQuery);

    const result = releases.filter((r) => {
      // 1. Category Type filter (strictly Albums and Singles/EPs only)
      if (r.type !== "album" && r.type !== "single") return false;
      if (!activeTypes.includes(r.type)) return false;

      // 2. Date Range filter
      if (dateRangeDays > 0) {
        const cutoff = now - dateRangeDays * DAY_MS;
        if (r.time < cutoff) return false;
      } else if (dateRangeDays === -1) {
        if (customStartDate) {
          const startMs = Date.parse(customStartDate);
          if (!isNaN(startMs) && r.time < startMs) return false;
        }
        if (customEndDate) {
          const endMs = Date.parse(customEndDate) + DAY_MS;
          if (!isNaN(endMs) && r.time > endMs) return false;
        }
      }

      // 3. Search query filter (smart diacritics and special character matching)
      if (searchQuery.trim()) {
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
  }, [releases, activeTypes, onlySaved, savedAlbumUris, dateRangeDays, customStartDate, customEndDate, searchQuery, sortOrder]);

  // Paginated visible releases
  const visibleReleases = useMemo(() => {
    return filteredReleases.slice(0, visibleCount);
  }, [filteredReleases, visibleCount]);

  // IntersectionObserver for Infinite Scrolling near bottom
  useEffect(() => {
    if (!sentinelRef.current) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          setVisibleCount((prev) => {
            if (prev < filteredReleases.length) {
              return Math.min(prev + LOAD_MORE_STEP, filteredReleases.length);
            }
            return prev;
          });
        }
      },
      { rootMargin: "600px" }
    );
    observer.observe(sentinelRef.current);
    return () => observer.disconnect();
  }, [filteredReleases.length]);

  // Group visible items by Feed Mode (Date, Date + Type, or Type) & Order
  const feedSections = useMemo(() => {
    const now = Date.now();
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
      // Group feed by release type: Albums, Singles & EPs
      const typeMap = new Map();
      const typeKeys = ["album", "single"];
      typeKeys.forEach((k) => typeMap.set(k, []));

      visibleReleases.forEach((r) => {
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
      visibleReleases.forEach((r) => {
        const header = getDayHeader(r.time, now);
        if (!dateMap.has(header)) dateMap.set(header, []);
        dateMap.get(header).push(r);
      });

      return Array.from(dateMap.entries()).map(([dateHeader, dayItems]) => {
        const subMap = new Map();
        ["album", "single"].forEach((k) => subMap.set(k, []));
        dayItems.forEach((item) => {
          if (!subMap.has(item.type)) subMap.set(item.type, []);
          subMap.get(item.type).push(item);
        });

        const subgroups = ["album", "single"]
          .filter((k) => (subMap.get(k) || []).length > 0)
          .map((typeKey) => {
            const badge = getTypeBadge(typeKey, settings.groupColors);
            return {
              typeKey,
              title: badge.label,
              badgeBg: badge.bg,
              badgeFg: badge.fg,
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
    visibleReleases.forEach((r) => {
      const header = getDayHeader(r.time, now);
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
  }, [visibleReleases, settings.groupBy, settings.releasesOrder, settings.groupColors]);

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
              fontSize: 28,
              fontWeight: 800,
              letterSpacing: "-0.5px",
              color: "var(--spice-text, #ffffff)",
              lineHeight: 1.1,
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
              fontWeight: 500,
            },
          },
          `${filteredReleases.length} releases`
        )
      ),

      // Header Actions (Layout, Settings, Refresh)
      React.createElement(
        "div",
        { style: { display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" } },
        // Layout Mode Switcher (Scalable Vector SVGs in Segmented Pill)
        React.createElement(
          "div",
          {
            style: {
              display: "inline-flex",
              alignItems: "center",
              background: "rgba(255, 255, 255, 0.07)",
              borderRadius: "500px",
              padding: "3px",
              border: "1px solid rgba(255, 255, 255, 0.1)",
              gap: "2px",
            },
          },
          React.createElement(
            "button",
            {
              className: "rl-layout-btn",
              style: {
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                width: "32px",
                height: "30px",
                padding: "0",
                background: layoutMode === "grid" ? "var(--spice-text, #ffffff)" : "transparent",
                color: layoutMode === "grid" ? "var(--spice-main, #121212)" : "var(--spice-subtext, rgba(255, 255, 255, 0.6))",
                border: "none",
                borderRadius: "500px",
                cursor: "pointer",
              },
              onClick: () => {
                setLayoutMode("grid");
                updateSettings({ defaultLayout: "grid" });
              },
              title: "Grid View",
              "aria-label": "Grid View",
            },
            React.createElement(
              "svg",
              { width: "16", height: "16", viewBox: "0 0 16 16", fill: "currentColor", style: { display: "block" } },
              React.createElement("path", {
                d: "M1 2a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v4a1 1 0 0 1-1 1H2a1 1 0 0 1-1-1V2zm0 8a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v4a1 1 0 0 1-1 1H2a1 1 0 0 1-1-1v-4zm8-8a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v4a1 1 0 0 1-1 1h-4a1 1 0 0 1-1-1V2zm0 8a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v4a1 1 0 0 1-1 1h-4a1 1 0 0 1-1-1v-4z",
              })
            )
          ),
          React.createElement(
            "button",
            {
              className: "rl-layout-btn",
              style: {
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                width: "32px",
                height: "30px",
                padding: "0",
                background: layoutMode === "list" ? "var(--spice-text, #ffffff)" : "transparent",
                color: layoutMode === "list" ? "var(--spice-main, #121212)" : "var(--spice-subtext, rgba(255, 255, 255, 0.6))",
                border: "none",
                borderRadius: "500px",
                cursor: "pointer",
              },
              onClick: () => {
                setLayoutMode("list");
                updateSettings({ defaultLayout: "list" });
              },
              title: "List View",
              "aria-label": "List View",
            },
            React.createElement(
              "svg",
              { width: "16", height: "16", viewBox: "0 0 16 16", fill: "currentColor", style: { display: "block" } },
              React.createElement("path", {
                d: "M1.5 2.5a1 1 0 0 1 1-1h11a1 1 0 1 1 0 2h-11a1 1 0 0 1-1-1zm0 5.5a1 1 0 0 1 1-1h11a1 1 0 1 1 0 2h-11a1 1 0 0 1-1-1zm0 5.5a1 1 0 0 1 1-1h11a1 1 0 1 1 0 2h-11a1 1 0 0 1-1-1z",
              })
            )
          )
        ),

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
            onClick: () => refreshCatalog(false),
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
              d: "M10 2a8 8 0 0 1 6.32 12.9l5.39 5.38-1.42 1.42-5.38-5.39A8 8 0 1 1 10 2zm0 2a6 6 0 1 0 0 12 6 6 0 0 0 0-12z",
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
            { label: "Singles & EPs", val: "single" },
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
                d: "M13.985 2.383L5.674 12.14 1.34 7.805l1.414-1.414 2.92 2.92 6.897-8.106 1.414 1.178z",
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
                    `(${sub.items.length})`
                  )
                ),
                // Subgroup items
                layoutMode === "grid"
                  ? React.createElement(
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
                  : React.createElement(
                      "div",
                      { style: { display: "flex", flexDirection: "column", gap: 4 } },
                      sub.items.map((release) =>
                        React.createElement(ReleaseListRow, {
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
          : // Normal items container (Grid or List)
            layoutMode === "grid"
            ? React.createElement(
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
            : React.createElement(
                "div",
                { style: { display: "flex", flexDirection: "column", gap: 4 } },
                section.items.map((release) =>
                  React.createElement(ReleaseListRow, {
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
          `Showing ${visibleReleases.length} of ${filteredReleases.length} releases`
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
                    refreshCatalog(false, val);
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
            // Cache Auto-Sync Interval
            React.createElement(
              "div",
              null,
              React.createElement("label", { style: { fontSize: 13, fontWeight: 600, display: "block", marginBottom: 6 } }, "Automatic Background Sync Interval"),
              React.createElement(
                "select",
                {
                  value: settings.cacheTTLHours,
                  onChange: (e) => updateSettings({ cacheTTLHours: Number(e.target.value) }),
                  style: {
                    width: "100%",
                    padding: "8px 12px",
                    background: "#282828",
                    border: "1px solid rgba(255,255,255,0.15)",
                    borderRadius: 6,
                    color: "#fff",
                  },
                },
                React.createElement("option", { value: 0 }, "Manual Only (Never auto-sync)"),
                React.createElement("option", { value: 6 }, "Every 6 Hours"),
                React.createElement("option", { value: 12 }, "Every 12 Hours (Recommended)"),
                React.createElement("option", { value: 24 }, "Every 24 Hours")
              ),
              React.createElement(
                "div",
                { style: { fontSize: 11, color: "rgba(255,255,255,0.45)", marginTop: 4 } },
                "Controls how often Release List checks for new releases behind the scenes. Opening the app always loads instantly from cache."
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
                    React.createElement("option", { value: "type" }, "By Release Type (Albums, Singles, etc.)")
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
                  { id: "single", label: "Singles & EPs", desc: "Single track drops and multi-track EPs" },
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
                "Customize badge and accent colors for Albums and Singles / EPs:"
              ),

              // Color Rows
              React.createElement(
                "div",
                { style: { display: "flex", flexDirection: "column", gap: 8 } },
                [
                  { key: "album", label: "Albums", desc: "Full LP studio releases", defaultColor: DEFAULT_SETTINGS.groupColors.album },
                  { key: "single", label: "Singles & EPs", desc: "Tracks and extended plays", defaultColor: DEFAULT_SETTINGS.groupColors.single },
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
                React.createElement("strong", null, "Rate-Limit Protection: "),
                "3 concurrent workers with 60ms delay pacing"
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
                    refreshCatalog(false);
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
