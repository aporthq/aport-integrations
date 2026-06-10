const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const test = require("node:test");

const { scaffoldIntegration } = require("../src/scaffold");

function makeTempDir() {
  return fs.mkdtempSync(path.join(os.tmpdir(), "aport-create-"));
}

test("scaffolds an Express integration", () => {
  const targetDir = path.join(makeTempDir(), "refund-guard");
  const result = scaffoldIntegration({
    projectName: "refund-guard",
    framework: "express",
    directory: targetDir,
  });

  assert.equal(result.framework, "express");
  assert.ok(fs.existsSync(path.join(targetDir, "package.json")));
  assert.ok(fs.existsSync(path.join(targetDir, "src", "server.js")));
  assert.match(
    fs.readFileSync(path.join(targetDir, "src", "server.js"), "utf8"),
    /protected-action/
  );
});

test("scaffolds a Next.js integration", () => {
  const targetDir = path.join(makeTempDir(), "merge-check");
  scaffoldIntegration({
    projectName: "merge-check",
    framework: "nextjs",
    directory: targetDir,
  });

  assert.ok(
    fs.existsSync(path.join(targetDir, "app", "api", "protected-action", "route.js"))
  );
});

test("scaffolds a Django integration", () => {
  const targetDir = path.join(makeTempDir(), "admin-approval");
  scaffoldIntegration({
    projectName: "admin-approval",
    framework: "django",
    directory: targetDir,
  });

  assert.ok(fs.existsSync(path.join(targetDir, "manage.py")));
  assert.ok(fs.existsSync(path.join(targetDir, "aport_example", "views.py")));
});

test("rejects unsupported frameworks", () => {
  assert.throws(
    () =>
      scaffoldIntegration({
        projectName: "demo",
        framework: "rails",
        directory: path.join(makeTempDir(), "demo"),
      }),
    /Unsupported framework/
  );
});

test("protects non-empty directories unless force is set", () => {
  const targetDir = makeTempDir();
  fs.writeFileSync(path.join(targetDir, "existing.txt"), "keep");

  assert.throws(
    () =>
      scaffoldIntegration({
        projectName: "demo",
        framework: "express",
        directory: targetDir,
      }),
    /not empty/
  );
});
