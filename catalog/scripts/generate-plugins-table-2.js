#!/usr/bin/env node

// generate-plugins-table.js
// Usage: node scripts/generate-plugins-table.js
// Outputs: plugins-table.html in the same directory

import fs from "fs";

// Simpler file I/O definitions
const INPUT_FILE = "plugins-data.json";
const OUTPUT_DIR = ".";
const OUTPUT_FILE = "plugins-table.html";

// Read input data
const pluginsData = JSON.parse(fs.readFileSync(INPUT_FILE, "utf-8"));

// Ensure output directory exists
if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

// Full output file path
const outputFilePath = `${OUTPUT_DIR}/${OUTPUT_FILE}`;

/**
 * Run!
 */
main();

/**
 * Main entry point. Generates the HTML file from plugins data.
 * Reads plugins data, generates HTML, and writes it to plugins-table.html.
 */
function main() {
  const html = generateHtml(pluginsData);
  fs.writeFileSync(outputFilePath, html);
  console.log("Generated", OUTPUT_FILE);
}

/**
 * Generates the complete HTML for the plugins table page.
 * @param {Array<Object>} pluginsData - Array of plugin objects.
 * @returns {string} The full HTML page as a string.
 */
function generateHtml(pluginsData) {
  const columns = getColumns();
  return `<!DOCTYPE html>
<html lang='en'>
<head>
  <meta charset='UTF-8'>
  <title>Logseq Marketplace Plugins</title>
  <style>
    ${generateStyles()}
  </style>
</head>
<body>
<div class='plugin-table-container'>
  <h1>Logseq Marketplace Plugins</h1>
  <div class='table-container'>
    <table id='plugin-table' border='1'>
      <thead><tr>
        ${columns
          .map(
            (col) =>
              `<th${
                col.key === "created_at" || col.key === "last_updated"
                  ? " class='date-column'"
                  : ""
              } onclick=\"sortTable('${col.key}')\">${escapeHtml(
                col.label
              )}</th>`
          )
          .join("")}
      </tr></thead>
      <tbody>
        ${renderTableRows(pluginsData)}
      </tbody>
    </table>
  </div>
</div>
<script>
  const columns = ${JSON.stringify(getColumns())};
  let sortKey = 'name';
  let sortAsc = true;
  window.sortTable = function(key) {
    if (sortKey === key) { sortAsc = !sortAsc; } else { sortKey = key; sortAsc = true; }
    const rows = Array.from(document.querySelectorAll('#plugin-table tbody tr'));
    rows.sort(function(a, b) {
      var colIdx = columns.findIndex(function(c) { return c.key === key; }) + 1;
      var aText = a.querySelector('td:nth-child(' + colIdx + ')').textContent.trim().toLowerCase();
      var bText = b.querySelector('td:nth-child(' + colIdx + ')').textContent.trim().toLowerCase();
      if (aText < bText) return sortAsc ? -1 : 1;
      if (aText > bText) return sortAsc ? 1 : -1;
      return 0;
    });
    var tbody = document.querySelector('#plugin-table tbody');
    rows.forEach(function(row) { tbody.appendChild(row); });
  };
</script>
</body>
</html>`;
}

/**
 * Generates the CSS styles for the plugin table page.
 * @returns {string} The CSS styles as a string.
 */
function generateStyles() {
  return `
    .plugin-table-container {
      display: flex;
      flex-direction: column;
      height: 100vh;
      overflow: hidden;
      background-color: #002c38;
      box-sizing: border-box;
      border: 2px solid #6ecac9;
      outline: 1px solid #002c38;
      font-family: Arial, sans-serif;
      font-size: 14px;
    }
    h1 {
      position: sticky;
      top: 0;
      z-index: 20;
      background: #002c38;
      margin: 0;
      padding: 1rem 0;
      border-bottom: 2px solid #6ecac9;
      text-align: center;
      color: #fff;
    }
    .table-container {
      flex: 1;
      overflow-y: auto;
      margin: 1rem 12px;
      background-color: #fff;
      border-radius: 8px;
      box-shadow: 0 4px 6px rgba(0,0,0,0.1);
    }
    table {
      border-collapse: separate;
      border-spacing: 0;
      width: 100%;
    }
    thead {
      position: sticky;
      top: 0;
      z-index: 10;
    }
    th {
      cursor: pointer;
      background: #fff;
      padding: 0.5rem;
      border-top: 1.15px solid #000;
      border-bottom: 1.15px solid #000;
      position: sticky;
      top: 0;
    }
    td {
      padding: 0.5rem;
      border-bottom: 1px solid #eee;
    }
    .date-column {
      width: 12ch;
    }
    tbody tr:nth-child(even) {
      background-color: #f0f0f0;
    }
    tbody tr:nth-child(odd) {
      background-color: #ffffff;
    }
    tbody tr:hover {
      background-color: #6ecac9 !important;
      color: #fff !important;
      text-shadow: 0 0 2px rgba(0,0,0,0.7) !important;
    }
    tbody tr {
      transition: all 0.2s ease;
    }
  `;
}


/**
 * Returns the column definitions for the plugins table.
 * @returns {Array<{key: string, label: string}>} Array of column objects
 */
function getColumns() {
  return [
    {key: "iconUrl", label: ""},
    {key: "name", label: "Name"},
    {key: "description", label: "Description"},
    {key: "author", label: "Author"},
    {key: "repo", label: "Repo"},
    {key: "version", label: "Version"},
    {key: "created_at", label: "Created"},
    {key: "last_updated", label: "Updated"},
  ];
}

/**
 * Renders the table rows for the plugins table.
 * @param {Array<Object>} data - Array of plugin objects.
 * @returns {string} HTML string for all table rows.
 */
function renderTableRows(data) {
  const columns = getColumns();
  return data
    .map((plugin) => {
      return (
        `<tr>` +
        columns
          .map((col) => {
            let value = plugin[col.key] || "";
            if (
              (col.key === "created_at" || col.key === "last_updated") &&
              value
            ) {
              value = value.slice(0, 10);
            }
            if (col.key === "iconUrl") {
              return (
                `<td style='width:22px;text-align:center;vertical-align:middle;'>` +
                (value
                  ? `<img src='${escapeHtml(value)}' alt='${escapeHtml(
                      plugin.name
                    )} icon' width='16' height='16' style='object-fit:contain;vertical-align:middle;'/>`
                  : "") +
                `</td>`
              );
            }
            if (col.key === "repo" && value) {
              const url = `https://github.com/${value}`;
              return `<td><a href='${escapeHtml(
                url
              )}' target='_blank' rel='noopener noreferrer'>${escapeHtml(
                value
              )}</a></td>`;
            }
            return `<td${
              col.key === "created_at" || col.key === "last_updated"
                ? " class='date-column'"
                : ""
            }>${escapeHtml(value)}</td>`;
          })
          .join("") +
        `</tr>`
      );
    })
    .join("\n");
}

/**
 * Escapes HTML special characters in a string to prevent XSS and rendering issues.
 * @param {string} str - The string to escape.
 * @returns {string} The escaped string.
 */
function escapeHtml(str) {
  return String(str).replace(/[&<>"']/g, function (c) {
    return {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;",
    }[c];
  });
}
