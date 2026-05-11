"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.activate = activate;
exports.deactivate = deactivate;
const vscode = __importStar(require("vscode"));
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
];
const CAPABILITIES = [
    "refund:create",
    "refund:approve",
    "data:export",
    "repository:merge",
    "admin:access",
    "message:send"
];
function activate(context) {
    context.subscriptions.push(vscode.commands.registerCommand("aport.openDocs", async () => {
        await vscode.env.openExternal(vscode.Uri.parse(APORT_DOCS_URL));
    }));
    const selector = [
        { language: "aport-policy" },
        { language: "json" },
        { language: "jsonc" },
        { language: "yaml" }
    ];
    context.subscriptions.push(vscode.languages.registerCompletionItemProvider(selector, new APortCompletionProvider(), "\"", ":", "."));
}
function deactivate() {
    // VS Code disposes all registered subscriptions for this extension.
}
class APortCompletionProvider {
    provideCompletionItems(document) {
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
function isLikelyAPortDocument(document) {
    if (document.languageId === "aport-policy") {
        return true;
    }
    const fileName = document.fileName.toLowerCase();
    if (fileName.endsWith(".aport.json") ||
        fileName.endsWith(".aport-policy.json") ||
        fileName.endsWith(".aport-passport.json") ||
        fileName.endsWith("aport.policy.json") ||
        fileName.endsWith("aport.passport.json")) {
        return true;
    }
    const sample = document.getText(new vscode.Range(0, 0, Math.min(document.lineCount, 80), 0));
    return /policy_pack|agent_id|aport|passport|capabilities/.test(sample.toLowerCase());
}
function createKeyCompletion(label, detail) {
    const item = new vscode.CompletionItem(label, vscode.CompletionItemKind.Property);
    item.detail = detail;
    item.insertText = new vscode.SnippetString(`"${label}": $1`);
    item.documentation = new vscode.MarkdownString(detail);
    return item;
}
function createPolicyPackCompletion(policy) {
    const item = new vscode.CompletionItem(policy.label, vscode.CompletionItemKind.Value);
    item.detail = policy.detail;
    item.insertText = `"${policy.label}"`;
    item.documentation = new vscode.MarkdownString(policy.documentation);
    return item;
}
function createCapabilityCompletion(capability) {
    const item = new vscode.CompletionItem(capability, vscode.CompletionItemKind.EnumMember);
    item.detail = "APort passport capability";
    item.insertText = `"${capability}"`;
    item.documentation = new vscode.MarkdownString(`Adds the \`${capability}\` capability to an APort passport or policy context.`);
    return item;
}
function createVerifySnippetCompletion() {
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
//# sourceMappingURL=extension.js.map