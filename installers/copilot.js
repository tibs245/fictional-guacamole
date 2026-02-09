const fs = require('fs');
const path = require('path');

const green = (msg) => `\x1b[32m${msg}\x1b[0m`;
const dim = (msg) => `\x1b[2m${msg}\x1b[0m`;

/**
 * Install a section's guides and agents for GitHub Copilot.
 *
 * Copilot uses:
 * - .github/copilot-instructions.md  — global instructions (always active)
 * - .github/instructions/*.md         — scoped instruction files (with applyTo frontmatter)
 *
 * @see https://docs.github.com/en/copilot/customizing-copilot/adding-repository-custom-instructions
 */
async function install({ targetDir, sectionDir, sectionName }) {
  const instructionsDir = path.join(targetDir, '.github', 'instructions');
  fs.mkdirSync(instructionsDir, { recursive: true });

  // 1. Install guides as a scoped instruction file (attached to src/data/**)
  const guidesDir = path.join(sectionDir, 'guides');
  if (fs.existsSync(guidesDir)) {
    const indexFile = path.join(sectionDir, '00-index.md');
    const indexContent = fs.existsSync(indexFile)
      ? fs.readFileSync(indexFile, 'utf-8')
      : '';

    const guideFiles = fs
      .readdirSync(guidesDir)
      .filter((f) => f.endsWith('.md'))
      .sort();

    const guidesContent = guideFiles
      .map((f) => fs.readFileSync(path.join(guidesDir, f), 'utf-8'))
      .join('\n\n---\n\n');

    const fileContent = [
      '---',
      'applyTo: "src/data/**"',
      '---',
      '',
      indexContent,
      '',
      '---',
      '',
      guidesContent,
    ].join('\n');

    const filePath = path.join(
      instructionsDir,
      `${sectionName}-guides.instructions.md`,
    );
    fs.writeFileSync(filePath, fileContent);
    console.log(
      `  ${green('✓')} ${dim('.github/instructions/')}${sectionName}-guides.instructions.md`,
    );
  }

  // 2. Install agents as individual instruction files
  const agentsDir = path.join(sectionDir, 'agents');
  if (fs.existsSync(agentsDir)) {
    const agentFiles = fs
      .readdirSync(agentsDir)
      .filter((f) => f.endsWith('.md'));

    for (const agentFile of agentFiles) {
      const agentContent = fs.readFileSync(
        path.join(agentsDir, agentFile),
        'utf-8',
      );

      const fileContent = [
        '---',
        'applyTo: "src/data/**"',
        '---',
        '',
        agentContent,
      ].join('\n');

      const fileName = `${sectionName}-${agentFile.replace('.md', '')}.instructions.md`;
      const filePath = path.join(instructionsDir, fileName);
      fs.writeFileSync(filePath, fileContent);
      console.log(`  ${green('✓')} ${dim('.github/instructions/')}${fileName}`);
    }
  }

  // 3. Install decisions as a single instruction file
  const decisionsDir = path.join(sectionDir, 'decisions');
  if (fs.existsSync(decisionsDir)) {
    const decisionFiles = fs
      .readdirSync(decisionsDir)
      .filter((f) => f.endsWith('.md'))
      .sort();

    const decisionsContent = decisionFiles
      .map((f) => fs.readFileSync(path.join(decisionsDir, f), 'utf-8'))
      .join('\n\n---\n\n');

    const fileContent = [
      '---',
      'applyTo: "src/data/**"',
      '---',
      '',
      decisionsContent,
    ].join('\n');

    const filePath = path.join(
      instructionsDir,
      `${sectionName}-decisions.instructions.md`,
    );
    fs.writeFileSync(filePath, fileContent);
    console.log(
      `  ${green('✓')} ${dim('.github/instructions/')}${sectionName}-decisions.instructions.md`,
    );
  }
}

module.exports = { install };
