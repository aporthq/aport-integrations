import * as vscode from "vscode";
import { isAportPolicyFileName, validatePolicyDocument } from "./policyValidation";

const POLICY_KEYS = [
  "id",
  "name",
  "version",
  "description",
  "defaults",
  "rules",
  "metadata",
  "effect",
  "action",
  "conditions",
];

const POLICY_IDS = [
  "finance.payment.refund.v1",
  "data.export.v1",
  "code.repository.merge.v1",
  "payments.transfer.v1",
];

export function activate(context: vscode.ExtensionContext): void {
  const diagnostics = vscode.languages.createDiagnosticCollection("aportPolicies");

  const validateDocument = (document: vscode.TextDocument): vscode.Diagnostic[] => {
    if (!isAportPolicyDocument(document)) return [];

    const issues = validatePolicyDocument(document.getText(), document.fileName);
    const vscodeDiagnostics = issues.map((issue) => {
      const position = new vscode.Position(issue.line, issue.column);
      const diagnostic = new vscode.Diagnostic(
        new vscode.Range(position, position.translate(0, 1)),
        issue.message,
        issue.severity === "error" ? vscode.DiagnosticSeverity.Error : vscode.DiagnosticSeverity.Warning
      );
      diagnostic.source = "APort";
      return diagnostic;
    });

    diagnostics.set(document.uri, vscodeDiagnostics);
    return vscodeDiagnostics;
  };

  context.subscriptions.push(diagnostics);
  context.subscriptions.push(
    vscode.workspace.onDidOpenTextDocument(validateDocument),
    vscode.workspace.onDidSaveTextDocument(validateDocument),
    vscode.workspace.onDidChangeTextDocument((event) => validateDocument(event.document)),
    vscode.commands.registerCommand("aportPolicies.validateCurrentFile", () => {
      const editor = vscode.window.activeTextEditor;
      if (!editor || !isAportPolicyDocument(editor.document)) {
        vscode.window.showWarningMessage("Open an APort policy pack file to validate it.");
        return;
      }

      const currentDiagnostics = validateDocument(editor.document);
      if (currentDiagnostics.length === 0) {
        vscode.window.showInformationMessage("APort policy pack looks valid.");
        return;
      }

      vscode.window.showWarningMessage(
        `APort policy pack has ${currentDiagnostics.length} validation issue${
          currentDiagnostics.length === 1 ? "" : "s"
        }.`
      );
    }),
    vscode.languages.registerCompletionItemProvider(
      ["json", "aport-policy-yaml"],
      {
        provideCompletionItems(document) {
          if (!isAportPolicyDocument(document)) return undefined;

          const keyItems = POLICY_KEYS.map((key) => {
            const item = new vscode.CompletionItem(key, vscode.CompletionItemKind.Property);
            item.detail = "APort policy field";
            return item;
          });

          const policyItems = POLICY_IDS.map((policyId) => {
            const item = new vscode.CompletionItem(policyId, vscode.CompletionItemKind.Value);
            item.detail = "APort policy identifier";
            return item;
          });

          return [...keyItems, ...policyItems];
        },
      },
      ".",
      "\"",
      "'"
    ),
    vscode.languages.registerHoverProvider(["json", "aport-policy-yaml"], {
      provideHover(document, position) {
        if (!isAportPolicyDocument(document)) return undefined;

        const wordRange = document.getWordRangeAtPosition(position, /[A-Za-z0-9_.-]+/);
        const word = wordRange ? document.getText(wordRange) : "";
        if (POLICY_KEYS.includes(word)) {
          return new vscode.Hover(`APort policy field: \`${word}\``);
        }
        if (POLICY_IDS.includes(word)) {
          return new vscode.Hover(`Common APort policy pack: \`${word}\``);
        }
        return undefined;
      },
    })
  );

  vscode.workspace.textDocuments.forEach(validateDocument);
}

export function deactivate(): void {
  // VS Code disposes subscriptions registered during activation.
}

const isAportPolicyDocument = (document: vscode.TextDocument): boolean => {
  return (
    isAportPolicyFileName(document.fileName) &&
    (document.languageId === "json" || document.languageId === "jsonc" || document.languageId === "aport-policy-yaml")
  );
};
