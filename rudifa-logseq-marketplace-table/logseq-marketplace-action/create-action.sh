#!/bin/bash
# Create folders
mkdir -p data docs scripts .github/workflows

# Create .gitignore
cat > .gitignore <<'EOF'
node_modules/
data/
docs/index.html
EOF

# Create package.json with scripts section
cat > package.json <<'EOF'
{
  "name": "logseq-marketplace-catalog",
  "version": "1.0.0",
  "description": "Interactive catalog of Logseq Marketplace packages",
  "type": "module",
  "dependencies": {
    "node-fetch": "^3.3.2"
  },
  "scripts": {
    "update": "node scripts/update.js"
  }
}
EOF

# Create update.js script
cat > scripts/update.js <<'EOF'
import fs from 'fs';
import fetch from 'node-fetch';

const MARKETPLACE_URL = 'https://raw.githubusercontent.com/logseq/marketplace/main/packages.json';

async function update() {
  const res = await fetch(MARKETPLACE_URL);
  if (!res.ok) {
    throw new Error(`Failed to fetch marketplace data: ${res.status} ${res.statusText}`);
  }
  const packages = await res.json();

  // Save raw data
  fs.writeFileSync('data/packages.json', JSON.stringify(packages, null, 2));

  // Generate HTML rows
  const rows = packages.map(pkg => `
    <tr>
      <td><a href="${pkg.repo}" target="_blank">${pkg.title || pkg.id}</a></td>
      <td>${pkg.description || ''}</td>
      <td>${pkg.author || ''}</td>
      <td>${pkg.version || ''}</td>
    </tr>
  `).join('');

  // HTML page with DataTables
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <title>Logseq Marketplace Catalog</title>
      <link rel="stylesheet" href="https://cdn.datatables.net/1.13.4/css/jquery.dataTables.min.css">
      <script src="https://code.jquery.com/jquery-3.6.0.min.js"></script>
      <script src="https://cdn.datatables.net/1.13.4/js/jquery.dataTables.min.js"></script>
    </head>
    <body>
      <h1>Logseq Marketplace Catalog</h1>
      <table id="catalog" class="display">
        <thead>
          <tr>
            <th>Name</th>
            <th>Description</th>
            <th>Author</th>
            <th>Version</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
      <script>
        $(document).ready(() => $('#catalog').DataTable());
      </script>
    </body>
    </html>
  `;

  fs.writeFileSync('docs/index.html', html);
}

update().catch(err => {
  console.error(err);
  process.exit(1);
});
EOF

# Create GitHub Action workflow
cat > .github/workflows/update.yml <<'EOF'
name: Update Catalog
on:
  schedule:
    - cron: '0 2 * * *' # every day at 02:00 UTC
  workflow_dispatch:

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
      - run: npm install
      - run: npm run update
      - run: git config user.name "GitHub Actions"
      - run: git config user.email "actions@github.com"
      - run: git add .
      - run: git commit -m "Update catalog" || echo "No changes"
      - run: git push
EOF

# Create README.md with instructions and GitHub Pages info
cat > README.md <<'EOF'
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

