#!/usr/bin/env node
/* eslint-disable no-console */

const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const exportsFile = path.join(
  root,
  'webpack/assets/javascripts/all_react_app_exports.js'
);

const exportedNames = new Set();
const exportMatches = [
  ...fs.readFileSync(exportsFile, 'utf8').matchAll(/export \{ (\w+) \}/g),
];
exportMatches.forEach(match => exportedNames.add(match[1]));

// Mirrors the foremanReact externals mapping in config/webpack.config.js.
const keyFromRequest = request => {
  let key = request
    .replace(/^\//, '')
    .replace(/\//g, '_')
    .replace(/\./g, '');
  if (key.endsWith('_index')) key = key.slice(0, -'_index'.length);
  return key;
};

const isTestPath = filePath =>
  /(?:^|\/)(?:__tests__|__mocks__|test-utils)\//.test(filePath) ||
  /\.(?:test|spec)\.js$/.test(filePath);

const collectUsed = (directory, used) => {
  fs.readdirSync(directory, { withFileTypes: true }).forEach(entry => {
    const entryPath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      collectUsed(entryPath, used);
    } else if (entry.name.endsWith('.js') && !isTestPath(entryPath)) {
      const content = fs.readFileSync(entryPath, 'utf8');
      const record = (name, origin) => {
        if (!used.has(name)) used.set(name, origin);
      };
      const sourcePattern = /(?:from\s+|require\()\s*['"]foremanReact(\/[^'"]*)?['"]/g;
      let match = sourcePattern.exec(content);
      while (match) {
        record(keyFromRequest(match[1] || ''), entryPath);
        match = sourcePattern.exec(content);
      }
      const builtPattern = /reactExports\.([A-Za-z0-9_]+)/g;
      match = builtPattern.exec(content);
      while (match) {
        record(match[1], entryPath);
        match = builtPattern.exec(content);
      }
    }
  });
};

const directories = process.argv.slice(2);
if (!directories.length) {
  console.error(
    'Usage: node script/check_plugin_exports.js <plugin-dir> [...]'
  );
  process.exit(2);
}

const used = new Map();
directories.forEach(directory => collectUsed(directory, used));

const missing = [...used].filter(([name]) => !exportedNames.has(name));
if (missing.length) {
  missing.forEach(([name, file]) => {
    console.error(`Missing foremanReact export "${name}" (used in ${file})`);
  });
  process.exit(1);
}

console.log(
  `Checked ${used.size} plugin export references; all are present in the generated exports.`
);
