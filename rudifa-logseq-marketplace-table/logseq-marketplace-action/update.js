
import fs from 'fs';
import fetch from 'node-fetch';

const GITHUB_API = 'https://api.github.com/repos/logseq/marketplace/contents/packages';
const RAW_BASE = 'https://raw.githubusercontent.com/logseq/marketplace/master/packages';

async function getPackagesManifests() {
  const res = await fetch(GITHUB_API);
  if (!res.ok) throw new Error(`Failed to fetch package list: ${res.status} ${res.statusText}`);
  const packages = await res.json();
  const manifests = [];
  for (const pkg of packages) {
    if (pkg.type !== 'dir') continue;
    const manifestUrl = `${RAW_BASE}/${pkg.name}/manifest.json`;
    const manifestRes = await fetch(manifestUrl);
    if (!manifestRes.ok) continue;
    const manifest = await manifestRes.json();
    manifests.push(manifest);
  }
  return manifests;
}

async function update() {
  const packages = await getPackagesManifests();
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
