# Changelog

All notable changes to Link or Card are listed here.

## 0.2.0 — 2026-10-16

### Added

- **Refresh card** and **Refetch all card fields…** in the card's right-click menu, plus matching commands. Refresh fills in only the fields a card is missing, so hand edits stay; refetching overwrites the card. Both ask first and name the site, and cards that point to a private or local address are not refreshed.
- Menus for a URL that points to a private or local address say so.
- **Domains to leave alone**, **Always make a card** and **Always make a link** settings. Hosts are matched whole, including subdomains, and the most specific entry wins.
- **Maximum title length** setting for titles taken from a page.
- **Convert Auto Card Link blocks in this note** command, which turns ```` ```cardlink ```` blocks into ```` ```linkcard ```` blocks without contacting the sites. Blocks it cannot read safely are left as they are.
- Dragging a link from a browser into a note opens the same menu as pasting.

### Fixed

- Choosing **Card** in a table cell no longer breaks the table. Inside a table, the menus now offer only **Link** and **Plain URL**.

### Changed

- The README now starts installation with *Community plugins*.

## 0.1.1 — 2026-10-01

### Changed

- Cards are rendered with Obsidian's `createEl` helpers instead of `document.createElement`.
- Timers use `window.setTimeout` and `window.clearTimeout`, so fetching also works in pop-out windows.
- A timed-out request always rejects with an `Error`.
- The settings tab implements `getSettingDefinitions()`, so its settings appear in settings search on Obsidian 1.13 and later. Older versions keep using `display()`.
- Release assets (`main.js`, `manifest.json`, `styles.css`) come with build provenance attestations.

## 0.1.0 — 2026-09-30

First release.

- Paste a URL and choose **Card**, **Link** or **Plain URL** from a menu at the cursor. Esc keeps the plain URL.
- Cards are stored as ```` ```linkcard ```` blocks with the page's Open Graph data.
- Links get the page title filled in: `[Title](https://…)`.
- Convert between the three forms later from the right-click menu or the **Change link style at cursor** command.
- Pages served as Shift_JIS or EUC-JP are decoded correctly.
- English and Japanese interface. Works on desktop and mobile, using `requestUrl` only.
