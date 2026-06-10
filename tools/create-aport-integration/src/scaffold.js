const fs = require("fs");
const path = require("path");

const { getFramework } = require("./frameworks");

function validateProjectName(projectName) {
  if (!projectName || typeof projectName !== "string") {
    throw new Error("Project name is required");
  }

  if (!/^[a-z0-9][a-z0-9._-]*$/i.test(projectName)) {
    throw new Error(
      "Project name can only contain letters, numbers, dots, dashes, and underscores"
    );
  }
}

function validateFramework(framework) {
  if (!getFramework(framework)) {
    throw new Error(`Unsupported framework: ${framework}`);
  }
}

function ensureWritableTarget(targetDir, force = false) {
  if (!fs.existsSync(targetDir)) {
    return;
  }

  const entries = fs.readdirSync(targetDir);
  if (entries.length > 0 && !force) {
    throw new Error(
      `Target directory is not empty: ${targetDir}. Use --force to overwrite generated files.`
    );
  }
}

function writeFile(targetDir, filePath, content) {
  const fullPath = path.join(targetDir, filePath);
  fs.mkdirSync(path.dirname(fullPath), { recursive: true });
  fs.writeFileSync(fullPath, content, "utf8");
}

function scaffoldIntegration(options) {
  const { projectName, framework, directory, force = false } = options;

  validateProjectName(projectName);
  validateFramework(framework);

  const targetDir = path.resolve(directory || projectName);
  ensureWritableTarget(targetDir, force);
  fs.mkdirSync(targetDir, { recursive: true });

  const config = getFramework(framework);
  for (const [filePath, render] of Object.entries(config.files)) {
    writeFile(targetDir, filePath, render({ projectName, framework }));
  }

  return {
    projectName,
    framework,
    targetDir,
    files: Object.keys(config.files),
  };
}

module.exports = {
  scaffoldIntegration,
  validateFramework,
  validateProjectName,
};
