# Release List Instructions

## Repository Role & Architecture
- Spicetify custom app for Spotify that provides a chronological, filterable release list of albums, singles, and EPs for followed artists and saved music.
- Built with vanilla JavaScript, CSS, and Spicetify / Spotify desktop client internal APIs.

## Spicetify UI & Manifest Conventions
- Preserve existing Spotify and Spicetify APIs, UI conventions, and manifest contracts.
- **Sidebar Icons:** Keep inactive and active sidebar icon states visually distinct: use `icon` for the default state and `active-icon` for the selected state.
- Keep artwork, badges, hover elevation, and card format harmonized with `random-library`.

## Development & Validation
- Run the narrowest relevant check after each edit:
  - Check JavaScript syntax:
    ```bash
    node -c release-list/index.js
    ```
  - Validate manifest JSON:
    ```bash
    node -e "JSON.parse(require('fs').readFileSync('release-list/manifest.json', 'utf8'))"
    ```
- Verify that automated CI checks pass before concluding changes.

## Releases & CI
- CI runs on push and pull requests to `main` via `.github/workflows/ci.yml`, checking JavaScript syntax and validating `manifest.json`.
- Documentation-only or test-only changes do not require a new release tag.
- Prefer current major versions of GitHub Actions and address Node.js runtime deprecation warnings promptly.

## Git Workflow
- Do not commit or push unless explicitly requested by the user.
- Keep commits focused and scoped to this repository.

## Performance, Resource Lifecycle & Memory Hygiene
- **Event Debouncing:** Debounce search inputs and filter changes to prevent freezing the Spotify UI thread.
- **DOM & List Efficiency:** Optimize rendering for long chronological release lists by reusing elements or virtualizing DOM nodes.
- **Cleanup on Unmount:** Clean up custom event listeners, timers, or observers when navigating away from the view.
