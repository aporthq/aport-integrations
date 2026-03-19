const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

const CLI = path.join(__dirname, "../src/index.js");

function run(args) {
  return execSync(`node ${CLI} ${args}`, { cwd: __dirname, encoding: "utf-8", timeout: 10000 });
}

function cleanup(dir) {
  const p = path.join(__dirname, dir);
  if (fs.existsSync(p)) fs.rmSync(p, { recursive: true });
}

describe("create-aport-integration", () => {
  afterAll(() => {
    ["test-express", "test-nextjs", "test-fastapi"].forEach(cleanup);
  });

  test("scaffolds express template", () => {
    cleanup("test-express");
    const output = run("test-express --template express");
    expect(output).toContain("Created test-express");
    expect(fs.existsSync(path.join(__dirname, "test-express/package.json"))).toBe(true);
    expect(fs.existsSync(path.join(__dirname, "test-express/src/index.js"))).toBe(true);
    expect(fs.existsSync(path.join(__dirname, "test-express/.env.example"))).toBe(true);
  });

  test("scaffolds nextjs template", () => {
    cleanup("test-nextjs");
    const output = run("test-nextjs --template nextjs");
    expect(output).toContain("Created test-nextjs");
    expect(fs.existsSync(path.join(__dirname, "test-nextjs/src/middleware.ts"))).toBe(true);
  });

  test("scaffolds fastapi template", () => {
    cleanup("test-fastapi");
    const output = run("test-fastapi --template fastapi");
    expect(output).toContain("Created test-fastapi");
    expect(fs.existsSync(path.join(__dirname, "test-fastapi/pyproject.toml"))).toBe(true);
  });

  test("fails on existing directory", () => {
    cleanup("test-express");
    run("test-express --template express");
    expect(() => run("test-express --template express")).toThrow(/already exists/);
  });

  test("fails on unknown template", () => {
    expect(() => run("bad-name --template unknown")).toThrow(/Unknown template/);
  });
});
