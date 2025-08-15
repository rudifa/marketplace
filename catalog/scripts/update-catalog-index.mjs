#!/usr/bin/env node
// Script to fetch Logseq marketplace plugin package details from GitHub
// and generate an HTML page with a table of plugins.
// Usage: node update-catalog-index.js
// Output: catalog/index.html

import fetch from "node-fetch";
import fs from "fs";

const OUTPUT_DIR = "catalog";
const OUTPUT_FILE = "index.html";
const RESULTS_FILE = "results.json";

const LOGSEQ_MARKETPLACE_PACKAGES_URL =
  "https://api.github.com/repos/logseq/marketplace/contents/packages";

const COMMITS_API =
  "https://api.github.com/repos/logseq/marketplace/commits?path=packages";

const RAW_LOGSEQ_MARKETPLACE_PACKAGES_URL =
  "https://raw.githubusercontent.com/logseq/marketplace/master/packages";

// Parse command line arguments for verbose flag, max, and help
const args = process.argv.slice(2);
if (args.includes("--help") || args.includes("-h")) {
  console.log(
    `Usage: node update-catalog-index.js [--max <number>] [--verbose|-v] [--help|-h]\n\nOptions:\n  --max <number>   Limit the number of packages processed\n  --verbose, -v    Enable verbose logging\n  --help, -h       Show this help message`
  );
  process.exit(0);
}
const verbose = args.includes("--verbose") || args.includes("-v");
let maxItems;
const maxIdx = args.indexOf("--max");
if (maxIdx !== -1 && args.length > maxIdx + 1) {
  const val = parseInt(args[maxIdx + 1], 10);
  if (!isNaN(val) && val > 0) maxItems = val;
}

main({verbose}).then(() => {
  if (verbose) console.log("Script execution completed.");
  process.exit(0);
});

/**
 * Main entry point for fetching Logseq marketplace plugin data and generating HTML output.
 * @param {Object} options
 * @param {boolean} options.verbose - Enable verbose logging.
 */
async function main({verbose = false} = {}) {
  try {
    // Fetch package list from GitHub logseq marketplace repo
    const packages = await fetchPackageList(verbose);
    const results = [];

    // Concurrency limit
    const CONCURRENCY = 10;
    let idx = 0;
    let count = 0;
    async function worker() {
      while (true) {
        let myIdx;
        // Atomically get the next index
        if (
          idx >= packages.length ||
          (maxItems !== undefined && idx >= maxItems)
        )
          return;
        myIdx = idx;
        idx++;
        const pkg = packages[myIdx];
        const result = await retrievePackageDetails(pkg, verbose);
        if (result) results[myIdx] = result;
        count++;
        if (count % 25 === 0) {
          console.log(`Processed ${count} packages...`);
        }
        if (maxItems && count >= maxItems) {
          console.log(`Processed ${count} packages. Stopping early.`);
          break;
        }
      }
    }
    // Start CONCURRENCY workers
    await Promise.all(
      Array(CONCURRENCY)
        .fill(0)
        .map(() => worker())
    );

    // Sort results by last_updated (descending)
    const sortedResults = results
      .filter(Boolean)
      .sort((a, b) => {
        // If either date is missing, treat as oldest
        if (!a.last_updated && !b.last_updated) return 0;
        if (!a.last_updated) return 1;
        if (!b.last_updated) return -1;
        // Compare as ISO date strings
        return b.last_updated.localeCompare(a.last_updated);
      });
    // Generate HTML page
    const html = generateHtml(sortedResults);

    // Write HTML to OUTPUT_FILE
    const outDir = OUTPUT_DIR;
    const outFile = OUTPUT_FILE;
    if (!fs.existsSync(outDir)) {
      fs.mkdirSync(outDir, {recursive: true});
    }
    fs.writeFileSync(`${outDir}/${outFile}`, html);
    /* if (verbose) */ {
      console.log(
        "\nFetched",
        results.filter(Boolean).length,
        `plugins. Output: ${outDir}/${outFile}`
      );
    }

    // Write results to JSON file
    fs.writeFileSync(
      `${outDir}/${RESULTS_FILE}`,
      JSON.stringify(results, null, 2)
    );
    console.log("Package Details saved to", `${outDir}/${RESULTS_FILE}`);
  } catch (e) {
    console.error(e);
  }
}

// ==================================================================================
// Extract the package details for packages, for the Logseq Marketplace Plugins table
// ==================================================================================

/**
 * Fetch the list of package directories from the Logseq marketplace GitHub repository.
 * @param {boolean} verbose - Enable verbose logging.
 * @returns {Promise<Array>} List of package objects from GitHub API.
 */
async function fetchPackageList(verbose = false) {
  if (verbose) console.log("Fetching package list from GitHub...");
  const res = await fetch(LOGSEQ_MARKETPLACE_PACKAGES_URL, {
    headers: getGithubHeaders(),
  });
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

  // Additional check for API error messages (defensive)
  if (
    data &&
    data.message &&
    data.message.includes("API rate limit exceeded")
  ) {
    throw new Error("GitHub API rate limit exceeded! Are you authenticated?");
  }

  if (verbose) console.log(`Found ${data.length} packages.`);
  return data;
}

/**
 * Process a single package: fetch manifest, commit dates, and build result object.
 * @param {Object} pkg - The package object from GitHub API.
 * @param {boolean} verbose - Enable verbose logging.
 * @returns {Promise<Object|null>} Result object for the package, or null if not a directory.
 */
async function retrievePackageDetails(pkg, verbose = false) {
  if (pkg.type !== "dir") return null;
  if (verbose) console.log(`Processing package: ${pkg.name}`);
  else; //process.stdout.write(".");
  const manifest = await fetchManifest(pkg.name, verbose);
  const commitDates = await fetchCommitDates(pkg.name, verbose);

  if (manifest) {
    if (verbose) console.log(`manifest for ${pkg.name}`, manifest);
    let errors = validateManifest(manifest);
    const iconUrl = await fetchIconUrl(pkg.name, manifest, verbose);
    const readmeUrl = await getValidReadmeUrl(manifest.repo);
    if (!readmeUrl) {
        errors.push("Missing README");
    }
    const error = errors.join(", ");
    return {
      name: manifest.name || pkg.name,
      id: manifest.id || "",
      description: manifest.description || "",
      author: manifest.author || "",
      repo: manifest.repo || "",
      dir: pkg.name,
      iconUrl: iconUrl,
      readmeUrl: readmeUrl,
      created_at: commitDates.created_at,
      last_updated: commitDates.last_updated,
      error: error,
    };
  } else {
    return {
      name: pkg.name,
      error: "Missing manifest",
      iconUrl: "",
      created_at: commitDates.created_at,
      last_updated: commitDates.last_updated,
    };
  }
}

/**
 * Fetch the manifest.json for a given package.
 * @param {string} packageName - The name of the package directory.
 * @param {boolean} verbose - Enable verbose logging.
 * @returns {Promise<Object|null>} Manifest object, or null if not found.
 */
async function fetchManifest(packageName, verbose = false) {
  const manifestUrl = `${RAW_LOGSEQ_MARKETPLACE_PACKAGES_URL}/${packageName}/manifest.json`;
  try {
    const res = await fetch(manifestUrl, {headers: getGithubHeaders()});
    if (!res.ok) {
      return null;
    }
    const manifest = await res.json();
    // Additional check for API error messages (defensive)
    if (
      manifest &&
      manifest.message &&
      manifest.message.includes("API rate limit exceeded")
    ) {
      throw new Error("GitHub API rate limit exceeded! Are you authenticated?");
    }
    if (verbose) console.log(`Fetched manifest for ${packageName}`);
    return manifest;
  } catch (err) {
    if (verbose)
      console.log(`Error fetching manifest for ${packageName}:`, err);
    return null;
  }
}

function validateManifest(manifest) {
  const errors = [];
  //   if (!manifest.name) errors.push("Missing package name"); // if missing, manifest name will be used
  if (!manifest.description) errors.push("Missing package description");
  if (!manifest.author) errors.push("Missing package author");
  if (!manifest.repo) errors.push("Missing package repository");
  if (!manifest.icon) errors.push("Missing package icon");

  return errors;
}

/**
 * Get the icon URL for a given package and manifest.
 * @param {string} packageName - The name of the package directory.
 * @param {Object} manifest - The manifest object.
 * @param {boolean} verbose - Enable verbose logging.
 * @returns {Promise<string>} Icon URL or empty string.
 */
async function fetchIconUrl(packageName, manifest, verbose = false) {
  if (manifest && manifest.icon) {
    const url = `${RAW_LOGSEQ_MARKETPLACE_PACKAGES_URL}/${packageName}/${manifest.icon}`;
    return url;
  }
  return "";
}

// Fetch commit dates for a package directory
/**
 * Fetch the first and last commit dates for a given package directory.
 * @param {string} packageName - The name of the package directory.
 * @param {boolean} verbose - Enable verbose logging.
 * @returns {Promise<{created_at: string, last_updated: string}>} Commit date info.
 */
async function fetchCommitDates(packageName, verbose = false) {
  const commitsApi = `${COMMITS_API}/${packageName}&per_page=100`;
  try {
    const res = await fetch(commitsApi, {headers: getGithubHeaders()});
    if (!res.ok) {
      console.error(
        `fetchCommitDates: Could not fetch commits for ${packageName}`
      );
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
    process.stdout.write(".");
    return {created_at, last_updated};
  } catch (err) {
    process.stdout.write("?");

    console.error(`Error fetching commit dates for ${packageName}:`, err);
    return {created_at: "", last_updated: ""};
  }
}

/**
 * Returns the first valid README.md URL (main or master branch) for a given GitHub repo, or null if not found.
 * @param {string} repo - The GitHub repository in the form 'owner/repo'.
 * @returns {Promise<string|null>} The valid README.md URL or null if not found.
 */
async function getValidReadmeUrl(repo) {
  const urlMain =
    "https://raw.githubusercontent.com/" + repo + "/main/README.md";
  const urlMaster =
    "https://raw.githubusercontent.com/" + repo + "/master/README.md";
  try {
    let res = await fetch(urlMain);
    if (res.ok) return urlMain;
    res = await fetch(urlMaster);
    if (res.ok) return urlMaster;
    return null;
  } catch (e) {
    return null;
  }
}

/**
 * Get headers for GitHub API requests, including authorization if GITHUB_TOKEN is set.
 * @returns {Object} Headers object for fetch requests.
 */
function getGithubHeaders() {
  const headers = {Accept: "application/vnd.github.v3+json"};
  if (process.env.GITHUB_TOKEN) {
    headers["Authorization"] = `token ${process.env.GITHUB_TOKEN}`;
  }
  return headers;
}

// ======================================================================
// Generate the html file presenting the Logseq Marketplace Plugins table
// ======================================================================

/**
 * Generates the complete HTML page for the Logseq Marketplace Plugins.
 * @param {Array} results - Array of processed package objects.
 * @returns {string} Complete HTML string.
 */
function generateHtml(results) {
  const styles = generateStyles();
  const header = generateTableHeader();
  const rows = results.map(generateTableRow).join("");
  const clientScripts = generateClientScripts();

  return `<!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <title>Logseq Marketplace Plugins</title>
      <link rel="stylesheet" href="https://cdn.datatables.net/1.13.4/css/jquery.dataTables.min.css">
      <script src="https://code.jquery.com/jquery-3.6.0.min.js"></script>
      <script src="https://cdn.datatables.net/1.13.4/js/jquery.dataTables.min.js"></script>
      <script src="https://cdn.jsdelivr.net/npm/marked/marked.min.js"></script>
      <style>
        ${styles}
      </style>
    </head>
    <body>
      <h1>Logseq Marketplace Plugins</h1>
      <table id="plugins" class="display">
        <thead>
          ${header}
        </thead>
        <tbody>${rows}</tbody>
      </table>
      <div class="modal-bg" id="readme-modal-bg">
        <div class="modal-content">
          <span class="modal-close" onclick="closeReadmeModal()">&times;</span>
          <div id="readme-modal-content">Loading...</div>
        </div>
      </div>
      <script>
        ${clientScripts}
      </script>
    </body>
    </html>`;
}

/**
 * Generates the CSS styles for the HTML page.
 * @returns {string} CSS styles as a string.
 */
function generateStyles() {
  return `
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
  `;
}

/**
 * Generates the table header for the Logseq Marketplace Plugins table.
 * @returns {string} HTML string containing the table header.
 */
function generateTableHeader() {
  return `
      <tr>
        <th>Icon</th>
        <th>Name</th>
        <th>Description</th>
        <th>Author</th>
        <th>Repo</th>
        <th>Created</th>
        <th>Last Updated</th>
        <th>Error</th>
      </tr>
  `;
}

/**
 * Generates the HTML for a single table row based on the package data.
 * @param {Object} pkg - The package object.
 * @returns {string} HTML string for a table row.
 */
function generateTableRow(pkg) {
  const iconCell = pkg.iconUrl
    ? `<img src="${pkg.iconUrl}" alt="icon" width="24" height="24">`
    : "";
  const descCell = pkg.description
    ? (pkg.readmeUrl
        ? `<a href="#" onclick="showReadmeModal('${pkg.readmeUrl}')">${pkg.description}</a>`
        : pkg.description)
    : "";
  const repoCell = pkg.repo
    ? `<a href="https://github.com/${pkg.repo}" target="_blank">${pkg.repo}</a>`
    : "";
  return `
    <tr>
      <td>${iconCell}</td>
      <td>${pkg.name || ""}</td>
      <td>${descCell}</td>
      <td>${pkg.author || ""}</td>
      <td>${repoCell}</td>
      <td>${pkg.created_at ? pkg.created_at.slice(0, 10) : ""}</td>
      <td>${pkg.last_updated ? pkg.last_updated.slice(0, 10) : ""}</td>
      <td>${pkg.error || ""}</td>
    </tr>
  `;
}

/**
 * Generates the client-side JavaScript to be included in the HTML.
 * @returns {string} Client-side JavaScript as a string.
 */
function generateClientScripts() {
  return `
    window.showReadmeModal = function(readmeUrl) {
      const modalBg = document.getElementById('readme-modal-bg');
      const modalContent = document.getElementById('readme-modal-content');
      const modalBox = modalBg.querySelector('.modal-content');
      modalBg.style.display = 'flex';
      modalBox.style.visibility = 'hidden';
      modalContent.innerHTML = '';
      let loadingTimeout = setTimeout(function() {
        modalBox.style.visibility = 'visible';
        modalContent.innerHTML = 'Loading...';
      }, 500);
      if (!readmeUrl) {
        clearTimeout(loadingTimeout);
        modalBox.style.visibility = 'visible';
        modalContent.innerHTML = '<p>README.md not found.</p>';
        return;
      }
      fetch(readmeUrl)
        .then(function(res) { return res.text(); })
        .then(function(markdown) {
          clearTimeout(loadingTimeout);
          modalBox.style.visibility = 'visible';
          modalContent.innerHTML = marked.parse(markdown);
        })
        .catch(function() {
          clearTimeout(loadingTimeout);
          modalBox.style.visibility = 'visible';
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
        info: false,
        order: [] // No initial sort, preserve server order, but allow user sorting
      });
    });
  `;
}
