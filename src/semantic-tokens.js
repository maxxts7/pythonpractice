/* === Python Semantic Token Highlighting via Pyodide AST === */

import * as monaco from "monaco-editor";
import { runSemanticAnalysis, isPyodideReady } from "./pyodide-runner.js";

const TOKEN_TYPES = [
  "function",
  "class",
  "variable",
  "function-call",
  "parameter",
  "module",
  "builtin",
  "selfParameter",
  "variable-undefined",
];

const TOKEN_MODIFIERS = [
  "declaration",
  "magic",
];

const legend = {
  tokenTypes: TOKEN_TYPES,
  tokenModifiers: TOKEN_MODIFIERS,
};

function encodeModifiers(modifiers) {
  let bits = 0;
  for (const mod of modifiers) {
    const idx = TOKEN_MODIFIERS.indexOf(mod);
    if (idx >= 0) {
      bits |= 1 << idx;
    }
  }
  return bits;
}

const provider = {
  getLegend() {
    return legend;
  },

  async provideDocumentSemanticTokens(model, lastResultId, token) {
    if (!isPyodideReady()) {
      return null;
    }

    if (token.isCancellationRequested) {
      return null;
    }

    const code = model.getValue();
    const rawTokens = await runSemanticAnalysis(code);

    if (token.isCancellationRequested) {
      return null;
    }

    if (!rawTokens || rawTokens.length === 0) {
      return { data: new Uint32Array(0) };
    }

    // Sort tokens by line then column (required for delta encoding)
    rawTokens.sort((a, b) => a.line - b.line || a.col - b.col);

    // Delta-encode into Uint32Array: [deltaLine, deltaCol, length, tokenType, tokenModifiers]
    const entries = [];
    let prevLine = 0;
    let prevCol = 0;

    for (let i = 0; i < rawTokens.length; i++) {
      const t = rawTokens[i];
      const typeIdx = TOKEN_TYPES.indexOf(t.type);
      if (typeIdx < 0) continue; // skip unknown types

      // Monaco lines are 1-based, AST lines are 1-based; delta from previous
      const line = t.line - 1; // convert to 0-based for delta encoding
      const col = t.col;

      const deltaLine = line - prevLine;
      const deltaCol = deltaLine === 0 ? col - prevCol : col;

      entries.push(deltaLine, deltaCol, t.length, typeIdx, encodeModifiers(t.modifiers || []));

      prevLine = line;
      prevCol = col;
    }

    return { data: new Uint32Array(entries) };
  },

  releaseDocumentSemanticTokens() {},
};

let disposable = null;

export function registerPythonSemanticTokensProvider() {
  if (disposable) {
    disposable.dispose();
  }
  disposable = monaco.languages.registerDocumentSemanticTokensProvider("python", provider);
  return disposable;
}
