#!/usr/bin/env node

const readline = require('readline');
const path = require('path');
const fs = require('fs');

const SECTIONS = {
  'tanstack-query': {
    name: 'TanStack Query',
    description: 'Guides, decisions, and agents for TanStack Query v5',
  },
  'project-structure': {
    name: 'Project Structure',
    description: 'Page architecture, components/hooks organization, testing strategy',
  },
};

const IDES = {
  cursor: {
    name: 'Cursor',
    installer: './cursor.js',
  },
  copilot: {
    name: 'GitHub Copilot',
    installer: './copilot.js',
  },
};

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

const ask = (question) =>
  new Promise((resolve) => rl.question(question, resolve));

const print = (msg) => console.log(msg);
const bold = (msg) => `\x1b[1m${msg}\x1b[0m`;
const green = (msg) => `\x1b[32m${msg}\x1b[0m`;
const cyan = (msg) => `\x1b[36m${msg}\x1b[0m`;
const dim = (msg) => `\x1b[2m${msg}\x1b[0m`;

async function main() {
  print('');
  print(bold('🔧 AI Rules — Installer'));
  print(dim('Install AI guides, rules, and agents into your project.\n'));

  // Step 1: Target directory
  const targetInput = await ask(
    `${bold('Where to install?')} ${dim('(default: .)')}: `,
  );
  const targetDir = path.resolve(process.cwd(), targetInput || '.');

  if (!fs.existsSync(targetDir)) {
    print(`\n❌ Directory not found: ${targetDir}`);
    rl.close();
    process.exit(1);
  }

  // Step 2: Select sections
  print(`\n${bold('Available sections:')}`);
  const sectionKeys = Object.keys(SECTIONS);
  sectionKeys.forEach((key, i) => {
    print(`  ${cyan(`${i + 1})`)} ${SECTIONS[key].name} — ${dim(SECTIONS[key].description)}`);
  });
  print(`  ${cyan(`${sectionKeys.length + 1})`)} All`);

  const sectionInput = await ask(
    `\n${bold('Which sections?')} ${dim(`(1-${sectionKeys.length + 1}, comma-separated)`)}: `,
  );

  let selectedSections;
  const sectionChoices = sectionInput
    .split(',')
    .map((s) => parseInt(s.trim(), 10));

  if (sectionChoices.includes(sectionKeys.length + 1)) {
    selectedSections = sectionKeys;
  } else {
    selectedSections = sectionChoices
      .filter((n) => n >= 1 && n <= sectionKeys.length)
      .map((n) => sectionKeys[n - 1]);
  }

  if (selectedSections.length === 0) {
    print('\n❌ No sections selected.');
    rl.close();
    process.exit(1);
  }

  print(
    `\n${green('✓')} Selected: ${selectedSections.map((s) => SECTIONS[s].name).join(', ')}`,
  );

  // Step 3: Select IDE
  print(`\n${bold('Target IDE:')}`);
  const ideKeys = Object.keys(IDES);
  ideKeys.forEach((key, i) => {
    print(`  ${cyan(`${i + 1})`)} ${IDES[key].name}`);
  });

  const ideInput = await ask(`\n${bold('Which IDE?')} ${dim(`(1-${ideKeys.length})`)}: `);
  const ideChoice = parseInt(ideInput.trim(), 10);

  if (ideChoice < 1 || ideChoice > ideKeys.length) {
    print('\n❌ Invalid IDE selection.');
    rl.close();
    process.exit(1);
  }

  const selectedIde = ideKeys[ideChoice - 1];
  print(`\n${green('✓')} IDE: ${IDES[selectedIde].name}`);

  // Step 4: Install
  print(`\n${bold('Installing...')}\n`);

  const packageRoot = path.resolve(__dirname, '..');
  const installerPath = path.resolve(
    packageRoot,
    'installers',
    IDES[selectedIde].installer,
  );

  const installer = require(installerPath);

  for (const section of selectedSections) {
    const sectionDir = path.resolve(packageRoot, 'sections', section);
    await installer.install({ targetDir, sectionDir, sectionName: section });
  }

  print(`\n${green(bold('✓ Done!'))}`);
  print(dim(`Rules installed in ${targetDir}\n`));

  rl.close();
}

main().catch((err) => {
  console.error('Error:', err.message);
  rl.close();
  process.exit(1);
});
