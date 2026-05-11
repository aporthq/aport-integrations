import * as vscode from "vscode";

const APORT_DOCS_URL = "https://aport.io/docs";

const POLICY_PACKS = [
  {
    label: "finance.payment.refund.v1",
    detail: "Refund processing policy pack",
    documentation: "Use for refund approvals, per-transaction limits, and payment workflow checks."
  },
  {
    label: "data.export.v1",
    detail: "Data export policy pack",
    documentation: "Use before exporting rows, datasets, or customer records."
  },
  {
    label: "code.repository.merge.v1",
    detail: "Repository merge policy pack",
    documentation: "Use before allowing an agent to merge pull requests or update protected branches."
  },
  {
    label: "admin.access.v1",
    detail: "Administrative access policy pack",
    documentation: "Use for privileged admin actions and elevated assurance workflows."
  }
];

const APORT_KEYS = [
  ["agent_id", "Agent passport identifier, for example agt_inst_refund_bot_123"],
  ["policy_pack", "Policy pack identifier used for verification"],
  ["context", "Runtime facts passed into a verification request"],
  ["capabilities", "Allowed actions for an agent passport"],
  ["limits", "Numeric or scoped limits applied to an agent passport"],
  ["verification_level", "Assurance level required for the policy or passport"],
  ["expires_at", "ISO-8601 expiry timestamp"],
  ["metadata", "Additional integration metadata"]
] as const;

const CAPABILITIES = [
  "refund:create",
  "refund:approve",
  "data:export",
  "repository:merge",
  "admin:access",
  "message:send"
];

export function activate(context: vscode.ExtensionContext): void {
  context.subscriptions.push(
    vscode.commands.registerCommand("aport.openDocs", async () => {
      await vscode.env.openExternal(vscode.Uri.parse(APORT_DOCS_URL));
    })
  );

  const selector: vscode.DocumentSelector = [
    { language: "aport-policy" },
    { language: "json" },
    { language: "jsonc" },
    { language: "yaml" }
  ];

  context.subscriptions.push(
    vscode.languages.registerCompletionItemProvider(
      selector,
      new APortCompletionProvider(),
      "\"",
      ":",
      "."
    )
  );
}

export function deactivate(): void {
  // VS Code disposes all registered subscriptions for this extension.
}

class APortCompletionProvider implements vscode.CompletionItemProvider {
  provideCompletionItems(document: vscode.TextDocument): vscode.CompletionItem[] {
    if (!isLikelyAPortDocument(document)) {
      return [];
    }

    return [
      ...APORT_KEYS.map(([key, detail]) => createKeyCompletion(key, detail)),
      ...POLICY_PACKS.map(createPolicyPackCompletion),
      ...CAPABILITIES.map(createCapabilityCompletion),
      createVerifySnippetCompletion()
    ];
  }
}

function isLikelyAPortDocument(document: vscode.TextDocument): boolean {
  if (document.languageId === "aport-policy") {
    return true;
  }

  const fileName = document.fileName.toLowerCase();
  if (
    fileName.endsWith(".aport.json") ||
    fileName.endsWith(".aport-policy.json") ||
    fileName.endsWith(".aport-passport.json") ||
    fileName.endsWith("aport.policy.json") ||
    fileName.endsWith("aport.passport.json")
  ) {
    return true;
  }

  const sample = document.getText(new vscode.Range(0, 0, Math.min(document.lineCount, 80), 0));
  return /policy_pack|agent_id|aport|passport|capabilities/.test(sample.toLowerCase());
}

function createKeyCompletion(label: string, detail: string): vscode.CompletionItem {
  const item = new vscode.CompletionItem(label, vscode.CompletionItemKind.Property);
  item.detail = detail;
  item.insertText = new vscode.SnippetString(`"${label}": $1`);
  item.documentation = new vscode.MarkdownString(detail);
  return item;
}

function createPolicyPackCompletion(policy: (typeof POLICY_PACKS)[number]): vscode.CompletionItem {
  const item = new vscode.CompletionItem(policy.label, vscode.CompletionItemKind.Value);
  item.detail = policy.detail;
  item.insertText = `"${policy.label}"`;
  item.documentation = new vscode.MarkdownString(policy.documentation);
  return item;
}

function createCapabilityCompletion(capability: string): vscode.CompletionItem {
  const item = new vscode.CompletionItem(capability, vscode.CompletionItemKind.EnumMember);
  item.detail = "APort passport capability";
  item.insertText = `"${capability}"`;
  item.documentation = new vscode.MarkdownString(`Adds the \`${capability}\` capability to an APort passport or policy context.`);
  return item;
}

function createVerifySnippetCompletion(): vscode.CompletionItem {
  const item = new vscode.CompletionItem("aport verification request", vscode.CompletionItemKind.Snippet);
  item.detail = "Create a JSON verification request";
  item.insertText = new vscode.SnippetString([
    "{",
    "\t\"agent_id\": \"${1:agt_inst_refund_bot_123}\",",
    "\t\"policy_pack\": \"${2:finance.payment.refund.v1}\",",
    "\t\"context\": {",
    "\t\t\"amount\": ${3:50},",
    "\t\t\"currency\": \"${4:USD}\"",
    "\t}",
    "}"
  ].join("\n"));
  return item;
}
