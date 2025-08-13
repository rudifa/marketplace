# Logseq Marketplace Catalog

This repo lists all packages in [logseq/marketplace](https://github.com/logseq/marketplace)
with an **interactive, searchable, sortable table** hosted on GitHub Pages.

## How it works
- A GitHub Action runs daily.
- It fetches `packages.json` from `logseq/marketplace`.
- Generates `/docs/index.html` with DataTables.js.
- Hosted automatically via GitHub Pages.

## Live catalog
Once pushed to GitHub and GitHub Pages is enabled, your catalog will be live at:

