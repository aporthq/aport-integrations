const assert = require("node:assert/strict");
const { execFile, spawn } = require("node:child_process");
const fs = require("node:fs/promises");
const os = require("node:os");
const path = require("node:path");
const { promisify } = require("node:util");
const test = require("node:test");

const execFileAsync = promisify(execFile);
const cliPath = path.resolve(__dirname, "../src/index.js");

async function withTempDir(callback) {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "aport-cli-"));

  try {
    return await callback(tempDir);
  } finally {
    await fs.rm(tempDir, { recursive: true, force: true });
  }
}

test("list command prints available templates", async () => {
  const { stdout } = await execFileAsync("node", [cliPath, "list"]);

  assert.match(stdout, /express/);
  assert.match(stdout, /nextjs/);
  assert.match(stdout, /fastapi/);
});

test("CLI creates and validates a starter project", async () => {
  await withTempDir(async (cwd) => {
    await execFileAsync("node", [cliPath, "refund-api", "--template", "express"], { cwd });
    const { stdout } = await execFileAsync("node", [cliPath, "validate", path.join(cwd, "refund-api")]);

    assert.match(stdout, /Valid generated project/);
  });
});

test("interactive mode prompts for starter settings", async () => {
  await withTempDir(async (cwd) => {
    const child = spawn("node", [cliPath, "--interactive"], { cwd });
    const prompts = [
      { text: "Project name", answer: "refund-web\n" },
      { text: "Template", answer: "nextjs\n" },
      { text: "APort policy pack", answer: "data.export.v1\n" },
      { text: "Output directory", answer: "\n" },
      { text: "Overwrite generated files", answer: "N\n" },
    ];
    let stdout = "";
    let stderr = "";

    child.stdout.on("data", (chunk) => {
      stdout += chunk.toString();

      while (prompts.length > 0 && stdout.includes(prompts[0].text)) {
        child.stdin.write(prompts.shift().answer);

        if (prompts.length === 0) {
          child.stdin.end();
        }
      }
    });
    child.stderr.on("data", (chunk) => {
      stderr += chunk.toString();
    });

    await new Promise((resolve, reject) => {
      child.on("error", reject);
      child.on("exit", (code) => {
        if (code === 0) {
          resolve();
          return;
        }

        reject(new Error("CLI exited with code " + code + "\n" + stdout + stderr));
      });
    });

    const env = await fs.readFile(path.join(cwd, "refund-web", ".env.example"), "utf8");
    assert.match(env, /APORT_POLICY=data.export.v1/);
    assert.ok(await fs.stat(path.join(cwd, "refund-web", "app/api/refunds/route.js")));
  });
});
