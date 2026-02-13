/* === Python Autocomplete via Jedi (Pyodide) === */

import * as monaco from "monaco-editor";
import { getJediCompletions, isJediReady } from "./pyodide-runner.js";

// Map jedi completion types to Monaco CompletionItemKind
const KIND_MAP = {
  module: monaco.languages.CompletionItemKind.Module,
  class: monaco.languages.CompletionItemKind.Class,
  instance: monaco.languages.CompletionItemKind.Variable,
  function: monaco.languages.CompletionItemKind.Function,
  param: monaco.languages.CompletionItemKind.Variable,
  path: monaco.languages.CompletionItemKind.File,
  keyword: monaco.languages.CompletionItemKind.Keyword,
  property: monaco.languages.CompletionItemKind.Property,
  statement: monaco.languages.CompletionItemKind.Keyword,
};

let disposable = null;

export function registerPythonCompletionProvider() {
  if (disposable) {
    disposable.dispose();
  }

  disposable = monaco.languages.registerCompletionItemProvider("python", {
    triggerCharacters: [".", "_"],

    async provideCompletionItems(model, position, context, token) {
      const word = model.getWordUntilPosition(position);
      const range = {
        startLineNumber: position.lineNumber,
        endLineNumber: position.lineNumber,
        startColumn: word.startColumn,
        endColumn: word.endColumn,
      };

      if (!isJediReady()) {
        return { suggestions: [] };
      }

      const code = model.getValue();
      const line = position.lineNumber;
      const column = position.column - 1; // Jedi uses 0-based columns

      const completions = await getJediCompletions(code, line, column);

      if (token.isCancellationRequested) {
        return { suggestions: [] };
      }

      const suggestions = completions.map((c, i) => {
        const kind = KIND_MAP[c.type] || monaco.languages.CompletionItemKind.Text;
        const isFunction = c.type === "function";

        return {
          label: c.name,
          kind,
          detail: c.description,
          documentation: c.module_name ? `from ${c.module_name}` : undefined,
          insertText: isFunction ? c.name + "(${0})" : c.name,
          insertTextRules: isFunction
            ? monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet
            : undefined,
          sortText: String(i).padStart(4, "0"),
          range,
        };
      });

      return { suggestions };
    },
  });

  return disposable;
}
