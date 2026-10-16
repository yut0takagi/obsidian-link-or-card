# Link or Card

![Downloads](https://raw.githubusercontent.com/yut0takagi/obsidian-link-or-card/main/.github/stats/badge.svg)

![Download history](https://raw.githubusercontent.com/yut0takagi/obsidian-link-or-card/main/.github/stats/downloads.svg)

Paste a URL and pick how it lands in your note:

| Choice | Result |
| --- | --- |
| **Card** | A preview card with the page title, description, thumbnail and site icon |
| **Link** | `[Page title](https://…)` — a Markdown link with the title filled in |
| **Plain URL** | The URL exactly as pasted |

The URL is pasted immediately and the menu opens at the cursor. Pressing Esc or clicking elsewhere keeps the plain URL, so the plugin never gets in the way of an ordinary paste.

## Installing

In Obsidian, open *Settings → Community plugins*, select **Browse**, search for **Link or Card**, then select **Install** and **Enable**. If community plugins are still off, turn them on there first.

Works on desktop and mobile.

### Installing manually

Copy `main.js`, `manifest.json` and `styles.css` from the [latest release](https://github.com/yut0takagi/obsidian-link-or-card/releases/latest) into `<vault>/.obsidian/plugins/link-or-card/`, then enable **Link or Card** under *Settings → Community plugins*.

## Usage

### When pasting or dropping

Copy a URL, paste it into a note, and choose **Card**, **Link** or **Plain URL** from the menu. Dragging a link from a browser into a note opens the same menu at the drop point.

The menu does not appear when the paste is clearly something else:

- text is selected (the paste is left to Obsidian)
- the cursor is in a code block, inline code or the frontmatter
- the URL is being typed into Markdown or HTML syntax, such as right after `](`, `<` or `href="`
- the clipboard holds more than a single URL
- the site is in **Domains to leave alone**

Inside a table, **Card** is not offered: a card is a multi-line block and would split the row. **Link** and **Plain URL** work as usual.

### Changing it later

- **Right-click** a URL, a Markdown link or a rendered card and choose *Convert to card*, *Convert to link* or *Convert to plain URL*.
- Or run the command **Change link style at cursor**, and bind a hotkey to it if you like.

Converting a card to a link reuses the title stored in the card, so no request is made.

### Refreshing a card

If a card was made while the site was down, or the page has changed, right-click the card:

- **Refresh card** fetches the page again and fills in only the fields the card is missing. Anything already in the card, including text you edited, stays as it is.
- **Refetch all card fields…** asks first, then overwrites the card with what the page provides now. Fields the page no longer has are kept.

The same actions are available as the commands **Refresh card at cursor** and **Refetch all fields of the card at cursor**.

### Coming from Auto Card Link

Open a note with ```` ```cardlink ```` blocks and run **Convert Auto Card Link blocks in this note**. Each block becomes a ```` ```linkcard ```` block with the same URL, title, description, image and icon, without contacting the sites. The conversion is a single edit, so one undo restores the note.

Blocks that cannot be read safely, such as ones without a `url` or with multi-line YAML, are left as they are and counted in the notice. Blocks shown inside other code blocks are not touched.

## How cards are stored

A card is a fenced code block with one `key: value` per line:

````markdown
```linkcard
url: https://obsidian.md/
title: Obsidian - Sharpen your thinking
description: The free and flexible app for your private thoughts.
image: https://obsidian.md/images/banner.png
favicon: https://obsidian.md/favicon.ico
site: Obsidian
```
````

- The page is fetched **once**, when the card is created, and again only when you refresh the card. Opening the note later does not contact the site, and the card keeps working offline apart from the images.
- Only `url` is required. Edit any line by hand to change what the card shows.
- Without the plugin, the block is still readable text with the URL in it.
- Cards work inside list items and blockquotes.

## Settings

- **Ask when pasting a URL** — turn off to paste and drop URLs normally. The domain lists below are then not applied either; the right-click menu and the commands still work.
- **Domains to leave alone** — URLs from these sites are pasted as usual, without the menu.
- **Always make a card** / **Always make a link** — URLs from these sites skip the menu and become a card or a titled link straight away. Inside a table, where a card cannot go, the menu is shown instead.
- **Maximum title length** — page titles longer than this are cut short with "…" in links and in new or refreshed cards. 0 means no limit.

Domain lists take one site per line. A site also covers its subdomains, so `example.com` matches `www.example.com` but not `myexample.com`. Pasting a full URL into the list works too; only its host is used. When a URL matches more than one list, the most specific site wins.

## Network use

To build a card or a titled link, or to refresh a card, the plugin sends one `GET` request to that URL, using Obsidian's `requestUrl`, and reads the page's `<title>`, Open Graph and Twitter card tags. Nothing is sent anywhere else, and no request is made when you choose **Plain URL**, close the menu, or convert Auto Card Link blocks.

Card images and icons are loaded from the sites that host them, with `referrerpolicy="no-referrer"`.

Some sites return little or no metadata to requests that are not from a browser. The card then falls back to the host name, and the link falls back to the plain URL with a notice.

## Development

```bash
npm install
npm run dev     # rebuild on change
npm run check   # typecheck, tests, review checks and production build
```

See [CHANGELOG.md](CHANGELOG.md) for what changed in each release.

## License

MIT
