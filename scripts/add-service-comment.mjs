#!/usr/bin/env node

/**
 * Script to organize imports by type with comments
 * Run this to group and comment imports properly
 *
 * Usage: node scripts/add-service-comment.mjs <file1> [file2] ...
 */
import { readFileSync, writeFileSync } from 'fs';
import { globSync } from 'glob';

const filePaths = process.argv.slice(2);

if (filePaths.length === 0) {
  console.error('Please provide file path(s)');
  console.error(
    'Usage: node scripts/add-service-comment.mjs <file1> [file2] ...',
  );
  process.exit(1);
}

// Expand glob patterns
const expandedFiles = filePaths.flatMap((pattern) => {
  const files = globSync(pattern, { nodir: true });
  return files.filter((f) => f.endsWith('.ts') || f.endsWith('.js'));
});

if (expandedFiles.length === 0) {
  console.error('No TypeScript/JavaScript files found matching the patterns');
  process.exit(1);
}

// Type definitions and their priority order
const typeDefinitions = [
  { pattern: /\.dto['"]/, comment: 'DTOs', priority: 1 },
  { pattern: /\.entity['"]/, comment: 'Entities', priority: 2 },
  { pattern: /\.interface['"]/, comment: 'Interfaces', priority: 3 },
  { pattern: /\.type['"]/, comment: 'Types', priority: 4 },
  { pattern: /\.enum['"]/, comment: 'Enums', priority: 5 },
  { pattern: /\.guard['"]/, comment: 'Guards', priority: 6 },
  { pattern: /\.decorator['"]/, comment: 'Decorators', priority: 7 },
  { pattern: /\.pipe['"]/, comment: 'Pipes', priority: 8 },
  { pattern: /\.filter['"]/, comment: 'Filters', priority: 9 },
  { pattern: /\.interceptor['"]/, comment: 'Interceptors', priority: 10 },
  { pattern: /\.middleware['"]/, comment: 'Middleware', priority: 11 },
  { pattern: /\.(config|schema)['"]/, comment: 'Configs', priority: 12 },
  { pattern: /\.service['"]/, comment: 'Services', priority: 13 },
  { pattern: /\.repository['"]/, comment: 'Repositories', priority: 14 },
  { pattern: /\.controller['"]/, comment: 'Controllers', priority: 15 },
  { pattern: /\.module['"]/, comment: 'Modules', priority: 16 },
];

function getImportType(importText) {
  for (const typeDef of typeDefinitions) {
    if (typeDef.pattern.test(importText)) {
      return typeDef;
    }
  }
  return null;
}

function isImportLine(line) {
  return line.trim().startsWith('import ');
}

function isTypeCommentLine(line) {
  const trimmed = line.trim();
  if (!trimmed.startsWith('//')) return false;

  const commentText = trimmed.replace('//', '').trim();

  // Check if it's one of our type comments
  const isTypeComment = typeDefinitions.some((t) => t.comment === commentText);
  const isLibrariesComment = commentText === 'Libraries';

  return isTypeComment || isLibrariesComment;
}

function isEmptyLine(line) {
  return line.trim() === '';
}

let modifiedCount = 0;

expandedFiles.forEach((filePath) => {
  try {
    const content = readFileSync(filePath, 'utf8');
    const lines = content.split('\n');

    // Find import section: first import to last line with semicolon that ends an import
    let firstImportIndex = -1;
    let lastImportIndex = -1;
    let inImport = false;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      if (isImportLine(line)) {
        if (firstImportIndex === -1) {
          firstImportIndex = i;
        }
        inImport = true;
        lastImportIndex = i;

        // Check if import ends on same line
        if (line.includes(';')) {
          inImport = false;
        }
      } else if (inImport) {
        // We're inside a multi-line import
        lastImportIndex = i;
        if (line.includes(';')) {
          inImport = false;
        }
      } else if (
        firstImportIndex !== -1 &&
        !isEmptyLine(line) &&
        !isTypeCommentLine(line)
      ) {
        // We've passed the import section
        break;
      }
    }

    // No imports found
    if (firstImportIndex === -1) {
      return;
    }

    // Look back to include any type comments that might exist before first import
    let actualStartIndex = firstImportIndex;
    for (let i = firstImportIndex - 1; i >= 0; i--) {
      if (isTypeCommentLine(lines[i]) || isEmptyLine(lines[i])) {
        actualStartIndex = i;
      } else {
        break;
      }
    }

    // Collect all imports while preserving their line structure
    const imports = [];
    let currentImport = [];
    let collectingImport = false;

    for (let i = actualStartIndex; i <= lastImportIndex; i++) {
      const line = lines[i];

      // Skip our type comments and empty lines between them
      if (isTypeCommentLine(line)) {
        continue;
      }

      if (isEmptyLine(line) && !collectingImport) {
        continue;
      }

      if (isImportLine(line)) {
        // Start collecting a new import
        collectingImport = true;
        currentImport = [line];

        // Check if it's a single-line import
        if (line.includes(';')) {
          imports.push([...currentImport]);
          currentImport = [];
          collectingImport = false;
        }
      } else if (collectingImport) {
        // Continue collecting multi-line import
        currentImport.push(line);

        // Check if import ends here
        if (line.includes(';')) {
          imports.push([...currentImport]);
          currentImport = [];
          collectingImport = false;
        }
      }
    }

    // Group imports by type
    const groupedImports = new Map();
    const ungroupedImports = [];

    imports.forEach((importLines) => {
      const importText = importLines.join('\n');
      const typeDef = getImportType(importText);

      if (typeDef) {
        if (!groupedImports.has(typeDef.comment)) {
          groupedImports.set(typeDef.comment, []);
        }
        groupedImports.get(typeDef.comment).push(importLines);
      } else {
        ungroupedImports.push(importLines);
      }
    });

    // Build new import section
    const newImportSection = [];

    // Add ungrouped imports first (external libraries)
    if (ungroupedImports.length > 0) {
      newImportSection.push('// Libraries');
      ungroupedImports.forEach((importLines, index) => {
        newImportSection.push(...importLines);
        // Don't add empty line after last ungrouped import
        if (index < ungroupedImports.length - 1) {
          // Check if next import is also single line, if so no empty line needed
          const nextImport = ungroupedImports[index + 1];
          if (nextImport.length > 1 || importLines.length > 1) {
            // newImportSection.push('');
          }
        }
      });
    }

    // Sort type definitions by priority and add grouped imports
    const sortedTypes = Array.from(groupedImports.keys()).sort((a, b) => {
      const aPriority =
        typeDefinitions.find((t) => t.comment === a)?.priority || 999;
      const bPriority =
        typeDefinitions.find((t) => t.comment === b)?.priority || 999;
      return aPriority - bPriority;
    });

    sortedTypes.forEach((typeComment) => {
      const typeImports = groupedImports.get(typeComment);
      if (typeImports && typeImports.length > 0) {
        newImportSection.push('');
        newImportSection.push(`// ${typeComment}`);
        typeImports.forEach((importLines, index) => {
          newImportSection.push(...importLines);
          // Add empty line between imports of the same type if they are multi-line
          if (index < typeImports.length - 1) {
            const nextImport = typeImports[index + 1];
            if (nextImport.length > 1 || importLines.length > 1) {
              newImportSection.push('');
            }
          }
        });
      }
    });

    // Reconstruct the file
    const beforeImports = lines.slice(0, actualStartIndex);
    const afterImports = lines.slice(lastImportIndex + 1);

    // Remove leading empty lines from afterImports
    while (afterImports.length > 0 && isEmptyLine(afterImports[0])) {
      afterImports.shift();
    }

    const newLines = [...beforeImports, ...newImportSection, ...afterImports];

    const newContent = newLines.join('\n');

    // Check if content actually changed
    if (content !== newContent) {
      writeFileSync(filePath, newContent, 'utf8');
      console.log(`✓ Organized imports in ${filePath}`);
      modifiedCount++;
    } else {
      console.log(`- No changes needed in ${filePath}`);
    }
  } catch (error) {
    console.error(`✗ Error processing ${filePath}:`, error.message);
  }
});

console.log(`\n${modifiedCount} file(s) modified`);
