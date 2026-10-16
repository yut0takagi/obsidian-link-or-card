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

## Usage

### When pasting

Copy a URL, paste it into a note, and choose **Card**, **Link** or **Plain URL** from the menu.

The menu does not appear when the paste is clearly something else:

- text is selected (the paste is left to Obsidian)
- the cursor is in a code block, inline code or the frontmatter
- the URL is being typed into Markdown or HTML syntax, such as right after `](`, `<` or `href="`
- the clipboard holds more than a single URL

### Changing it later

- **Right-click** a URL, a Markdown link or a rendered card and choose *Convert to card*, *Convert to link* or *Convert to plain URL*.
- Or run the command **Change link style at cursor**, and bind a hotkey to it if you like.

Converting a card to a link reuses the title stored in the card, so no request is made.

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

- The page is fetched **once**, when the card is created. Opening the note later does not contact the site, and the card keeps working offline apart from the images.
- Only `url` is required. Edit any line by hand to change what the card shows.
- Without the plugin, the block is still readable text with the URL in it.
- Cards work inside list items and blockquotes.

## Settings

- **Ask when pasting a URL** — turn off to paste URLs normally. The right-click menu and the command still work.

## Network use

To build a card or a titled link, the plugin sends one `GET` request to the URL you chose, using Obsidian's `requestUrl`, and reads the page's `<title>`, Open Graph and Twitter card tags. Nothing is sent anywhere else, and no request is made when you choose **Plain URL** or close the menu.

Card images and icons are loaded from the sites that host them, with `referrerpolicy="no-referrer"`.

Some sites return little or no metadata to requests that are not from a browser. The card then falls back to the host name, and the link falls back to the plain URL with a notice.

## Installing manually

Copy `main.js`, `manifest.json` and `styles.css` from the latest release into `<vault>/.obsidian/plugins/link-or-card/`, then enable **Link or Card** under *Settings → Community plugins*.

Works on desktop and mobile.

## Development

```bash
npm install
npm run dev     # rebuild on change
npm run check   # typecheck, tests, review checks and production build
```

## License

MIT
