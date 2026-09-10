# Release List

A power-user Spicetify custom app that displays new music releases from artists you follow in a chronological, day-by-day feed with multi-criteria filtering, customizable release types, and 0ms local caching.

Inspired by [jakubito/spotify-release-list](https://github.com/jakubito/spotify-release-list) and built specifically for the Spotify desktop client via [Spicetify](https://spicetify.app).

---

## Features

- **Day-by-Day Chronology & Grouping Modes**:
  - **Group Feed By**:
    - **Day-by-Day Timeline (Default)**: Releases grouped chronologically into daily sections (*Today*, *Yesterday*, *Day of Week*, or exact calendar date).
    - **Day-by-Day with Type Subgroups**: Daily sections subdivided into categorized headers for *Albums* and *Singles & EPs*.
    - **By Release Type**: Group the entire catalog primarily by release type (*Albums* first, then *Singles & EPs*), each sorted chronologically.
  - **Order Releases Within Groups**:
    - **Artist Name (A-Z)**: Alphabetical by artist.
    - **Album Type → Artist Name**: Categorized by release type first (Albums → Singles), then artist name.
    - **Chronological**: Strict release time order.
- **Customizable Colors for Release Types**:
  - Direct color customization for **Albums** and **Singles & EPs**.
  - Built-in color picker swatch and `#RRGGBB` hex input with auto-calculated high-contrast badge text and reset buttons.
- **Multi-Type Release Toggling**:
  - Filter and combine:
    - **Albums** (LPs)
    - **Singles & EPs**
  - Toggle directly on the main filter bar or configure default types in Settings.
- **Multi-Criteria Search & Range**:
  - Live search input matching release titles and artist names.
  - Quick range chips: *7 Days*, *14 Days*, *30 Days*, *60 Days*, *90 Days*, *All Time*, or a *Custom Date Range* (from/to calendar pickers).
  - Sort order toggle: *Newest First* vs. *Oldest First*.
- **In-Library Indicator & Quick Toggle**:
  - **Visual Indicator**: Releases saved in your Spotify library display a crisp green circular checkmark badge (`✓`) on artwork cards and a `✓ In Library` badge on list rows.
  - **1-Click Library Management**: Click the checkmark badge directly on any card or row to instantly save or remove the album/single from your library with a toast notification.
  - **`✓ In Library` Filter Chip**: Easily toggle the filter bar to isolate releases already in your library vs. discovering unsaved drops.
- **Card Actions & Play on Hover**:
  - Hover over any album or single card to reveal the green play button for instant in-client playback.
  - Click any card or title to jump directly to the album page.
  - Click any artist name to navigate to their artist page.
- **Dual Display Modes**:
  - **Grid View (⊞)**: Responsive art cards that dynamically scale from ultra-wide displays down to compact split windows.
  - **Dense List View (☰)**: Compact horizontal rows for scanning large numbers of releases quickly.

---

## Local Caching & API Rate-Limit Protection

Release List is engineered to be extremely polite to Spotify's APIs:

1. **Persistent Local Caching (0ms Load Times)**:
   - All catalog data is stored locally in native IndexedDB (`ReleaseListDB`) with memory-tier caching.
   - Opening Spotify or switching to Release List loads the feed **instantly in 0ms** without sending any network requests.
2. **Rate-Limit & Overload Avoidance**:
   - Background catalog synchronization runs through a throttled concurrency worker pool (limited to **3 concurrent requests** with a **60ms pacing delay** between requests).
   - Prevents hitting HTTP `429 Too Many Requests` limits.
3. **Configurable Catalog Depth & Sync Window**:
   - Limit scan depth (*90 Days*, *180 Days / 6 Months*, *365 Days*, or *All Time*) to prevent pulling decades of ancient discographies.
4. **Configurable Sync Frequency**:
   - In Settings, customize the automatic background cache refresh interval (*Manual Only*, *Every 6 Hours*, *Every 12 Hours*, or *Every 24 Hours*).

---

## Settings Menu

Click the **⚙ Settings** button in the top bar to access:

- **General**: Default filter range, release date sorting order, sync history depth, and background auto-sync frequency.
- **Grouping & Release Types**: Feed grouping mode (Timeline, Subgroups, or By Type), release ordering within groups, release type toggles (*Albums*, *Singles & EPs*), and release type color scheme customization.
- **Cache & Storage**: View storage engine details, cached release and artist counts, last sync timestamp, and trigger a manual resync or cache wipe.

---

## Installation

### Requirements
- [Spicetify](https://spicetify.app) installed and configured (`spicetify backup` run at least once)
- Spotify desktop application

### Windows (PowerShell)
Run in PowerShell:
```powershell
iwr -useb "https://raw.githubusercontent.com/daviidpaark/release-list/main/install.ps1" | iex
```
*Or from this local clone:*
```powershell
.\install.ps1
```

### Linux / macOS (Bash)
Run in Terminal:
```bash
curl -fsSL "https://raw.githubusercontent.com/daviidpaark/release-list/main/install.sh" | bash
```
*Or from this local clone:*
```bash
./install.sh
```

---

## Uninstallation

### Windows (PowerShell)
```powershell
iwr -useb "https://raw.githubusercontent.com/daviidpaark/release-list/main/uninstall.ps1" | iex
```

### Linux / macOS (Bash)
```bash
curl -fsSL "https://raw.githubusercontent.com/daviidpaark/release-list/main/uninstall.sh" | bash
```

---

## License

[MIT License](LICENSE) © 2026 David Park
