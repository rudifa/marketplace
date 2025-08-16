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
cd catalog
npm install
```

2. **(Optional) Set a GitHub token** for higher API rate limits:

```sh
export GITHUB_TOKEN=your_token_here
```

## Usage

To generate/update the catalog HTML:

```sh
cd catalog
node scripts/update-catalog-index.mjs
```

which will update `catalog/index.html` and `catalog/results.json`.

## Usage with npm scripts

```
cd catalog
npm run build    # builds full catalog
npm run dev      # builds a small catalog (12 plugins), for faster development
npm run preview   # opens the catalog in your default browser
```

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
