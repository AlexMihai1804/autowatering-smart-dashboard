#!/usr/bin/env node
/**
 * Custom i18n hardcoded string detector
 * Smarter than eslint-plugin-i18next - ignores Material Symbols icons and formatting
 * 
 * Usage: node scripts/check_hardcoded_strings.js [file]
 */

const fs = require('fs');
const path = require('path');
const glob = require('glob');

// Patterns to ignore (regex)
const IGNORE_PATTERNS = [
  // Material Symbols icon names (lowercase with underscores)
  /^[a-z][a-z_0-9]*$/,
  // Pure punctuation/formatting
  /^[\s•:\/\-–—,\.%\(\)]+$/,
  // Numbers only
  /^\d+$/,
  // Number with unit (e.g., "24h", "5m")
  /^\d+[a-z]+$/i,
  // Placeholder patterns
  /^[-]{2,}$/,
  // Time placeholders
  /^--:--$/,
  // Common abbreviations
  /^(AM|PM|KB|MB|GB|mm|cm|m|°C|°F|L|ml)$/,
  // Code expressions (contains operators)
  /[=&|<>!?:]+/,
  // Variable names / camelCase
  /^[a-z][a-zA-Z0-9_]*$/,
  // Dot notation (object access)
  /\./,
  // Square brackets
  /[\[\]]/,
  // Single characters
  /^.$/,
  // Emoji patterns
  /^[\u{1F300}-\u{1F9FF}]+$/u,
  // List numbers like "1.", "2."
  /^\d+\.$/,
  // TypeScript types
  /^(Promise|string|number|boolean|void|any|null|undefined)$/,
  // Brand names / technical names (ALLCAPS or specific)
  /^(WATER|OpenStreetMap|Google|Facebook|Apple|Android|iOS)$/,
];

// Elements whose content should be ignored (icons, etc.)
const IGNORE_ELEMENT_CLASSES = [
  'material-symbols-outlined',
  'material-symbols-rounded',
  'material-symbols-sharp',
  'material-icons',
];

function shouldIgnore(text) {
  const trimmed = text.trim();
  if (!trimmed) return true;
  
  return IGNORE_PATTERNS.some(pattern => pattern.test(trimmed));
}

function findHardcodedStrings(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split('\n');
  const issues = [];
  
  // Simple regex to find JSX text content
  // Matches: >text< where text is not just whitespace
  const jsxTextRegex = />([^<>{]+)</g;
  
  lines.forEach((line, lineIndex) => {
    // Skip lines that contain icon element classes
    if (IGNORE_ELEMENT_CLASSES.some(cls => line.includes(cls))) {
      return;
    }
    
    // Skip comment lines
    if (line.trim().startsWith('//') || line.trim().startsWith('/*')) {
      return;
    }
    
    // Skip lines with t('...')
    if (/t\s*\(\s*['"`]/.test(line)) {
      return;
    }
    
    let match;
    while ((match = jsxTextRegex.exec(line)) !== null) {
      const text = match[1];
      
      // Check if it's a variable expression
      if (text.includes('{') || text.includes('}')) {
        continue;
      }
      
      if (!shouldIgnore(text)) {
        issues.push({
          line: lineIndex + 1,
          column: match.index + 1,
          text: text.trim().substring(0, 50),
        });
      }
    }
  });
  
  return issues;
}

function main() {
  const args = process.argv.slice(2);
  
  let files;
  if (args.length > 0 && !args[0].startsWith('-')) {
    files = [args[0]];
  } else {
    // Find all TSX files in src (excluding test files)
    files = glob.sync('src/**/*.tsx', {
      ignore: ['**/test/**', '**/*.test.tsx'],
    });
  }
  
  console.log('🔍 Checking for hardcoded strings in JSX...\n');
  
  let totalIssues = 0;
  
  files.forEach(file => {
    const issues = findHardcodedStrings(file);
    
    if (issues.length > 0) {
      console.log(`📄 ${file}`);
      issues.forEach(issue => {
        console.log(`   Line ${issue.line}: "${issue.text}"`);
      });
      console.log('');
      totalIssues += issues.length;
    }
  });
  
  if (totalIssues === 0) {
    console.log('✅ No hardcoded strings found!');
  } else {
    console.log(`⚠️  Found ${totalIssues} potential hardcoded strings.`);
    console.log('   Review them manually - some may be intentional (e.g., units, separators).');
  }
}

main();
