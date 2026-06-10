#!/usr/bin/env node
const readline = require("readline/promises");
const { stdin: input, stdout: output } = require("process");

const { listFrameworks } = require("./frameworks");
const { scaffoldIntegration } = require("./scaffold");

function parseArgs(argv) {
  const args = {
    projectName: null,
    framework: null,
    directory: null,
    force: false,
    yes: false,
    help: false,
  };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--framework" || arg === "-f") {
      args.framework = argv[++i];
    } else if (arg === "--directory" || arg === "-d") {
      args.directory = argv[++i];
    } else if (arg === "--force") {
      args.force = true;
    } else if (arg === "--yes" || arg === "-y") {
      args.yes = true;
    } else if (arg === "--help" || arg === "-h") {
      args.help = true;
    } else if (!args.projectName) {
      args.projectName = arg;
    } else {
      throw new Error(`Unexpected argument: ${arg}`);
    }
  }

  return args;
}

function printHelp() {
  console.log(`create-aport-integration

Usage:
  npx create-aport-integration my-app --framework express
  npx create-aport-integration my-app --framework nextjs --directory ./apps/my-app

Options:
  -f, --framework <name>   Framework to scaffold: express, nextjs, django
  -d, --directory <path>   Target directory. Defaults to project name
  -y, --yes                Use defaults for missing options
      --force              Allow writing into a non-empty directory
  -h, --help               Show this help
`);
}

async function promptForMissingOptions(args) {
  if (args.yes) {
    return {
      ...args,
      projectName: args.projectName || "aport-integration",
      framework: args.framework || "express",
    };
  }

  const rl = readline.createInterface({ input, output });
  try {
    const next = { ...args };

    if (!next.projectName) {
      next.projectName = (await rl.question("Project name: ")).trim();
    }

    if (!next.framework) {
      const choices = listFrameworks()
        .map((item, index) => `${index + 1}) ${item.value} - ${item.label}`)
        .join("\n");
      const answer = (
        await rl.question(`Choose a framework:\n${choices}\nFramework: `)
      ).trim();
      const selected = listFrameworks()[Number(answer) - 1];
      next.framework = selected ? selected.value : answer;
    }

    return next;
  } finally {
    rl.close();
  }
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    printHelp();
    return;
  }

  const options = await promptForMissingOptions(args);
  const result = scaffoldIntegration(options);

  console.log(`Created ${result.framework} APort integration at ${result.targetDir}`);
  console.log("Files:");
  for (const file of result.files) {
    console.log(`  - ${file}`);
  }
  console.log("\nNext steps:");
  console.log(`  cd ${result.targetDir}`);
  console.log("  cp .env.example .env");
  console.log("  follow the generated README.md");
}

main().catch((error) => {
  console.error(`Error: ${error.message}`);
  process.exit(1);
});

module.exports = {
  parseArgs,
  promptForMissingOptions,
};
