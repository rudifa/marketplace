#!/usr/bin/env node

import fetch from "node-fetch";
import fs from "fs";

export {main};

// Script to process Logseq marketplace pluginData from a local file
// and generate an HTML page with a table of plugins.
// Usage: node generate-plugins-table.js
// Output: catalog/index.html

const DIR = ".";

const INPUT_FILE = "plugins-data.json";
const OUTPUT_FILE = "index.html";

/**
 * Parse command line arguments for verbose flag, and help
 */
const args = process.argv.slice(2);
if (args.includes("--help") || args.includes("-h")) {
  console.log(
    `Usage: node update-catalog-index.js [--verbose|-v] [--help|-h]\n\nOptions:\n  --verbose, -v    Enable verbose logging\n  --help, -h       Show this help message`
  );
  process.exit(0);
}
const verbose = args.includes("--verbose") || args.includes("-v");


/**
 * Run main if this script is executed directly
 */
if (import.meta.url === `file://${process.argv[1]}` || import.meta.url === process.argv[1]) {
  main({verbose}).then(() => {
    if (verbose) console.log("Script execution completed.");
    process.exit(0);
  });
}

/**
 * Main entry point for fetching Logseq marketplace plugin data and generating HTML output.
 * @param {Object} options
 * @param {boolean} options.verbose - Enable verbose logging.
 */
async function main({verbose = false} = {}) {
  try {
    // Read plugin data from input file
    const pluginsData = JSON.parse(
      fs.readFileSync(`${DIR}/${INPUT_FILE}`, "utf-8")
    );

    // Generate HTML page
    const html = generateHtml(pluginsData);

    // Write HTML to OUTPUT_FILE
    if (!fs.existsSync(DIR)) {
      fs.mkdirSync(DIR, {recursive: true});
    }
    fs.writeFileSync(`${DIR}/${OUTPUT_FILE}`, html);
    console.log(
      "Found",
      pluginsData.length,
      `packages. Output: ${DIR}/${OUTPUT_FILE}`
    );
  } catch (e) {
    console.error("Error caught in main:", e.message);
  }
}

// ======================================================================
// Generate the html file presenting the Logseq Marketplace Plugins table
// ======================================================================

/**
 * Generates the complete HTML page for the Logseq Marketplace Plugins.
 * @param {Array} pluginsData - Array of processed plugin objects.
 * @returns {string} Complete HTML string.
 */
function generateHtml(pluginsData) {
  const styles = generateStyles();
  const header = generateTableHeader();
  const rows = pluginsData.map(generateTableRow).join("");
  const clientScripts = generateClientScripts();
  const formattedDate = formatDateToUTC(new Date()); // now
  const pluginCount = pluginsData.length;

  return `<!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Logseq Marketplace Plugins</title>
      <link rel="stylesheet" href="https://cdn.datatables.net/1.13.4/css/jquery.dataTables.min.css">
      <script src="https://code.jquery.com/jquery-3.6.0.min.js"></script>
      <script src="https://cdn.datatables.net/1.13.4/js/jquery.dataTables.min.js"></script>
      <script src="https://cdn.jsdelivr.net/npm/marked/marked.min.js"></script>
      <style>${styles}</style>
    </head>
    <body>
      <header>
        <h1>Logseq Marketplace Plugins</h1>
      </header>
      <main>
        <div class="table-container">
          <table id="plugin-table" class="display">
            <thead>${header}</thead>
            <tbody>${rows}</tbody>
          </table>
        </div>
      </main>
      <div class="modal-bg" id="readme-modal-bg">
        <div class="modal-content">
          <div class="modal-header">
            <span class="modal-close" onclick="closeReadmeModal()">&times;</span>
            <h2>README</h2>
          </div>
          <div class="modal-body" id="readme-modal-content">Loading...</div>
        </div>
      </div>
      <div class="footer">
        Page generated: <span id="footer-date">${formattedDate} UTC</span> &mdash; Plugins listed: <span id="footer-count">${pluginCount}</span>
      </div>
      <script>${clientScripts}</script>
    </body>
    </html>`;
}

/**
 * Formats a Date object as a UTC string in 'DD-MM-YYYY, HH:MM:SS' format (en-GB), with / replaced by -.
 * @param {Date} date - The date to format.
 * @returns {string} The formatted UTC date string.
 */
function formatDateToUTC(date) {
  return date
    .toLocaleString("en-GB", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      timeZone: "UTC",
    })
    .replace(/\//g, "-");
}

function generateStyles() {
  return `
    body {
      font-family: Arial, sans-serif;
      margin: 0;
      padding: 0;
      display: flex;
      flex-direction: column;
      min-height: 100vh;
      box-sizing: border-box;
      background-color: #012b36;
      border: 1px solid #85c8c8;
    }
    header {
      background-color: #012b36;
      padding: 20px;
      text-align: center;
    }
    h1 {
      margin: 0;
      color: #85c8c8;
      font-size: 24px;
    }
    main {
      flex: 1;
      padding: 20px 15px 20px 15px;
      background-color: white;
      margin: 0 15px 0 15px;
    }
    .table-container {
      margin-bottom: 2em;
    }
    #plugins tbody tr:hover {
      background-color: #eafafa !important;
      border-left: 4px solid #85c8c8;
      transition: background 0.2s, border 0.2s;
    }
    .footer {
      padding: 1.5em 0 1em 0;
      text-align: center;
      font-size: 0.95em;
      margin-top: 0;
      color: #85c8c8;
      background-color: #012b36;
    }
    div.dataTables_wrapper {
      width: 100%;
      margin: 0 auto;
    }
    .dataTables_filter {
      float: right;
      margin-right: 0;
      margin-bottom: 10px;
    }
    .dataTables_filter input {
      width: 250px;
      padding: 5px;
      margin: 0 15px 10px 0;
    }
    .modal-bg {
      display: none;
      position: fixed;
      z-index: 1000;
      left: 0;
      top: 0;
      width: 100%;
      height: 100%;
      background: rgba(0,0,0,0.5);
      justify-content: center;
      align-items: center;
    }
    .modal-content {
      display: flex;
      flex-direction: column;
      max-width: 80vw;
      max-height: 80vh;
      background: #fff;
      border-radius: 8px;
      position: relative;
      transform: scale(0.7);
      opacity: 0;
      transition: transform 0.25s ease, opacity 0.2s;
      overflow: hidden; /* Prevents scrollbars on modal-content itself */
    }
    .modal-header {
      position: sticky;
      top: 0;
      background-color: #fff;
      padding: 1em 2.5em 1em 1em;
      border-bottom: 1px solid #ddd;
      z-index: 1002;
      box-shadow: 0 2px 4px rgba(0,0,0,0.03);
      flex-shrink: 0;
    }
    .modal-body {
      overflow-y: auto;
      max-height: 60vh; /* or calc(80vh - header height) */
      padding: 1em;
    }

    .modal-content.modal-animate {
      transform: scale(1);
      opacity: 1;
    }
    .modal-header h2 {
      font-size: 2em;
      margin: 0;
      color: #222;
    }
    .modal-close {
      float: right;
      font-size: 2em;
      color: #888;
      cursor: pointer;
    }


  #plugin-table {
      width: 100% !important;
      table-layout: fixed;
    }

  #plugin-table th, #plugin-table td {
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      max-width: 0;
    }

  #plugin-table th {
      position: sticky;
      top: 0;
      background-color: #f8f8f8;
      z-index: 1;
    }

    .dataTables_wrapper .dataTables_scroll {
      overflow: auto;
    }

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
 * Generates the HTML for a single table row based on the plugin data.
 * @param {Object} plugin - The plugin object.
 * @returns {string} HTML string for a table row.
 */
function generateTableRow(plugin) {
  const iconCell = plugin.iconUrl
    ? `<img src="${plugin.iconUrl}" alt="icon" width="24" height="24">`
    : "";
  const descCell = plugin.description
    ? plugin.readmeUrl
      ? `<a href="#" onclick="showReadmeModal('${plugin.readmeUrl}')">${plugin.description}</a>`
      : plugin.description
    : "";
  const repoCell = plugin.repo
    ? `<a href="https://github.com/${plugin.repo}" target="_blank">${plugin.repo}</a>`
    : "";
  return `
    <tr>
      <td>${iconCell}</td>
      <td>${plugin.name || ""}</td>
      <td>${descCell}</td>
      <td>${plugin.author || ""}</td>
      <td>${repoCell}</td>
      <td>${plugin.created_at ? plugin.created_at.slice(0, 10) : ""}</td>
      <td>${plugin.last_updated ? plugin.last_updated.slice(0, 10) : ""}</td>
      <td>${plugin.error || ""}</td>
    </tr>
  `;
}

/**
 * Generates the client-side JavaScript to be included in the HTML.
 * @returns {string} Client-side JavaScript as a string.
 */
function generateClientScripts() {
  const convertRelativeUrlsToAbsoluteString =
    convertRelativeUrlsToAbsolute.toString();
  const showReadmeModalString = showReadmeModal.toString();
  const closeReadmeModalString = closeReadmeModal.toString();
  const initDataTableString = initDataTable.toString();

  return `
    // Converts relative image and link URLs in markdown to absolute URLs based on the README location
    ${convertRelativeUrlsToAbsoluteString}

    // Show README modal
    ${showReadmeModalString}

    // Close README modal
    ${closeReadmeModalString}

    // Initialize DataTable
    ${initDataTableString}

    // Assign functions to window object
    window.showReadmeModal = showReadmeModal;
    window.closeReadmeModal = closeReadmeModal;

    // Initialize DataTable on document ready
    $(document).ready(initDataTable);
  `;
}

/**
 * Preprocesses README markdown to convert relative URLs to absolute URLs.
 * @param {string} markdown - The original markdown content.
 * @param {string} readmeUrl - The URL of the README file.
 * @returns {string} The processed markdown with absolute URLs.
 */
function convertRelativeUrlsToAbsolute(markdown, readmeUrl) {
  if (!readmeUrl) return markdown;
  // Get base URL (directory of the README)
  var baseUrl = readmeUrl.replace(/\/[^/]*$/, "/");
  // Replace image links: ![alt](relativepath)
  markdown = markdown.replace(
    /!\[([^\]]*)\]\((?!https?:\/\/|\/)([^)]+)\)/g,
    function (match, alt, rel) {
      return "![" + alt + "](" + baseUrl + rel + ")";
    }
  );
  // Replace normal links: [text](relativepath)
  markdown = markdown.replace(
    /\[([^\]]+)\]\((?!https?:\/\/|\/)([^)]+)\)/g,
    function (match, text, rel) {
      return "[" + text + "](" + baseUrl + rel + ")";
    }
  );
  return markdown;
}

/**
 * Displays a modal with the README content of a plugin.
 * @param {string} readmeUrl - The URL of the README file to display.
 */
function showReadmeModal(readmeUrl) {
  const modalBg = document.getElementById("readme-modal-bg");
  const modalContent = modalBg.querySelector(".modal-content");
  const modalBody = document.getElementById("readme-modal-content");
  const modalTitle = modalContent.querySelector(".modal-header h2");
  modalBg.style.display = "flex";
  modalContent.classList.remove("modal-animate");
  modalContent.style.visibility = "hidden";
  modalBody.innerHTML = "";
  modalTitle.textContent = "README"; // Default title

  // Animate in after a short delay to allow display
  setTimeout(function () {
    modalContent.classList.add("modal-animate");
  }, 10);

  let loadingTimeout = setTimeout(function () {
    modalContent.style.visibility = "visible";
    modalBody.innerHTML = "Loading...";
  }, 500);

  if (!readmeUrl) {
    clearTimeout(loadingTimeout);
    modalContent.style.visibility = "visible";
    modalContent.classList.add("modal-animate");
    modalBody.innerHTML = "<p>README.md not found.</p>";
    return;
  }

  fetch(readmeUrl)
    .then(function (res) {
      return res.text();
    })
    .then(function (markdown) {
      clearTimeout(loadingTimeout);
      modalContent.style.visibility = "visible";
      modalContent.classList.add("modal-animate");

      // Preprocess markdown to convert relative links to absolute URLs
      var processed = convertRelativeUrlsToAbsolute(markdown, readmeUrl);

      // Extract title from markdown (first heading)
      const titleMatch = processed.match(/^#\s+(.+)$/m);
      if (titleMatch && titleMatch[1]) {
        modalTitle.textContent = titleMatch[1];
      }

  modalBody.innerHTML = marked.parse(processed);
  // Hide the first heading in the modal body (to avoid duplicate title)
  const firstHeading = modalBody.querySelector('h1, h2, h3, h4, h5, h6');
  if (firstHeading) firstHeading.style.display = 'none';
    })
    .catch(function () {
      clearTimeout(loadingTimeout);
      modalContent.style.visibility = "visible";
      modalContent.classList.add("modal-animate");
      modalBody.innerHTML = "<p>Error loading README.md</p>";
    });
}
/**
 * Closes the README modal.
 */
function closeReadmeModal() {
  const modalBg = document.getElementById("readme-modal-bg");
  const modalBox = modalBg.querySelector(".modal-content");
  modalBox.classList.remove("modal-animate");
  setTimeout(function () {
    modalBg.style.display = "none";
  }, 200);
}

/**
 * Initializes the DataTable for the plugins table.
 */
function initDataTable() {
  // HERE header and data columns do resize together
  // BUT initial auto widths are not the best
  const table = $("#plugin-table").DataTable({
    paging: false,
    scrollY: "70vh",
    scrollCollapse: true,
    info: false,
    order: [], // No initial sort, preserve server order, but allow user sorting
  });

  $(window).on("resize", function () {
    table.columns.adjust().draw();
  });
}
