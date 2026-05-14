const assert = require("node:assert/strict");
const test = require("node:test");

const {
  buildTeamContext,
  createResultEmbed,
  handleVerifyCommand,
  parseJsonContext,
} = require("../src/commands");

function createInteraction(overrides = {}) {
  const values = {
    "agent-id": "ap_agent",
    action: "merge_pr",
    policy: "code.repository.merge.v1",
    context: "{\"repository\":\"owner/repo\"}",
    ...overrides.values,
  };
  const interaction = {
    guildId: "guild-1",
    channelId: "channel-1",
    user: {
      id: "user-1",
      username: "reviewer",
    },
    options: {
      getString(name, required) {
        const value = values[name];
        if (required && !value) {
          throw new Error(name + " is required");
        }
        return value || null;
      },
    },
    deferred: false,
    replied: false,
    async deferReply(payload) {
      this.deferred = true;
      this.deferPayload = payload;
    },
    async editReply(payload) {
      this.editPayload = payload;
    },
  };

  return interaction;
}

test("parseJsonContext accepts empty and object values", () => {
  assert.deepEqual(parseJsonContext(""), {});
  assert.deepEqual(parseJsonContext("{\"amount\":50}"), { amount: 50 });
});

test("parseJsonContext rejects invalid values", () => {
  assert.throws(() => parseJsonContext("[]"), /Context must be a JSON object/);
  assert.throws(() => parseJsonContext("{"), /Invalid context JSON/);
});

test("buildTeamContext includes Discord metadata and custom context", () => {
  const context = buildTeamContext(createInteraction(), "merge_pr", {
    repository: "owner/repo",
  });

  assert.equal(context.action, "merge_pr");
  assert.equal(context.repository, "owner/repo");
  assert.equal(context.discord.guildId, "guild-1");
  assert.equal(context.discord.username, "reviewer");
});

test("createResultEmbed builds approval and denial embeds", () => {
  const approved = createResultEmbed({
    allowed: true,
    agentId: "ap_agent",
    policy: "code.repository.merge.v1",
    action: "merge_pr",
  });
  const denied = createResultEmbed({
    allowed: false,
    agentId: "ap_agent",
    policy: "code.repository.merge.v1",
    action: "merge_pr",
    reason: "Denied",
  });

  assert.equal(approved.data.title, "APort verification approved");
  assert.equal(denied.data.title, "APort verification denied");
  assert.equal(denied.data.fields.some((field) => field.name === "Reason"), true);
});

test("handleVerifyCommand defers and edits the Discord reply", async () => {
  const interaction = createInteraction();
  const result = await handleVerifyCommand(interaction, async (request) => {
    assert.equal(request.agentId, "ap_agent");
    assert.equal(request.policy, "code.repository.merge.v1");
    assert.equal(request.context.repository, "owner/repo");

    return {
      allowed: true,
      raw: {},
    };
  });

  assert.equal(result.allowed, true);
  assert.deepEqual(interaction.deferPayload, { ephemeral: true });
  assert.equal(interaction.editPayload.embeds.length, 1);
});
