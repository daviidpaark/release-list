# Release List

A Spicetify custom app that displays new releases from artists you follow in a chronological, day-by-day feed with filtering, customizable release types, and local caching. Find it in the left sidebar under the calendar icon.

Companion to [Random Library](https://github.com/daviidpaark/random-library); both apps share the same card and artwork design. Inspired by [jakubito/spotify-release-list](https://github.com/jakubito/spotify-release-list).

## Features

- **Grouping Modes**
  - **Day-by-Day Timeline** (default): Releases grouped into daily sections (*Today*, *Yesterday*, day of week, or calendar date).
  - **Day-by-Day with Type Subgroups**: Daily sections split into *Albums*, *EPs*, and *Singles*.
  - **By Release Type**: *Albums* first, then *EPs*, then *Singles*, each sorted chronologically.
  - Order releases within groups by *Artist Name (A–Z)*, *Album Type → Artist Name*, or *Chronological*.
- **Filters and Search**
  - Toggle **Albums**, **EPs**, and **Singles** on the filter bar, or set default types in Settings.
  - Spotify groups EPs with singles, so a single with 4 or more tracks is classified as an EP.
  - Search by release title or artist name.
  - Range chips: *7 Days*, *14 Days*, *30 Days*, *60 Days*, *90 Days*, *All Time*, or a custom date range.
  - Sort by *Newest First* or *Oldest First*.
- **Library Status**
  - `✓` badge on cards for releases saved in your library.
  - Click the badge to save or remove a release from your library.
  - **`✓ In Library`** filter chip to show only saved releases.
- **Cards and Artwork**
  - Hover to reveal a green play button that starts playback immediately.
  - Click a card or title to open the album page; click an artist name to open the artist page.
  - Custom colors for **Albums**, **EPs**, and **Singles** badges, with a color picker, `#RRGGBB` input, and reset button.
  - The grid scales from ultra-wide displays down to compact split-screen windows.

## How It Works

- Catalog data is cached locally in IndexedDB (`ReleaseListDB`), so opening the app loads cached results without network requests.
- New releases are fetched only when you press **Refresh** or trigger a resync from Settings.
- **Refresh** sends one request per followed artist and only pages a full discography when that artist's release count has changed. **Force Full Resync** pages every discography again.
- Releases from artists you no longer follow are removed on the next sync.
- Sync runs with at most **3 concurrent requests** and an **80ms delay** between requests to avoid HTTP `429 Too Many Requests` errors.
- When Spotify does answer `429`, every worker pauses (5s, then 15s, then 30s) and the request is retried, so no artist is skipped.
- Limit scan depth to *90 Days*, *180 Days*, *365 Days*, or *All Time* to avoid pulling entire discographies.
- [Random Library](https://github.com/daviidpaark/random-library) reads this cache (read-only) to show release dates for your saved albums and to build its **Discover** mode.

## Settings

Click **⚙ Settings** in the top bar:

- **General**: Default filter range, sort order, sync history depth, and an optional Web Sync address. With the address of a [Spicetify Library](https://github.com/daviidpaark/spicetify-library) container set, **Sync to Web Now** and **Refresh** push the release catalog to it so you can browse it from a phone.
- **Grouping & Release Types**: Grouping mode, order within groups, default release types, and release type colors.
- **Cache & Storage**: Cached release and artist counts, last sync time, last sync run statistics (duration, requests, changed artists, failures and their reasons, rate-limit pauses), manual resync, and cache wipe.

## Requirements

- [Spicetify](https://spicetify.app) installed and configured (`spicetify backup` run at least once)
- Spotify desktop app

## Install

### Windows (PowerShell)

```powershell
iwr -useb "https://raw.githubusercontent.com/daviidpaark/release-list/main/install.ps1" | iex
```

### macOS / Linux

```bash
curl -fsSL "https://raw.githubusercontent.com/daviidpaark/release-list/main/install.sh" | bash
```

The script will:

1. Verify `spicetify` is in your PATH and locate your `config-xpui.ini`
2. Download `index.js` and `manifest.json` into your Spicetify `CustomApps/release-list/` folder
3. Register `release-list` in `config-xpui.ini`
4. Run `spicetify apply`

Restart Spotify if it was already open.

## Uninstall

### Windows (PowerShell)

```powershell
iwr -useb "https://raw.githubusercontent.com/daviidpaark/release-list/main/uninstall.ps1" | iex
```

### macOS / Linux

```bash
curl -fsSL "https://raw.githubusercontent.com/daviidpaark/release-list/main/uninstall.sh" | bash
```

## Disclaimer

This project is an independent, open-source custom app and is not affiliated with, sponsored by, or endorsed by Spotify. Spotify is a registered trademark of Spotify AB.

## AI Disclosure

> [!NOTE]
> This is a personal homelab project developed with the assistance of **GitHub Copilot (Claude Sonnet / Opus)**, **Google Antigravity (Gemini Flash / Pro)**, and **Claude Code (Claude Opus)**. It is shared publicly for other Spotify and Spicetify users. Feedback and issue reports are welcome.

## License

[MIT License](LICENSE) © 2026 David Park
