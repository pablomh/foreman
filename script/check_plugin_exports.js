#!/usr/bin/env node
/* eslint-disable no-console */
/* eslint max-lines: "off" */

const fs = require('fs');
const path = require('path');
const babel = require('@babel/core');

const root = path.resolve(__dirname, '..');
const assetsRoot = path.join(root, 'webpack/assets/javascripts');

const {
  generateExportsFile,
  exportNameFor,
  exportableModules,
  exportedKeys,
} = require('../webpack/assets/javascripts/exportAll');
const { exportKeyFor } = require('../config/plugin_import_key');

generateExportsFile();

const exportedNames = exportedKeys();

const parseSource = (content, filePath) => {
  try {
    return babel.parseSync(content, {
      babelrc: false,
      configFile: false,
      parserOpts: {
        sourceType: 'module',
        plugins: /\.tsx?$/.test(filePath) ? ['jsx', 'typescript'] : ['jsx'],
        errorRecovery: true,
      },
    });
  } catch (error) {
    return null;
  }
};

const astCache = new Map();
const astFor = file => {
  if (!astCache.has(file)) {
    const ast = parseSource(fs.readFileSync(file, 'utf8'), file);
    if (!ast) throw new Error(`Unable to parse ${file}`);
    astCache.set(file, ast);
  }
  return astCache.get(file);
};

const exportNamesOf = ast => {
  const names = new Set();
  const starTargets = [];
  let hasDefault = false;
  babel.traverse(ast, {
    ExportDefaultDeclaration() {
      hasDefault = true;
    },
    ExportNamedDeclaration({ node }) {
      if (node.exportKind === 'type') return;
      if (node.declaration) {
        const { declaration } = node;
        if (declaration.id && declaration.id.name) {
          names.add(declaration.id.name);
        }
        (declaration.declarations || []).forEach(({ id }) => {
          if (id && id.name) names.add(id.name);
          (id && id.properties ? id.properties : []).forEach(property => {
            const target = property.value || property.argument;
            if (target && target.name) names.add(target.name);
          });
        });
      }
      (node.specifiers || []).forEach(specifier => {
        if (specifier.type !== 'ExportSpecifier') return;
        const exported = specifier.exported.name || specifier.exported.value;
        if (exported === 'default') hasDefault = true;
        else names.add(exported);
      });
    },
    ExportAllDeclaration({ node }) {
      if (node.exportKind !== 'type') {
        starTargets.push(node.source.value);
      }
    },
  });
  return { names, hasDefault, starTargets };
};

const resolveModuleFile = base => {
  const candidates = [base, `${base}.js`, `${base}.jsx`];
  return candidates.find(
    candidate => fs.existsSync(candidate) && fs.statSync(candidate).isFile()
  );
};

// export * from './X' re-exports X's named exports but not its default.
const collectExportNames = (file, seen = new Set()) => {
  if (seen.has(file)) return { names: new Set(), hasStar: false };
  seen.add(file);
  const { names, starTargets } = exportNamesOf(astFor(file));
  let hasStar = false;
  starTargets.forEach(target => {
    const resolved = target.startsWith('.')
      ? resolveModuleFile(path.resolve(path.dirname(file), target))
      : undefined;
    if (!resolved) {
      hasStar = true;
      return;
    }
    const child = collectExportNames(resolved, seen);
    child.names.forEach(name => names.add(name));
    if (child.hasStar) hasStar = true;
  });
  return { names, hasStar };
};

const defaultExportNames = new Set();
const namedExports = new Map();
exportableModules().forEach(({ relativePath }) => {
  const key = exportNameFor(relativePath);
  const file = path.join(assetsRoot, 'react_app', `${relativePath}.js`);
  if (exportNamesOf(astFor(file)).hasDefault) {
    defaultExportNames.add(key);
  }
  namedExports.set(key, collectExportNames(file));
});

const keyFromRequest = request => exportKeyFor(request);

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

const FOREMAN_REQUEST = /^foremanReact(\/.*)?$/;

const collectImports = (content, filePath) => {
  const ast = parseSource(content, filePath);
  if (!ast) return null;

  const used = new Set();
  const defaults = new Set();
  const named = new Map();
  const record = (source, { defaultImport, bindings = [] } = {}) => {
    if (!FOREMAN_REQUEST.test(source)) return;
    const key = keyFromRequest(source.substring('foremanReact'.length));
    used.add(key);
    if (defaultImport || bindings.includes('default')) defaults.add(key);
    const names = bindings.filter(binding => binding !== 'default');
    if (names.length) {
      if (!named.has(key)) named.set(key, new Set());
      names.forEach(binding => named.get(key).add(binding));
    }
  };

  babel.traverse(ast, {
    ImportDeclaration({ node }) {
      if (node.importKind === 'type') return;
      record(node.source.value, {
        defaultImport: node.specifiers.some(
          specifier => specifier.type === 'ImportDefaultSpecifier'
        ),
        bindings: node.specifiers
          .filter(
            specifier =>
              specifier.type === 'ImportSpecifier' &&
              specifier.importKind !== 'type'
          )
          .map(
            specifier => specifier.imported.name || specifier.imported.value
          ),
      });
    },
    ExportNamedDeclaration({ node }) {
      if (!node.source || node.exportKind === 'type') return;
      record(node.source.value, {
        bindings: node.specifiers
          .filter(specifier => specifier.type === 'ExportSpecifier')
          .map(specifier => specifier.local.name || specifier.local.value),
      });
    },
    ExportAllDeclaration({ node }) {
      if (node.source) record(node.source.value);
    },
    CallExpression({ node }) {
      const request = node.arguments[0];
      if (!request || request.type !== 'StringLiteral') return;
      if (node.callee.type === 'Import' || node.callee.name === 'require') {
        record(request.value);
      }
    },
  });

  return { used, defaults, named };
};

const collectUsed = (directory, used, defaultUsed, namedUsed) => {
  fs.readdirSync(directory, { withFileTypes: true }).forEach(entry => {
    const entryPath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      if (!SKIP_DIRS.has(entry.name)) {
        collectUsed(entryPath, used, defaultUsed, namedUsed);
      }
    } else if (SOURCE_FILE_PATTERN.test(entry.name) && !isTestPath(entryPath)) {
      const content = fs.readFileSync(entryPath, 'utf8');
      const record = map => (name, origin) => {
        if (!map.has(name)) map.set(name, origin);
      };
      const recordUsed = record(used);
      const recordDefault = record(defaultUsed);
      const recordNamed = (key, names, origin) => {
        if (!namedUsed.has(key)) namedUsed.set(key, new Map());
        names.forEach(name => {
          if (!namedUsed.get(key).has(name))
            namedUsed.get(key).set(name, origin);
        });
      };

      if (content.includes('foremanReact')) {
        const imports = collectImports(content, entryPath);
        if (!imports) {
          console.error(
            `Unable to parse ${entryPath}; fix its syntax or the checker's parser options`
          );
          process.exit(1);
        }
        imports.used.forEach(name => recordUsed(name, entryPath));
        imports.defaults.forEach(name => recordDefault(name, entryPath));
        imports.named.forEach((names, key) =>
          recordNamed(key, names, entryPath)
        );
      }

      BUILT_PATTERN.lastIndex = 0;
      let match = BUILT_PATTERN.exec(content);
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
const namedUsed = new Map();
directories.forEach(directory =>
  collectUsed(directory, used, defaultUsed, namedUsed)
);

const missing = [...used].filter(([name]) => !exportedNames.has(name));
const missingDefaults = [...defaultUsed].filter(
  ([name]) => exportedNames.has(name) && !defaultExportNames.has(name)
);
const missingBindings = [];
namedUsed.forEach((bindings, key) => {
  const exports = namedExports.get(key);
  if (!exportedNames.has(key) || !exports || exports.hasStar) return;
  bindings.forEach((origin, name) => {
    if (!exports.names.has(name)) missingBindings.push([key, name, origin]);
  });
});

if (missing.length || missingDefaults.length || missingBindings.length) {
  missing.forEach(([name, file]) => {
    console.error(`Missing foremanReact export "${name}" (used in ${file})`);
  });
  missingDefaults.forEach(([name, file]) => {
    console.error(
      `foremanReact export "${name}" has no default export (imported in ${file})`
    );
  });
  missingBindings.forEach(([key, name, file]) => {
    console.error(
      `foremanReact export "${key}" has no "${name}" binding (imported in ${file})`
    );
  });
  process.exit(1);
}

console.log(
  `Checked ${used.size} export references, ${defaultUsed.size} default imports and ${namedUsed.size} named imports; all are present.`
);
