#!/usr/bin/env node
/**
 * Builds the Journal plugin ($:/plugins/mblackman/journal):
 * 1. Bundles day.js + isoWeek + advancedFormat into plugins/mblackman/journal/lib/dayjs.js
 * 2. Minifies embedded JS/CSS in the output artifacts (build/journal.tid,
 *    build/journal-plugin.json, and dist/journal-plugin.json) without modifying source files.
 */

const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");
const esbuild = require("esbuild");

const ROOT_DIR = path.resolve(__dirname, "..");
const PLUGIN_SRC = path.join(ROOT_DIR, "plugins", "mblackman", "journal");
const BUILD_DIR = path.join(ROOT_DIR, "build");
const DIST_DIR = path.join(ROOT_DIR, "dist");
const DAYJS_OUT = path.join(PLUGIN_SRC, "lib", "dayjs.js");

const DAYJS_HEADER = `/*\\
title: $:/plugins/mblackman/journal/lib/dayjs.js
type: application/javascript
module-type: library

Bundled Day.js with ISO Week and Advanced Format plugins
\\*/\n`;

function bundleDayjs() {
  fs.mkdirSync(path.dirname(DAYJS_OUT), { recursive: true });
  const entryCode = `
    const dayjs = require("dayjs");
    const isoWeek = require("dayjs/plugin/isoWeek");
    const advancedFormat = require("dayjs/plugin/advancedFormat");
    dayjs.extend(isoWeek);
    dayjs.extend(advancedFormat);
    module.exports = dayjs;
  `;

  const result = esbuild.buildSync({
    stdin: {
      contents: entryCode,
      resolveDir: ROOT_DIR,
      sourcefile: "dayjs-bundle-entry.js",
      loader: "js",
    },
    bundle: true,
    minify: true,
    platform: "neutral",
    mainFields: ["main", "module"],
    format: "cjs",
    target: ["es2018"],
    write: false,
  });

  const bundledCode = result.outputFiles[0].text;
  fs.writeFileSync(DAYJS_OUT, DAYJS_HEADER + bundledCode, "utf8");
}

function minifyTwJsWithHeader(source) {
  const headerMatch = source.match(/^(\/\*\\[\s\S]*?\\\*\/\s*)/);
  const header = headerMatch ? headerMatch[1] : "";
  const body = headerMatch ? source.slice(header.length) : source;
  const minified = esbuild.transformSync(body, {
    loader: "js",
    minify: true,
    target: "es2018",
  });
  return header + minified.code;
}

function minifyTwCss(source) {
  return source
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/\s+/g, " ")
    .replace(/\s*([{}:;,])\s*/g, "$1")
    .replace(/;}/g, "}")
    .trim();
}

function main() {
  // Always ensure lib/dayjs.js is freshly bundled from node_modules/dayjs
  bundleDayjs();

  const jsFiles = [
    path.join(PLUGIN_SRC, "macros", "dayjs.js"),
    path.join(PLUGIN_SRC, "filters", "dayjs.js"),
    path.join(PLUGIN_SRC, "widgets", "habit-dots.js"),
    path.join(PLUGIN_SRC, "widgets", "habit-entry.js"),
    path.join(PLUGIN_SRC, "widgets", "habit-summary-table.js"),
  ];
  const cssFiles = [
    path.join(PLUGIN_SRC, "styles", "index.css"),
    path.join(PLUGIN_SRC, "styles", "habit.css"),
  ];

  const backups = new Map();
  for (const file of [...jsFiles, ...cssFiles]) {
    backups.set(file, fs.readFileSync(file, "utf8"));
  }

  try {
    for (const file of jsFiles) {
      fs.writeFileSync(file, minifyTwJsWithHeader(backups.get(file)), "utf8");
    }
    for (const file of cssFiles) {
      fs.writeFileSync(file, minifyTwCss(backups.get(file)), "utf8");
    }

    fs.mkdirSync(BUILD_DIR, { recursive: true });
    fs.mkdirSync(DIST_DIR, { recursive: true });

    execSync(
      "npx cross-env TIDDLYWIKI_PLUGIN_PATH=plugins tiddlywiki demo --output build --build journal",
      { stdio: "inherit", cwd: ROOT_DIR }
    );

    const rawJsonPath = path.join(BUILD_DIR, "journal-plugin.json");
    if (fs.existsSync(rawJsonPath)) {
      const pluginObj = JSON.parse(fs.readFileSync(rawJsonPath, "utf8"));
      const dragDropBundle = Array.isArray(pluginObj) ? pluginObj : [pluginObj];
      fs.writeFileSync(
        path.join(DIST_DIR, "journal-plugin.json"),
        JSON.stringify(dragDropBundle, null, 2),
        "utf8"
      );
    }

    console.log(
      "✅ Built build/journal.tid, build/journal-plugin.json, and dist/journal-plugin.json"
    );
  } finally {
    for (const [file, originalContent] of backups.entries()) {
      fs.writeFileSync(file, originalContent, "utf8");
    }
  }
}

if (require.main === module) {
  main();
}

module.exports = { bundleDayjs };
