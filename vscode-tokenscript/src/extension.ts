import type * as vscode from "vscode";

export function activate(_context: vscode.ExtensionContext) {
  console.log("TokenScript extension is now active!");

  // Future: Add language server features here
  // - Hover providers
  // - Completion providers
  // - Diagnostic providers
  // - Definition providers
}

export function deactivate() {
  console.log("TokenScript extension is now deactivated!");
}
