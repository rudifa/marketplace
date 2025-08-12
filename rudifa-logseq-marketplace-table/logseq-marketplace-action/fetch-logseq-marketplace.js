#!/usr/bin/env node
// Script to fetch Logseq marketplace plugin package details from GitHub
// Usage: node fetch-logseq-marketplace.js

import fetch from "node-fetch";
import fs from "fs";
import sharp from "sharp";
import path from "path";

const OUTPUT_DIR = "src/data";
const OUTPUT_FILE = "logseq-marketplace-plugins.json";

const GITHUB_API =
  "https://api.github.com/repos/logseq/marketplace/contents/packages";
const RAW_BASE =
  "https://raw.githubusercontent.com/logseq/marketplace/master/packages";

function getGithubHeaders() {
  const headers = {Accept: "application/vnd.github.v3+json"};
  if (process.env.GITHUB_TOKEN) {
    headers["Authorization"] = `token ${process.env.GITHUB_TOKEN}`;
  }
  return headers;
}

async function fetchPackageList() {
  console.log("Fetching package list from GitHub...");
  const res = await fetch(GITHUB_API, {headers: getGithubHeaders()});
  if (!res.ok) {
    let errorText = "";
    try {
      errorText = await res.text();
    } catch (e) {
      errorText = "(could not read error body)";
    }
    console.error(
      `Failed to fetch package list. Status: ${res.status} ${res.statusText}. Body: ${errorText}`
    );
    throw new Error("Failed to fetch package list");
  }
  const data = await res.json();
  console.log(`Found ${data.length} packages.`);
  return data;
}

async function fetchManifestAndIcon(packageName) {
  const manifestUrl = `${RAW_BASE}/${packageName}/manifest.json`;
  try {
    const res = await fetch(manifestUrl, {headers: getGithubHeaders()});
    if (!res.ok) {
      console.log(`No manifest.json for ${packageName}`);
      return null;
    }
    const manifest = await res.json();

    // Add iconUrl if icon is present, using raw.githubusercontent.com for CORS compatibility
    if (manifest.icon) {
      manifest.iconUrl = `${RAW_BASE}/${packageName}/${manifest.icon}`;
    } else {
      manifest.iconUrl = "";
    }
    console.log(`Fetched manifest for ${packageName}`);
    return manifest;
  } catch (err) {
    console.log(`Error fetching manifest for ${packageName}:`, err);
    return null;
  }
}

// Fetch commit dates for a package directory
async function fetchCommitDates(packageName) {
  const commitsApi = `https://api.github.com/repos/logseq/marketplace/commits?path=packages/${packageName}&per_page=100`;
  try {
    const res = await fetch(commitsApi, {headers: getGithubHeaders()});
    if (!res.ok) {
      console.log(`Could not fetch commits for ${packageName}`);
      return {created_at: "", last_updated: ""};
    }
    const commits = await res.json();
    if (!Array.isArray(commits) || commits.length === 0) {
      return {created_at: "", last_updated: ""};
    }
    // Commits are returned newest first
    const last_updated = commits[0]?.commit?.committer?.date || "";
    const created_at =
      commits[commits.length - 1]?.commit?.committer?.date || "";
    return {created_at, last_updated};
  } catch (err) {
    console.log(`Error fetching commit dates for ${packageName}:`, err);
    return {created_at: "", last_updated: ""};
  }
}

async function main() {
  try {
    // Fetch package list from GitHub logseq marketplace repo
    const packages = await fetchPackageList();
    const results = [];
    let count = 0;
    // Loop through packages to convert package data to result data
    for (const pkg of packages) {
      if (pkg.type !== "dir") continue;
      console.log(`Processing package: ${pkg.name}`);
      const manifest = await fetchManifestAndIcon(pkg.name);
      const commitDates = await fetchCommitDates(pkg.name);
      if (manifest) {
        console.log(`manifest for ${pkg.name}`, manifest);
        results.push({
          name: manifest.name || pkg.name,
          id: manifest.id || "",
          description: manifest.description || "",
          author: manifest.author || "",
          repo: manifest.repo || "",
          version: manifest.version || "",
          dir: pkg.name,
          iconUrl: manifest.iconUrl,
          created_at: commitDates.created_at,
          last_updated: commitDates.last_updated,
        });
      } else {
        results.push({
          name: pkg.name,
          error: "No manifest.json",
          iconUrl: "",
          created_at: commitDates.created_at,
          last_updated: commitDates.last_updated,
        });
      }

      count++;
      if (count % 30 === 0) {
        console.log(`Processed ${count} packages...`);
        break; // during the development
      }
    }

    // Generate HTML table rows from results
    const rows = results
      .map(
        (pkg) => `
      <tr>
        <td>${
          pkg.iconUrl
            ? `<img src="${pkg.iconUrl}" alt="icon" width="24" height="24">`
            : ""
        }</td>
        <td>${pkg.name || ""}</td>
        <td>       ${
          pkg.description && pkg.repo
            ? `<a href="#" onclick="showReadmeModal('${pkg.repo.replace(/'/g, "\\'")}')">${pkg.description}</a>`
            : ""
        }</td>
        <td>${pkg.author || ""}</td>
        <td>${
          pkg.repo
            ? `<a href="https://github.com/${pkg.repo}" target="_blank">${pkg.repo}</a>`
            : ""
        }</td>
        <td>${pkg.version || ""}</td>
        <td>${pkg.created_at ? pkg.created_at.slice(0, 10) : ""}</td>
        <td>${pkg.last_updated ? pkg.last_updated.slice(0, 10) : ""}</td>
        <td>${pkg.error || ""}</td>
      </tr>
    `
      )
      .join("");

    // Generate HTML page
    const html = `<!DOCTYPE html>
       <html>
       <head>
         <meta charset="UTF-8">
         <title>Logseq Marketplace Plugins</title>
         <link rel="stylesheet" href="https://cdn.datatables.net/1.13.4/css/jquery.dataTables.min.css">
         <script src="https://code.jquery.com/jquery-3.6.0.min.js"></script>
         <script src="https://cdn.datatables.net/1.13.4/js/jquery.dataTables.min.js"></script>
         <script src="https://cdn.jsdelivr.net/npm/marked/marked.min.js"></script>
         <style>
           div.dataTables_wrapper {
             width: 100%;
             margin: 0 auto;
           }
           /* Modal styles */
           .modal-bg {
             display: none;
             position: fixed;
             z-index: 1000;
             left: 0; top: 0; width: 100vw; height: 100vh;
             background: rgba(0,0,0,0.5);
             justify-content: center; align-items: center;
           }
           .modal-content {
             background: #fff;
             max-width: 80vw;
             max-height: 80vh;
             overflow: auto;
             padding: 2em;
             border-radius: 8px;
             position: relative;
           }
           .modal-close {
             position: absolute;
             top: 0.5em;
             right: 1em;
             font-size: 2em;
             color: #888;
             cursor: pointer;
           }
         </style>
       </head>
       <body>
         <h1>Logseq Marketplace Plugins</h1>
         <table id="plugins" class="display">
           <thead>
             <tr>
               <th>Icon</th>
               <th>Name</th>
               <th>Description</th>
               <th>Author</th>
               <th>Repo</th>
               <th>Version</th>
               <th>Created</th>
               <th>Last Updated</th>
               <th>Error</th>
             </tr>
           </thead>
           <tbody>${rows}</tbody>
         </table>
         <div class="modal-bg" id="readme-modal-bg">
           <div class="modal-content">
             <span class="modal-close" onclick="closeReadmeModal()">&times;</span>
             <div id="readme-modal-content">Loading...</div>
           </div>
         </div>
         <script type="text/javascript">
           window.showReadmeModal = function(repo) {
             const modalBg = document.getElementById('readme-modal-bg');
             const modalContent = document.getElementById('readme-modal-content');
             modalBg.style.display = 'flex';
             modalContent.innerHTML = 'Loading...';
             // Try main branch first, then fallback to master
             const urlMain = 'https://raw.githubusercontent.com/' + repo + '/main/README.md';
             const urlMaster = 'https://raw.githubusercontent.com/' + repo + '/master/README.md';
             fetch(urlMain)
               .then(function(res) {
                 if (res.ok) return res.text();
                 return fetch(urlMaster).then(function(r) { return r.ok ? r.text() : 'README.md not found.'; });
               })
               .then(function(markdown) {
                 if (markdown === 'README.md not found.') {
                   modalContent.innerHTML = '<p>README.md not found.</p>';
                 } else {
                   modalContent.innerHTML = marked.parse(markdown);
                 }
               })
               .catch(function() {
                 modalContent.innerHTML = '<p>Error loading README.md</p>';
               });
           };
           window.closeReadmeModal = function() {
             document.getElementById('readme-modal-bg').style.display = 'none';
           };
           $(document).ready(function() {
             $('#plugins').DataTable({
               paging: false,
               scrollY: '70vh',
               scrollCollapse: true,
               info: false
             });
           });
         </script>
       </body>
       </html>`;

    // Write HTML to docs/index.html
    const docsDir = "docs";
    if (!fs.existsSync(docsDir)) {
      fs.mkdirSync(docsDir, {recursive: true});
    }
    fs.writeFileSync(`${docsDir}/index.html`, html);
    console.log(
      "Fetched",
      results.length,
      `plugins. Output: ${docsDir}/index.html`
    );
  } catch (e) {
    console.error(e);
  }
}

main().then(() => {
  console.log("Script execution completed.");
  process.exit(0);
});
