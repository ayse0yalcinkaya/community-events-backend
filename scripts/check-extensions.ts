#!/usr/bin/env node

/**
 * Check if required VS Code extensions are installed
 * Run: npm run check:extensions
 */

import { execSync } from 'child_process';
import chalk from 'chalk';

const requiredExtensions = [
  {
    id: 'esbenp.prettier-vscode',
    name: 'Prettier',
    description: 'Code formatter',
  },
  {
    id: 'dbaeumer.vscode-eslint',
    name: 'ESLint',
    description: 'Linting',
  },
  {
    id: 'achilleshr.vscode-run-on-save',
    name: 'Run on Save',
    description: 'Auto-format on save (optional)',
  },
];

console.log(chalk.blue.bold('\n🔍 Checking VS Code Extensions...\n'));

let missingExtensions: typeof requiredExtensions = [];

requiredExtensions.forEach((ext) => {
  try {
    // Check if extension is installed
    execSync(`code --list-extensions | grep -q "${ext.id}"`, {
      stdio: 'ignore',
    });
    console.log(chalk.green(`✓ ${ext.name} (${ext.id})`));
  } catch {
    console.log(chalk.red(`✗ ${ext.name} (${ext.id})`));
    console.log(chalk.yellow(`  → ${ext.description}`));
    missingExtensions.push(ext);
  }
});

console.log('\n' + '='.repeat(60));

if (missingExtensions.length > 0) {
  console.log(
    chalk.red.bold(
      `\n❌ ${missingExtensions.length} extension(s) missing!\n`,
    ),
  );

  console.log(chalk.yellow('📦 To install missing extensions:'));
  console.log('\nOption 1: Manual installation');
  missingExtensions.forEach((ext) => {
    console.log(
      `   - Open VS Code and press ${chalk.cyan(
        'Ctrl+Shift+X',
      )} (Extensions), search for "${ext.name}" and install`,
    );
  });

  console.log(chalk.yellow('\nOption 2: Command line (if VS Code CLI is installed)'));
  missingExtensions.forEach((ext) => {
    console.log(`   code --install-extension ${ext.id}`);
  });

  console.log(
    chalk.cyan(
      '\n💡 After installation, restart VS Code and the extensions will be automatically enabled!',
    ),
  );
} else {
  console.log(chalk.green.bold('\n✅ All required extensions are installed!'));
}

console.log('\n' + '='.repeat(60) + '\n');
