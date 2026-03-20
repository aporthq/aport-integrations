#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const { prompt, promptApiKey } = require('./prompts');
const { getTemplate } = require('./templates');

const TEMPLATES = ['fastapi', 'flask', 'django', 'express', 'nextjs'];

function parseArgs() {
  const args = process.argv.slice(2);
  let template = null;
  let outDir = '.';
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--template' && args[i + 1]) template = args[++i];
    else if (!args[i].startsWith('-')) outDir = args[i];
  }
  return { template, outDir };
}

function writeFiles(outDir, files) {
  const base = path.resolve(outDir);
  for (const [rel, content] of Object.entries(files)) {
    const fp = path.join(base, rel);
    fs.mkdirSync(path.dirname(fp), { recursive: true });
    fs.writeFileSync(fp, content, 'utf8');
  }
}

async function main() {
  console.log('\n🚀 APort Integration Setup\n');

  const { template: cliTemplate, outDir: cliDir } = parseArgs();
  let template = cliTemplate;
  let outDir = cliDir;
  let apiKey = '';

  if (template && !TEMPLATES.includes(template)) {
    console.error(`❌ Unknown template "${template}". Available: ${TEMPLATES.join(', ')}`);
    process.exit(1);
  }

  if (!template) {
    template = await prompt('Pick a framework template:', TEMPLATES);
  }

  if (outDir === '.') {
    const name = await prompt('Project directory name:', 'my-aport-app');
    outDir = name;
  }

  const envAnswer = await prompt('Enter your APort API key (leave blank to configure later):', '');
  apiKey = envAnswer.trim();

  console.log(`\n📦 Scaffolding ${template} project in ./${outDir}...\n`);

  const files = getTemplate(template, apiKey);
  writeFiles(outDir, files);

  console.log('✅ Project created successfully!\n');
  if (!apiKey) {
    console.log('⚠️  Remember to set APORT_API_KEY in your .env file before running.\n');
  }
  console.log('Next steps:');
  console.log(`  cd ${outDir}`);
  if (template === 'express' || template === 'nextjs') {
    console.log('  npm install');
  } else {
    console.log('  pip install -r requirements.txt');
  }
  console.log('  # Edit .env with your APort API key');
  console.log('  # Start the server and visit /protected to test\n');
}

main().catch((e) => {
  console.error('❌', e.message);
  process.exit(1);
});
