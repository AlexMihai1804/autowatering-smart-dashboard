#!/usr/bin/env node
/**
 * Professional i18n validation using i18next-parser output
 */

const fs = require('fs');
const path = require('path');

const workspaceRoot = path.resolve(__dirname, '..');
const extractedDir = path.join(workspaceRoot, 'src', 'i18n', 'translations-check');

// Recursively extract all keys from JSON object
function extractJsonKeys(obj, prefix = '') {
  const keys = new Set();
  
  for (const [key, value] of Object.entries(obj)) {
    const fullKey = prefix ? `${prefix}.${key}` : key;
    
    if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      const nestedKeys = extractJsonKeys(value, fullKey);
      nestedKeys.forEach(k => keys.add(k));
    } else {
      keys.add(fullKey);
    }
  }
  
  return keys;
}

// Compare two sets of keys
function compareKeys(set1, set2, name1, name2) {
  const onlyIn1 = [...set1].filter(k => !set2.has(k)).sort();
  const onlyIn2 = [...set2].filter(k => !set1.has(k)).sort();
  
  return { onlyIn1, onlyIn2 };
}

async function main() {
  console.log('🔍 Professional i18n validation with i18next-parser\n');

  // Check if extracted files exist
  const enExtracted = path.join(extractedDir, 'en.json');
  const roExtracted = path.join(extractedDir, 'ro.json');

  if (!fs.existsSync(enExtracted) || !fs.existsSync(roExtracted)) {
    console.error('❌ Extracted translations not found. Run "npx i18next-parser" first.');
    process.exit(1);
  }

  // Read extracted keys from code (what i18next-parser found)
  const extractedEn = JSON.parse(fs.readFileSync(enExtracted, 'utf8'));
  const extractedRo = JSON.parse(fs.readFileSync(roExtracted, 'utf8'));

  const usedKeys = extractJsonKeys(extractedEn);
  const usedKeysRo = extractJsonKeys(extractedRo);

  console.log(`📊 Statistics:`);
  console.log(`   Keys used in code: ${usedKeys.size}`);
  console.log(`   EN extracted: ${usedKeys.size}`);
  console.log(`   RO extracted: ${usedKeysRo.size}\n`);

  let hasErrors = false;

  // Compare EN and RO extracted keys
  const { onlyIn1: onlyInEn, onlyIn2: onlyInRo } = compareKeys(usedKeys, usedKeysRo, 'EN', 'RO');

  if (onlyInEn.length > 0) {
    console.log(`❌ Keys in extracted EN but NOT in RO (${onlyInEn.length}):`);
    onlyInEn.slice(0, 20).forEach(k => console.log(`   - ${k}`));
    if (onlyInEn.length > 20) {
      console.log(`   ...and ${onlyInEn.length - 20} more`);
    }
    console.log();
    hasErrors = true;
  }

  if (onlyInRo.length > 0) {
    console.log(`⚠️  Keys in extracted RO but NOT in EN (${onlyInRo.length}):`);
    onlyInRo.slice(0, 20).forEach(k => console.log(`   - ${k}`));
    if (onlyInRo.length > 20) {
      console.log(`   ...and ${onlyInRo.length - 20} more`);
    }
    console.log();
  }

  // Check for empty translations in extracted files
  const emptyInEn = [];
  const emptyInRo = [];

  function checkEmpty(obj, prefix = '', list) {
    for (const [key, value] of Object.entries(obj)) {
      const fullKey = prefix ? `${prefix}.${key}` : key;
      
      if (typeof value === 'object' && value !== null) {
        checkEmpty(value, fullKey, list);
      } else if (value === '' || value === fullKey) {
        list.push(fullKey);
      }
    }
  }

  checkEmpty(extractedEn, '', emptyInEn);
  checkEmpty(extractedRo, '', emptyInRo);

  if (emptyInEn.length > 0) {
    console.log(`⚠️  Empty or untranslated in EN (${emptyInEn.length}):`);
    emptyInEn.slice(0, 10).forEach(k => console.log(`   - ${k}`));
    if (emptyInEn.length > 10) {
      console.log(`   ...and ${emptyInEn.length - 10} more`);
    }
    console.log();
  }

  if (emptyInRo.length > 0) {
    console.log(`⚠️  Empty or untranslated in RO (${emptyInRo.length}):`);
    emptyInRo.slice(0, 10).forEach(k => console.log(`   - ${k}`));
    if (emptyInRo.length > 10) {
      console.log(`   ...and ${emptyInRo.length - 10} more`);
    }
    console.log();
  }

  if (!hasErrors && emptyInEn.length === 0 && emptyInRo.length === 0) {
    console.log('✅ All translations are complete and valid!\n');
    console.log(`Summary:`);
    console.log(`  • ${usedKeys.size} keys used in code`);
    console.log(`  • All keys exist in both EN and RO ✓`);
    console.log(`  • No empty translations ✓`);
    process.exit(0);
  }

  if (!hasErrors && (emptyInEn.length > 0 || emptyInRo.length > 0)) {
    console.log('⚠️  Translations are structurally valid but have empty values');
    process.exit(0);
  }

  console.log('❌ Translation validation failed!');
  process.exit(1);
}

main().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
