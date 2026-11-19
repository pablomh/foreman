#!/usr/bin/env node
/* eslint-disable no-console */

const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const assetsRoot = path.join(root, 'webpack/assets/javascripts');
const exportsFile = path.join(assetsRoot, 'all_react_app_exports.js');

const {
  generateExportsFile,
} = require('../webpack/assets/javascripts/exportAll');

generateExportsFile();

const generated = fs.readFileSync(exportsFile, 'utf8');

const exportedNames = new Set(
  [...generated.matchAll(/export \{ (\w+) \}/g)].map(match => match[1])
);

const DEFAULT_EXPORT = /(?:export\s+default\b|export\s*\{[^}]*\bdefault\b)/;
const IMPORT_PATTERN = /import \* as (\w+) from '\.\/react_app\/([^']+)';/g;
const defaultExportNames = new Set();
let importMatch = IMPORT_PATTERN.exec(generated);
while (importMatch) {
  const file = path.join(assetsRoot, 'react_app', `${importMatch[2]}.js`);
  if (
    fs.existsSync(file) &&
    DEFAULT_EXPORT.test(fs.readFileSync(file, 'utf8'))
  ) {
    defaultExportNames.add(importMatch[1]);
  }
  importMatch = IMPORT_PATTERN.exec(generated);
}

// Mirrors the foremanReact externals mapping in config/webpack.config.js.
const keyFromRequest = request =>
  request.replace(/^\//, '').replace(/\//g, '_');

const SOURCE_PATTERN = /(?:from\s+|require\()\s*['"]foremanReact(\/[^'"]*)?['"]/g;
const DEFAULT_SOURCE_PATTERN = /import\s+(?!type\s)[A-Za-z_$][\w$]*\s*(?:,\s*\{[^}]*\})?\s*from\s*['"]foremanReact(\/[^'"]*)?['"]/g;
const BUILT_PATTERN = /reactExports\.([A-Za-z0-9_]+)/g;
const TEST_PATH_PATTERN = /(?:^|\/)(?:__tests__|__mocks__|test-utils)\//;
const TEST_FILE_PATTERN = /\.(?:test|spec)\.(?:js|jsx|ts|tsx)$/;
const SOURCE_FILE_PATTERN = /\.(?:js|jsx|ts|tsx)$/;
const SKIP_DIRS = new Set([
  'node_modules',
  '.git',
  'public',
  'tmp',
  'coverage',
  'vendor',
  'log',
]);

const isTestPath = filePath =>
  TEST_PATH_PATTERN.test(filePath) || TEST_FILE_PATTERN.test(filePath);

const collectUsed = (directory, used, defaultUsed) => {
  fs.readdirSync(directory, { withFileTypes: true }).forEach(entry => {
    const entryPath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      if (!SKIP_DIRS.has(entry.name)) collectUsed(entryPath, used, defaultUsed);
    } else if (SOURCE_FILE_PATTERN.test(entry.name) && !isTestPath(entryPath)) {
      const content = fs.readFileSync(entryPath, 'utf8');
      const record = map => (name, origin) => {
        if (!map.has(name)) map.set(name, origin);
      };
      const recordUsed = record(used);
      const recordDefault = record(defaultUsed);

      SOURCE_PATTERN.lastIndex = 0;
      let match = SOURCE_PATTERN.exec(content);
      while (match) {
        recordUsed(keyFromRequest(match[1] || ''), entryPath);
        match = SOURCE_PATTERN.exec(content);
      }
      DEFAULT_SOURCE_PATTERN.lastIndex = 0;
      match = DEFAULT_SOURCE_PATTERN.exec(content);
      while (match) {
        recordDefault(keyFromRequest(match[1] || ''), entryPath);
        match = DEFAULT_SOURCE_PATTERN.exec(content);
      }
      BUILT_PATTERN.lastIndex = 0;
      match = BUILT_PATTERN.exec(content);
      while (match) {
        recordUsed(match[1], entryPath);
        match = BUILT_PATTERN.exec(content);
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
const defaultUsed = new Map();
directories.forEach(directory => collectUsed(directory, used, defaultUsed));

const missing = [...used].filter(([name]) => !exportedNames.has(name));
const missingDefaults = [...defaultUsed].filter(
  ([name]) => exportedNames.has(name) && !defaultExportNames.has(name)
);

if (missing.length || missingDefaults.length) {
  missing.forEach(([name, file]) => {
    console.error(`Missing foremanReact export "${name}" (used in ${file})`);
  });
  missingDefaults.forEach(([name, file]) => {
    console.error(
      `foremanReact export "${name}" has no default export (imported in ${file})`
    );
  });
  process.exit(1);
}

console.log(
  `Checked ${used.size} export references and ${defaultUsed.size} default imports; all are present.`
);
