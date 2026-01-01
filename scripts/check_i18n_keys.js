#!/usr/bin/env node
/*
  Static i18n key checker.
  - Extracts all translation key paths from `src/i18n/translations.ts` (const `en` object)
  - Scans source TypeScript files under `src/` (excluding `src/test/`) for `t('...')` usages
  - Reports missing keys (used but not defined)

  Usage:
    node scripts/check_i18n_keys.js
*/

const fs = require('fs');
const path = require('path');

let ts;
try {
  ts = require('typescript');
} catch (e) {
  console.error('Missing dev dependency: typescript');
  process.exit(2);
}

const workspaceRoot = path.resolve(__dirname, '..');
const translationsPath = path.join(workspaceRoot, 'src', 'i18n', 'translations.ts');

function walkDir(dir, predicate) {
  const out = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      out.push(...walkDir(full, predicate));
    } else if (predicate(full)) {
      out.push(full);
    }
  }
  return out;
}

function isTsLike(filePath) {
  return filePath.endsWith('.ts') || filePath.endsWith('.tsx');
}

function collectTranslationKeysFromEnObject() {
  if (!fs.existsSync(translationsPath)) {
    throw new Error(`translations.ts not found at ${translationsPath}`);
  }

  const sourceText = fs.readFileSync(translationsPath, 'utf8');
  const sourceFile = ts.createSourceFile(translationsPath, sourceText, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);

  let enInitializer = null;

  function findEnInitializer(node) {
    if (ts.isVariableStatement(node)) {
      for (const decl of node.declarationList.declarations) {
        if (ts.isIdentifier(decl.name) && decl.name.text === 'en' && decl.initializer && ts.isObjectLiteralExpression(decl.initializer)) {
          enInitializer = decl.initializer;
          return;
        }
      }
    }
    ts.forEachChild(node, findEnInitializer);
  }

  findEnInitializer(sourceFile);

  if (!enInitializer) {
    throw new Error('Could not locate `const en = { ... }` object literal in translations.ts');
  }

  const keys = new Set();

  function propNameText(nameNode) {
    if (!nameNode) return null;
    if (ts.isIdentifier(nameNode)) return nameNode.text;
    if (ts.isStringLiteral(nameNode) || ts.isNoSubstitutionTemplateLiteral(nameNode)) return nameNode.text;
    return null;
  }

  function visitObjectLiteral(obj, prefix) {
    for (const prop of obj.properties) {
      if (!ts.isPropertyAssignment(prop)) continue;
      const propName = propNameText(prop.name);
      if (!propName) continue;

      const nextPrefix = prefix ? `${prefix}.${propName}` : propName;
      const init = prop.initializer;

      if (ts.isStringLiteral(init) || ts.isNoSubstitutionTemplateLiteral(init)) {
        keys.add(nextPrefix);
        continue;
      }

      if (ts.isObjectLiteralExpression(init)) {
        visitObjectLiteral(init, nextPrefix);
        continue;
      }

      // Other initializer types (numbers, arrays, function calls) are ignored.
    }
  }

  visitObjectLiteral(enInitializer, '');
  return keys;
}

function collectUsedKeysFromSource() {
  const srcRoot = path.join(workspaceRoot, 'src');
  const files = walkDir(srcRoot, (p) => {
    if (!isTsLike(p)) return false;
    // runtime app check; exclude tests
    if (p.includes(`${path.sep}test${path.sep}`)) return false;
    return true;
  });

  const used = new Map(); // key -> [{file, line}]
  const dynamic = []; // {file, snippet}

  const re = /\bt\(\s*(['"`])([^'"`\n\r]+)\1\s*[,)\]]/g;
  const dynamicRe = /\bt\(\s*`/g;

  for (const file of files) {
    const text = fs.readFileSync(file, 'utf8');

    // capture dynamic template usages
    if (dynamicRe.test(text)) {
      dynamic.push({ file: path.relative(workspaceRoot, file) });
    }

    let match;
    while ((match = re.exec(text)) !== null) {
      const key = match[2];
      if (!key || key.includes('${')) continue;

      // compute 1-based line number
      const before = text.slice(0, match.index);
      const line = before.split(/\r\n|\n|\r/).length;

      const rel = path.relative(workspaceRoot, file);
      const arr = used.get(key) || [];
      arr.push({ file: rel, line });
      used.set(key, arr);
    }
  }

  return { used, dynamic };
}

function main() {
  const definedKeys = collectTranslationKeysFromEnObject();
  const { used, dynamic } = collectUsedKeysFromSource();

  const missing = [];
  for (const key of used.keys()) {
    if (!definedKeys.has(key)) missing.push(key);
  }

  missing.sort();

  if (missing.length === 0) {
    console.log(`OK: All static i18n keys exist (${definedKeys.size} defined, ${used.size} used)`);
    if (dynamic.length) {
      console.log(`Note: Found ${dynamic.length} dynamic template-literal t(\`...\`) usages (not statically validated).`);
      for (const item of dynamic.slice(0, 10)) {
        console.log(`  - ${item.file}`);
      }
      if (dynamic.length > 10) console.log(`  ...and ${dynamic.length - 10} more`);
    }
    process.exit(0);
  }

  console.log(`MISSING i18n KEYS (${missing.length}):`);
  for (const key of missing) {
    console.log(`- ${key}`);
    const refs = used.get(key) || [];
    for (const ref of refs.slice(0, 3)) {
      console.log(`    ${ref.file}:${ref.line}`);
    }
    if (refs.length > 3) {
      console.log(`    ...and ${refs.length - 3} more`);
    }
  }

  process.exit(1);
}

main();
