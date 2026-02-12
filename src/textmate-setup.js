import * as monaco from "monaco-editor";
import { createOnigScanner, createOnigString, loadWASM } from "vscode-oniguruma";
import { INITIAL, Registry, parseRawGrammar } from "vscode-textmate";
import grammarData from "../grammars/MagicPython.tmLanguage.json";

// Map TextMate scopes → Monaco theme token names
// Order matters: more specific scopes must come first
const TM_TO_MONACO = [
  // Comments
  ["comment",                          "comment"],

  // Strings
  ["string",                           "string"],

  // Constants
  ["constant.numeric",                 "number"],
  ["constant.language",                "constant"],       // True, False, None
  ["constant.other",                   "constant"],
  ["constant.character",               "string"],

  // Keywords & storage
  ["keyword.operator.logical",         "keyword"],
  ["keyword.operator",                 "operator"],
  ["keyword.control.import",           "keyword"],
  ["keyword.control",                  "keyword"],
  ["keyword",                          "keyword"],
  ["storage.type",                     "keyword"],        // def, class, lambda

  // Functions — specific before generic
  ["support.function.builtin",         "builtin"],        // print, len, range, etc.
  ["support.function.magic",           "magic"],          // __init__, __str__
  ["support.function",                 "builtin"],
  ["entity.name.function.decorator",   "decorator"],
  ["entity.name.function",             "function"],       // function definitions
  ["meta.function-call.generic",       "function-call"],  // function calls
  ["meta.function-call",               "function-call"],

  // Types & classes
  ["entity.name.type",                 "type"],
  ["support.type",                     "type"],
  ["entity.other.inherited-class",     "type"],

  // Variables — specific before generic
  ["variable.language.special.self",   "self"],           // self, cls
  ["variable.parameter.function",      "parameter"],      // function parameters
  ["variable.parameter",               "parameter"],
  ["variable.legacy.builtin",          "builtin"],
  ["variable",                         "variable"],

  // Punctuation & operators
  ["punctuation.definition.string",    "string"],
  ["punctuation.separator",            "delimiter"],
  ["punctuation",                      "delimiter"],

  // Decorators
  ["entity.name.function.decorator",   "decorator"],
  ["punctuation.definition.decorator", "decorator"],
];

function scopeToMonacoToken(scopes) {
  // scopes is an array like ["source.python", "meta.function", "entity.name.function.python"]
  // Walk from most-specific to least-specific
  for (let i = scopes.length - 1; i >= 0; i--) {
    const scope = scopes[i];
    for (const [prefix, token] of TM_TO_MONACO) {
      if (scope.startsWith(prefix)) return token;
    }
  }
  // If the only scope is source.python (or source.python + meta.*),
  // this is likely a plain identifier/variable usage — color it as variable
  if (scopes.length >= 1 && scopes[0].startsWith("source.")) {
    const lastScope = scopes[scopes.length - 1];
    // Don't re-color things that are just source.python itself (whitespace, etc.)
    // Only color if there's a meta scope (meaning it's inside an expression)
    if (scopes.length > 1 && (lastScope.startsWith("meta.") || lastScope.startsWith("source."))) {
      return "variable";
    }
  }
  return "";
}

class TextMateTokensProvider {
  constructor(grammar) {
    this._grammar = grammar;
  }

  getInitialState() {
    return INITIAL;
  }

  tokenize(line, state) {
    const result = this._grammar.tokenizeLine(line, state);
    const tokens = [];
    for (const tok of result.tokens) {
      tokens.push({
        startIndex: tok.startIndex,
        scopes: scopeToMonacoToken(tok.scopes),
      });
    }
    return { tokens, endState: result.ruleStack };
  }
}

let activated = false;

export async function activateTextMateGrammars() {
  if (activated) return;
  activated = true;

  // Load Oniguruma WASM
  const wasmResponse = await fetch("/onig.wasm");
  const wasmBuffer = await wasmResponse.arrayBuffer();
  await loadWASM(wasmBuffer);

  // Create registry
  const registry = new Registry({
    onigLib: Promise.resolve({ createOnigScanner, createOnigString }),
    async loadGrammar(scopeName) {
      if (scopeName === "source.python") {
        return parseRawGrammar(JSON.stringify(grammarData), "python.tmLanguage.json");
      }
      return null;
    },
  });

  // Load the Python grammar
  const grammar = await registry.loadGrammar("source.python");

  // Register with Monaco
  monaco.languages.setTokensProvider("python", new TextMateTokensProvider(grammar));
}
