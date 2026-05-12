import * as vscode from "vscode";
import {
  createSamplePolicy,
  policyKeyCompletions,
  validatePolicyDocument,
  type ValidationIssue,
} from "./policyValidator";

let diagnostics: vscode.DiagnosticCollection;

export function activate(context: vscode.ExtensionContext): void {
  diagnostics = vscode.languages.createDiagnosticCollection("aport-policy");
  context.subscriptions.push(diagnostics);

  context.subscriptions.push(
    vscode.commands.registerCommand("aportPolicy.validate", () => validateActiveEditor()),
    vscode.commands.registerCommand("aportPolicy.insertSamplePolicy", () => insertSamplePolicy()),
    vscode.languages.registerCompletionItemProvider(
      { language: "aport-policy" },
      {
        provideCompletionItems() {
          return policyKeyCompletions.map((key) => {
            const item = new vscode.CompletionItem(key, vscode.CompletionItemKind.Property);
            item.detail = "APort policy field";
            return item;
          });
        },
      },
      "\"",
      ":",
      "."
    )
  );

  context.subscriptions.push(
    vscode.workspace.onDidOpenTextDocument((document) => validateDocument(document)),
    vscode.workspace.onDidChangeTextDocument((event) => validateDocument(event.document)),
    vscode.workspace.onDidSaveTextDocument((document) => {
      const enabled = vscode.workspace.getConfiguration("aportPolicy").get<boolean>("validateOnSave", true);
      if (enabled) {
        validateDocument(document);
      }
    })
  );

  if (vscode.window.activeTextEditor) {
    validateDocument(vscode.window.activeTextEditor.document);
  }
}

export function deactivate(): void {
  diagnostics?.dispose();
}

async function validateActiveEditor(): Promise<void> {
  const editor = vscode.window.activeTextEditor;

  if (!editor) {
    vscode.window.showWarningMessage("Open an APort policy file to validate.");
    return;
  }

  const issues = validateDocument(editor.document);

  if (issues.length === 0) {
    vscode.window.showInformationMessage("APort policy validation passed.");
    return;
  }

  const errorCount = issues.filter((issue) => issue.severity === "error").length;
  vscode.window.showWarningMessage(
    "APort policy validation found " + issues.length + " issue" + (issues.length === 1 ? "" : "s") + " (" + errorCount + " error" + (errorCount === 1 ? "" : "s") + ")."
  );
}

async function insertSamplePolicy(): Promise<void> {
  const editor = vscode.window.activeTextEditor;
  const policyId = vscode.workspace.getConfiguration("aportPolicy").get<string>("defaultPolicyId", "code.repository.merge.v1");
  const sample = createSamplePolicy(policyId);

  if (!editor) {
    const document = await vscode.workspace.openTextDocument({
      language: "aport-policy",
      content: sample,
    });
    await vscode.window.showTextDocument(document);
    return;
  }

  await editor.edit((edit) => {
    edit.insert(editor.selection.active, sample);
  });
}

function validateDocument(document: vscode.TextDocument): ValidationIssue[] {
  if (!isAportPolicyDocument(document)) {
    diagnostics.delete(document.uri);
    return [];
  }

  const issues = validatePolicyDocument(document.getText());
  const vscodeDiagnostics = issues.map((issue) => toDiagnostic(document, issue));
  diagnostics.set(document.uri, vscodeDiagnostics);
  return issues;
}

function isAportPolicyDocument(document: vscode.TextDocument): boolean {
  return (
    document.languageId === "aport-policy" ||
    /(^|[/.])aport-policy\.(json|ya?ml)$/i.test(document.fileName) ||
    /\.aport-policy(\.(json|ya?ml))?$/i.test(document.fileName)
  );
}

function toDiagnostic(document: vscode.TextDocument, issue: ValidationIssue): vscode.Diagnostic {
  const range = findRangeForPath(document, issue.path);
  const severity = issue.severity === "error" ? vscode.DiagnosticSeverity.Error : vscode.DiagnosticSeverity.Warning;
  return new vscode.Diagnostic(range, issue.message, severity);
}

function findRangeForPath(document: vscode.TextDocument, path: string): vscode.Range {
  const keyMatch = /\.([a-zA-Z_][a-zA-Z0-9_]*)$/.exec(path);

  if (keyMatch) {
    const key = keyMatch[1];
    for (let index = 0; index < document.lineCount; index += 1) {
      const line = document.lineAt(index);
      const character = line.text.indexOf(key);
      if (character !== -1) {
        return new vscode.Range(index, character, index, character + key.length);
      }
    }
  }

  return new vscode.Range(0, 0, 0, Math.max(1, document.lineAt(0).text.length));
}
