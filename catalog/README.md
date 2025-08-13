# Logseq Marketplace Catalog

This project generates an **interactive, searchable, sortable table** of all packages in the [logseq/marketplace](https://github.com/logseq/marketplace) repository. The table is published as a static HTML file at `catalog/index.html`.

## Features

- Fetches all plugin packages from the Logseq marketplace GitHub repo
- Displays package info (icon, name, description, author, repo, version, created/updated dates)
- Table is interactive (search, sort, scroll) using DataTables
- Click a package description to view its README.md in a modal dialog (fetched live from GitHub)

## Issues

- if a README.md contains relative links, they will not work in the modal dialog.

## Setup

1. **Install dependencies:**

```sh
npm install
# If you want to use the README modal feature in Node.js, also install:
npm install marked
```

2. **(Optional) Set a GitHub token** for higher API rate limits:

```sh
export GITHUB_TOKEN=your_token_here
```

## Usage

To generate/update the catalog HTML:

```sh
node catalog/scripts/update-catalog-index.mjs
```

The output will be written to `catalog/index.html`.

## How the README Modal Works

- In the generated HTML, clicking a package description opens a modal dialog.
- The modal fetches the plugin's `README.md` from GitHub (tries `main` branch, then `master`).
- The markdown is rendered to HTML using the [marked](https://github.com/markedjs/marked) library.

## Development

- The main script is `catalog/scripts/update-catalog-index.mjs` (Node, ESM)
- Output is in `catalog/index.html`
- You can customize the table columns or modal logic in the script as needed

---

MIT License
