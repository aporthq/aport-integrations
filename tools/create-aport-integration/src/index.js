#!/usr/bin/env node

const { Command } = require("commander");
const readline = require("node:readline/promises");
const { stdin: input, stdout: output } = require("node:process");
const {
  DEFAULT_POLICY,
  listTemplates,
  scaffoldProject,
  validateProject,
} = require("./scaffold");

const program = new Command();

async function ask(rl, question, defaultValue) {
  const suffix = defaultValue ? " (" + defaultValue + ")" : "";
  const answer = await rl.question(question + suffix + ": ");
  return answer.trim() || defaultValue;
}

async function askForInitOptions(projectName, options) {
  if (!options.interactive) {
    return {
      projectName,
      options,
    };
  }

  const templateNames = listTemplates().map((template) => template.name);
  const answers = {
    ...options,
  };
  const rl = readline.createInterface({ input, output });

  try {
    const resolvedProjectName = projectName || (await ask(rl, "Project name", "my-aport-integration"));
    answers.template = await ask(rl, "Template [" + templateNames.join("/") + "]", options.template);
    answers.policy = await ask(rl, "APort policy pack", options.policy);
    answers.directory = await ask(rl, "Output directory", options.directory || resolvedProjectName);

    const forceAnswer = await ask(rl, "Overwrite generated files if the directory is not empty? [y/N]", "N");
    answers.force = /^y(es)?$/i.test(forceAnswer);

    return {
      projectName: resolvedProjectName,
      options: answers,
    };
  } finally {
    rl.close();
  }
}

async function createProject(projectName, options) {
  const init = await askForInitOptions(projectName, options);
  const result = await scaffoldProject({
    projectName: init.projectName,
    templateName: init.options.template,
    policy: init.options.policy,
    directory: init.options.directory,
    force: Boolean(init.options.force),
  });

  console.log("Created APort integration starter:");
  console.log("  Project: " + result.projectName);
  console.log("  Template: " + result.templateName);
  console.log("  Directory: " + result.targetDir);
  console.log("  Files: " + result.files.length);
  console.log("");
  console.log("Next steps:");
  console.log("  cd " + result.targetDir);
  console.log("  cp .env.example " + (result.templateName === "nextjs" ? ".env.local" : ".env"));
  console.log("  install dependencies and start the app");
}

function addInitOptions(command) {
  return command
    .option("-t, --template <name>", "Template to use: express, nextjs, or fastapi", "express")
    .option("-p, --policy <policy>", "Default APort policy pack", DEFAULT_POLICY)
    .option("-d, --directory <path>", "Output directory. Defaults to the project name.")
    .option("-i, --interactive", "Prompt for project settings")
    .option("-f, --force", "Overwrite generated files in a non-empty directory");
}

program
  .name("create-aport-integration")
  .description("Scaffold APort integrations for common web frameworks")
  .version("0.1.0")
  .showHelpAfterError();

addInitOptions(program.argument("[project-name]", "Project directory name")).action(async (projectName, options) => {
  if (!projectName && !options.interactive) {
    program.help();
    return;
  }

  await createProject(projectName, options);
});

const initCommand = addInitOptions(
  program.command("init").description("Create a new APort integration starter").argument("[project-name]")
);

initCommand.action(async (projectName, options) => {
  if (!projectName && !options.interactive) {
    initCommand.help();
    return;
  }

  await createProject(projectName, options);
});

program
  .command("list")
  .description("List available templates")
  .action(() => {
    for (const template of listTemplates()) {
      console.log(template.name + " - " + template.description);
    }
  });

program
  .command("validate")
  .description("Validate a generated starter project")
  .argument("<directory>")
  .action(async (directory) => {
    const result = await validateProject(directory);

    if (result.valid) {
      console.log("Valid generated project (" + result.files.length + " files checked)");
      return;
    }

    console.error("Invalid generated project:");
    for (const error of result.errors) {
      console.error("  - " + error);
    }

    process.exitCode = 1;
  });

program.parseAsync(process.argv).catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
