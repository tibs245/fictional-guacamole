const fs = require('fs');
const path = require('path');

const green = (msg) => `\x1b[32m${msg}\x1b[0m`;
const dim = (msg) => `\x1b[2m${msg}\x1b[0m`;

/**
 * Generates a .mdc rule file for Cursor from a markdown guide.
 * Cursor rules use frontmatter with description, globs, and alwaysApply.
 */
function toMdcRule({ content, description, globs, alwaysApply = false }) {
  const lines = ['---'];
  if (description) lines.push(`description: ${description}`);
  if (globs) lines.push(`globs: ${globs}`);
  lines.push(`alwaysApply: ${alwaysApply}`);
  lines.push('---');
  lines.push('');
  lines.push(content);
  return lines.join('\n');
}

/**
 * Rewrites guide cross-references in the index to point to .cursor/rules/ files.
 * e.g. [01-query-keys](./guides/01-query-keys.md) → .cursor/rules/tanstack-query-01-query-keys.mdc
 */
function rewriteIndexPaths(indexContent, sectionName) {
  return indexContent.replace(
    /\(\.\/guides\/([^)]+)\.md\)/g,
    `(.cursor/rules/${sectionName}-$1.mdc)`,
  );
}

/**
 * Install a section's guides and agents into a Cursor project.
 *
 * Strategy:
 * - Index: auto-attached on src/data/** (lightweight, ~4 Ko)
 * - Each guide: individual .mdc, no glob, picked by the AI via description
 * - Agents: individual .mdc, no glob, picked by the AI via description
 * - Decisions: single .mdc, no glob, manual reference
 */
async function install({ targetDir, sectionDir, sectionName }) {
  const rulesDir = path.join(targetDir, '.cursor', 'rules');
  fs.mkdirSync(rulesDir, { recursive: true });

  // Read section config for globs (default: no glob)
  const sectionConfigFile = path.join(sectionDir, 'section.json');
  const sectionConfig = fs.existsSync(sectionConfigFile)
    ? JSON.parse(fs.readFileSync(sectionConfigFile, 'utf-8'))
    : {};
  const sectionGlobs = sectionConfig.globs;
  const guideGlobs = sectionConfig.guideGlobs || {};

  // 1. Install the index as the only auto-attached rule
  const indexFile = path.join(sectionDir, '00-index.md');
  if (fs.existsSync(indexFile)) {
    const indexContent = fs.readFileSync(indexFile, 'utf-8');
    const rewrittenIndex = rewriteIndexPaths(indexContent, sectionName);

    const ruleContent = toMdcRule({
      content: rewrittenIndex,
      description: `${sectionName} — index and routing table. Read this FIRST to find which guide to load.`,
      globs: sectionGlobs,
      alwaysApply: false,
    });

    const ruleFile = path.join(rulesDir, `${sectionName}-index.mdc`);
    fs.writeFileSync(ruleFile, ruleContent);
    console.log(`  ${green('✓')} ${dim('.cursor/rules/')}${sectionName}-index.mdc ${dim(`(auto-attached on ${sectionGlobs || 'manual'})`)}`);
  }

  // 2. Install each guide as its own rule (no glob — AI picks via description)
  const guidesDir = path.join(sectionDir, 'guides');
  if (fs.existsSync(guidesDir)) {
    const guideFiles = fs
      .readdirSync(guidesDir)
      .filter((f) => f.endsWith('.md'))
      .sort();

    for (const guideFile of guideFiles) {
      const guideContent = fs.readFileSync(
        path.join(guidesDir, guideFile),
        'utf-8',
      );

      // Extract title from first # heading
      const titleMatch = guideContent.match(/^#\s+(.+)$/m);
      const title = titleMatch ? titleMatch[1] : guideFile.replace('.md', '');

      // Check if this guide has its own glob pattern (e.g., test files)
      const guideKey = guideFile.replace('.md', '');
      const guideGlob = guideGlobs[guideKey];

      const ruleName = `${sectionName}-${guideKey}.mdc`;
      const ruleContent = toMdcRule({
        content: guideContent,
        description: `${sectionName} guide: ${title}`,
        globs: guideGlob,
        alwaysApply: false,
      });

      const ruleFilePath = path.join(rulesDir, ruleName);
      fs.writeFileSync(ruleFilePath, ruleContent);
      const globInfo = guideGlob ? dim(` (auto-attached on ${guideGlob})`) : '';
      console.log(`  ${green('✓')} ${dim('.cursor/rules/')}${ruleName}${globInfo}`);
    }
  }

  // 3. Install agents as individual rule files (no glob — AI picks via description)
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

      const titleMatch = agentContent.match(/^#\s+(.+)$/m);
      const description = titleMatch
        ? titleMatch[1]
        : agentFile.replace('.md', '');

      const ruleContent = toMdcRule({
        content: agentContent,
        description: `Agent: ${description}`,
        alwaysApply: false,
      });

      const ruleName = `${sectionName}-${agentFile.replace('.md', '')}.mdc`;
      const ruleFilePath = path.join(rulesDir, ruleName);
      fs.writeFileSync(ruleFilePath, ruleContent);
      console.log(`  ${green('✓')} ${dim('.cursor/rules/')}${ruleName}`);
    }
  }

  // 4. Install decisions as a single rule file (no glob — manual reference)
  const decisionsDir = path.join(sectionDir, 'decisions');
  if (fs.existsSync(decisionsDir)) {
    const decisionFiles = fs
      .readdirSync(decisionsDir)
      .filter((f) => f.endsWith('.md'))
      .sort();

    const decisionsContent = decisionFiles
      .map((f) => fs.readFileSync(path.join(decisionsDir, f), 'utf-8'))
      .join('\n\n---\n\n');

    const ruleContent = toMdcRule({
      content: decisionsContent,
      description: `${sectionName} — architecture decision records (ADRs)`,
      alwaysApply: false,
    });

    const ruleFile = path.join(rulesDir, `${sectionName}-decisions.mdc`);
    fs.writeFileSync(ruleFile, ruleContent);
    console.log(
      `  ${green('✓')} ${dim('.cursor/rules/')}${sectionName}-decisions.mdc`,
    );
  }
}

module.exports = { install };
