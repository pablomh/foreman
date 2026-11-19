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

const collectUsed = (directory, used) => {
  fs.readdirSync(directory, { withFileTypes: true }).forEach(entry => {
    const entryPath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      collectUsed(entryPath, used);
    } else if (entry.name.endsWith('.js')) {
      const content = fs.readFileSync(entryPath, 'utf8');
      const pattern = /reactExports\.([A-Za-z0-9_]+)/g;
      let match = pattern.exec(content);
      while (match) {
        if (!used.has(match[1])) used.set(match[1], entryPath);
        match = pattern.exec(content);
      }
    }
  });
};

const directories = process.argv.slice(2);
if (!directories.length) {
  console.error(
    'Usage: node script/check_plugin_exports.js <built-plugin-dir> [...]'
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
