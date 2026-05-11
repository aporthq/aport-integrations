const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");

function readJson(relativePath) {
  return JSON.parse(fs.readFileSync(path.join(root, relativePath), "utf8"));
}

const manifest = readJson("package.json");

assert.equal(manifest.main, "./out/extension.js");
assert.ok(manifest.contributes.commands.some((command) => command.command === "aport.openDocs"));
assert.ok(manifest.contributes.languages.some((language) => language.id === "aport-policy"));
assert.ok(manifest.contributes.grammars.some((grammar) => grammar.language === "aport-policy"));
assert.ok(manifest.contributes.jsonValidation.length >= 2);
assert.ok(manifest.contributes.snippets.length >= 5);

const policySchema = readJson("schemas/aport-policy.schema.json");
const passportSchema = readJson("schemas/aport-passport.schema.json");

assert.equal(policySchema.required[0], "policy_pack");
assert.deepEqual(passportSchema.required, ["agent_id", "name", "capabilities"]);

for (const snippet of manifest.contributes.snippets) {
  const snippetFile = path.join(root, snippet.path);
  assert.ok(fs.existsSync(snippetFile), `${snippet.path} should exist`);
  JSON.parse(fs.readFileSync(snippetFile, "utf8"));
}

const examples = [
  "examples/refund-policy.aport.json",
  "examples/passport.aport-passport.json"
];

for (const example of examples) {
  JSON.parse(fs.readFileSync(path.join(root, example), "utf8"));
}

console.log("VS Code extension manifest, schemas, snippets, and examples are valid.");
