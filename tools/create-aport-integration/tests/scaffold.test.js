const assert = require("node:assert/strict");
const fs = require("node:fs/promises");
const os = require("node:os");
const path = require("node:path");
const test = require("node:test");

const {
  listTemplates,
  normalizePackageName,
  scaffoldProject,
  validateProject,
} = require("../src/scaffold");

async function withTempDir(callback) {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "aport-create-"));

  try {
    return await callback(tempDir);
  } finally {
    await fs.rm(tempDir, { recursive: true, force: true });
  }
}

test("lists the supported framework templates", () => {
  assert.deepEqual(
    listTemplates().map((template) => template.name),
    ["express", "nextjs", "fastapi"]
  );
});

test("normalizes project names for package metadata", () => {
  assert.equal(normalizePackageName("Refund Guard"), "refund-guard");
  assert.equal(normalizePackageName("APort_API"), "aport_api");
});

test("scaffolds an Express starter", async () => {
  await withTempDir(async (cwd) => {
    const result = await scaffoldProject({
      cwd,
      projectName: "refund-api",
      templateName: "express",
      policy: "finance.payment.refund.v1",
    });

    assert.equal(result.files.length, 5);
    assert.ok(result.files.includes("src/server.js"));
    assert.ok(result.files.includes("src/aport.js"));

    const server = await fs.readFile(path.join(result.targetDir, "src/server.js"), "utf8");
    assert.match(server, /requireAportPolicy/);

    const validation = await validateProject(result.targetDir);
    assert.equal(validation.valid, true);
  });
});

test("scaffolds a Next.js starter", async () => {
  await withTempDir(async (cwd) => {
    const result = await scaffoldProject({
      cwd,
      projectName: "refund-web",
      templateName: "nextjs",
      policy: "finance.payment.refund.v1",
    });

    assert.ok(result.files.includes("app/api/refunds/route.js"));
    assert.ok(result.files.includes("app/page.js"));

    const route = await fs.readFile(path.join(result.targetDir, "app/api/refunds/route.js"), "utf8");
    assert.match(route, /NextResponse/);

    const validation = await validateProject(result.targetDir);
    assert.equal(validation.valid, true);
  });
});

test("scaffolds a FastAPI starter", async () => {
  await withTempDir(async (cwd) => {
    const result = await scaffoldProject({
      cwd,
      projectName: "refund-service",
      templateName: "fastapi",
      policy: "finance.payment.refund.v1",
    });

    assert.ok(result.files.includes("app/main.py"));
    assert.ok(result.files.includes("pyproject.toml"));

    const app = await fs.readFile(path.join(result.targetDir, "app/main.py"), "utf8");
    assert.match(app, /FastAPI/);

    const validation = await validateProject(result.targetDir);
    assert.equal(validation.valid, true);
  });
});

test("rejects unknown templates and unsafe project names", async () => {
  await withTempDir(async (cwd) => {
    await assert.rejects(
      () => scaffoldProject({ cwd, projectName: "../escape", templateName: "express" }),
      /simple directory name/
    );

    await assert.rejects(
      () => scaffoldProject({ cwd, projectName: "refund-api", templateName: "unknown" }),
      /Unknown template/
    );
  });
});

test("refuses to write into a non-empty directory unless forced", async () => {
  await withTempDir(async (cwd) => {
    const target = path.join(cwd, "refund-api");
    await fs.mkdir(target);
    await fs.writeFile(path.join(target, "existing.txt"), "keep me");

    await assert.rejects(
      () => scaffoldProject({ cwd, projectName: "refund-api", templateName: "express" }),
      /not empty/
    );

    const result = await scaffoldProject({
      cwd,
      projectName: "refund-api",
      templateName: "express",
      force: true,
    });

    assert.ok(result.files.includes("README.md"));
    assert.equal(await fs.readFile(path.join(target, "existing.txt"), "utf8"), "keep me");
  });
});
