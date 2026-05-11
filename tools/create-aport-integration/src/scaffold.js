const fs = require("node:fs/promises");
const path = require("node:path");
const { DEFAULT_POLICY, getTemplates } = require("./templates");

const PROJECT_NAME_PATTERN = /^[a-zA-Z0-9][a-zA-Z0-9._-]*$/;

function normalizePackageName(projectName) {
  const packageName = projectName
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return packageName || "aport-integration";
}

function assertSafeProjectName(projectName) {
  if (!projectName || typeof projectName !== "string") {
    throw new Error("Project name is required.");
  }

  if (projectName.includes("/") || projectName.includes("\\") || projectName.includes("..")) {
    throw new Error("Project name must be a simple directory name.");
  }

  if (!PROJECT_NAME_PATTERN.test(projectName)) {
    throw new Error("Project name may only contain letters, numbers, dots, underscores, and hyphens.");
  }
}

function assertSafeTemplatePath(filePath) {
  if (path.isAbsolute(filePath) || filePath.split(/[\\/]/).includes("..")) {
    throw new Error("Template contains an unsafe file path: " + filePath);
  }
}

async function directoryIsEmpty(targetDir) {
  try {
    const entries = await fs.readdir(targetDir);
    return entries.length === 0;
  } catch (error) {
    if (error.code === "ENOENT") {
      return true;
    }

    throw error;
  }
}

async function writeFile(targetDir, relativePath, content) {
  assertSafeTemplatePath(relativePath);

  const destination = path.join(targetDir, relativePath);
  await fs.mkdir(path.dirname(destination), { recursive: true });
  await fs.writeFile(destination, content);

  return relativePath;
}

function listTemplates() {
  const context = {
    packageName: "example",
    projectName: "example",
    policy: DEFAULT_POLICY,
  };

  return Object.entries(getTemplates(context)).map(([name, template]) => ({
    name,
    description: template.description,
  }));
}

async function scaffoldProject({
  projectName,
  templateName = "express",
  policy = DEFAULT_POLICY,
  cwd = process.cwd(),
  directory,
  force = false,
} = {}) {
  assertSafeProjectName(projectName);

  const packageName = normalizePackageName(projectName);
  const context = {
    packageName,
    projectName,
    policy,
  };
  const templates = getTemplates(context);
  const template = templates[templateName];

  if (!template) {
    throw new Error(
      "Unknown template '" + templateName + "'. Available templates: " + Object.keys(templates).join(", ")
    );
  }

  const targetDir = path.resolve(cwd, directory || projectName);
  const isEmpty = await directoryIsEmpty(targetDir);

  if (!isEmpty && !force) {
    throw new Error("Target directory is not empty. Use --force to overwrite generated files.");
  }

  await fs.mkdir(targetDir, { recursive: true });

  const files = [];
  for (const [relativePath, content] of Object.entries(template.files)) {
    files.push(await writeFile(targetDir, relativePath, content));
  }

  return {
    files,
    packageName,
    projectName,
    targetDir,
    templateName,
  };
}

async function collectFiles(targetDir, parent = "") {
  const entries = await fs.readdir(path.join(targetDir, parent), { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const relativePath = path.join(parent, entry.name);

    if (entry.isDirectory()) {
      files.push(...(await collectFiles(targetDir, relativePath)));
    } else if (entry.isFile()) {
      files.push(relativePath);
    }
  }

  return files;
}

async function validateProject(targetDir) {
  const resolvedTarget = path.resolve(targetDir);
  const files = await collectFiles(resolvedTarget);
  const fileSet = new Set(files);
  const errors = [];

  if (!fileSet.has("README.md")) {
    errors.push("Missing README.md");
  }

  if (!fileSet.has(".env.example")) {
    errors.push("Missing .env.example");
  }

  if (!fileSet.has("package.json") && !fileSet.has("pyproject.toml")) {
    errors.push("Missing package.json or pyproject.toml");
  }

  for (const file of files) {
    const content = await fs.readFile(path.join(resolvedTarget, file), "utf8");
    if (/{{\s*[a-zA-Z0-9_.-]+\s*}}/.test(content)) {
      errors.push("Unresolved template token in " + file);
    }
  }

  return {
    errors,
    files,
    valid: errors.length === 0,
  };
}

module.exports = {
  DEFAULT_POLICY,
  assertSafeProjectName,
  listTemplates,
  normalizePackageName,
  scaffoldProject,
  validateProject,
};
