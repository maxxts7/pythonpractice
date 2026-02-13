/* === Pyodide Test Runner === */

let pyodideInstance = null;
let _pyodideReady = false;
let _jediReady = false;

export function isPyodideReady() {
  return _pyodideReady;
}

export function isJediReady() {
  return _jediReady;
}

export async function initializePyodide() {
  try {
    pyodideInstance = await window.loadPyodide();
    _pyodideReady = true;

    // Install jedi for autocompletion (non-blocking — don't delay startup)
    installJedi();

    return true;
  } catch (err) {
    console.error("Failed to load Pyodide:", err);
    return false;
  }
}

async function installJedi() {
  try {
    await pyodideInstance.loadPackage("micropip");
    const micropip = pyodideInstance.pyimport("micropip");
    await micropip.install("jedi");
    // Pre-import so first completion isn't slow
    await pyodideInstance.runPythonAsync("import jedi");
    _jediReady = true;
    console.log("Jedi autocompletion ready");
  } catch (err) {
    console.warn("Failed to install jedi:", err);
  }
}

let _jediLock = false;

export async function getJediCompletions(code, line, column) {
  if (!_pyodideReady || !_jediReady || !pyodideInstance) {
    return [];
  }

  // Prevent concurrent jedi calls
  if (_jediLock) return [];
  _jediLock = true;

  try {
    const resultJson = await pyodideInstance.runPythonAsync(`
import jedi
import json as _json

def _jedi_complete(source, line, column):
    try:
        script = jedi.Script(source)
        completions = script.complete(line, column)
        results = []
        for c in completions[:50]:
            results.append({
                "name": c.name,
                "type": c.type,
                "description": c.description,
                "module_name": c.module_name if c.module_name else "",
            })
        return results
    except Exception:
        return []

_json.dumps(_jedi_complete(${JSON.stringify(code)}, ${line}, ${column}))
`);
    return JSON.parse(resultJson);
  } catch (err) {
    console.warn("Jedi completion failed:", err);
    return [];
  } finally {
    _jediLock = false;
  }
}

// Clean up uploaded test code for exec() environment:
// - Strip "from solution import ..." (user code is already in globals)
// - Strip "unittest.main()" calls (we use our own test runner)
// - Strip "if __name__" guard blocks
function cleanTestCode(code) {
  const lines = code.split("\n");
  const result = [];
  let skipBlock = false;

  for (const line of lines) {
    const trimmed = line.trim();

    // Skip solution imports and non-stdlib imports (user module imports)
    // Keep standard library imports (unittest, sys, os, json, etc.)
    if (trimmed.match(/^from\s+solution\s+import\b/) ||
        trimmed.match(/^import\s+solution\b/)) {
      continue;
    }
    // Strip bare imports that match user-defined names (e.g. "import VirtualFileSystem")
    // These are not real modules — the class is exec'd into globals from user code
    if (trimmed.match(/^import\s+[A-Z]\w*\s*$/)) {
      continue;
    }
    if (trimmed.match(/^from\s+[A-Z]\w*\s+import\b/)) {
      continue;
    }

    // Skip "if __name__ == '__main__':" and its indented body
    if (trimmed.match(/^if\s+__name__\s*==\s*['"]__main__['"]\s*:/)) {
      skipBlock = true;
      continue;
    }
    if (skipBlock) {
      // Still inside the if-block (indented or blank)
      if (trimmed === "" || line.match(/^\s+/)) {
        continue;
      }
      skipBlock = false;
    }

    // Skip standalone unittest.main()
    if (trimmed.match(/^unittest\.main\s*\(/)) {
      continue;
    }

    result.push(line);
  }

  return result.join("\n");
}

export async function runSemanticAnalysis(code) {
  if (!_pyodideReady || !pyodideInstance) {
    return [];
  }

  try {
    const resultJson = await pyodideInstance.runPythonAsync(`
import ast
import json as _json
import builtins

def _semantic_analyze(source):
    try:
        tree = ast.parse(source)
    except SyntaxError:
        return []

    tokens = []
    builtin_names = set(dir(builtins))

    # Pass 1: Collect definitions per scope
    # scope_stack is a list of sets; index 0 = global scope
    global_defs = set()
    # Map from ast node id -> set of defined names in that scope
    scope_defs = {}

    class DefCollector(ast.NodeVisitor):
        def __init__(self):
            self.scope_stack = [global_defs]

        def current_scope(self):
            return self.scope_stack[-1]

        def visit_FunctionDef(self, node):
            self.current_scope().add(node.name)
            local = set()
            # Add parameters
            for arg in node.args.args:
                local.add(arg.arg)
            if node.args.vararg:
                local.add(node.args.vararg.arg)
            if node.args.kwarg:
                local.add(node.args.kwarg.arg)
            for arg in node.args.posonlyargs:
                local.add(arg.arg)
            for arg in node.args.kwonlyargs:
                local.add(arg.arg)
            scope_defs[id(node)] = local
            self.scope_stack.append(local)
            self.generic_visit(node)
            self.scope_stack.pop()

        visit_AsyncFunctionDef = visit_FunctionDef

        def visit_ClassDef(self, node):
            self.current_scope().add(node.name)
            local = set()
            scope_defs[id(node)] = local
            self.scope_stack.append(local)
            self.generic_visit(node)
            self.scope_stack.pop()

        def visit_Import(self, node):
            for alias in node.names:
                name = alias.asname if alias.asname else alias.name.split('.')[0]
                self.current_scope().add(name)

        def visit_ImportFrom(self, node):
            for alias in node.names:
                name = alias.asname if alias.asname else alias.name
                self.current_scope().add(name)

        def visit_Assign(self, node):
            for target in node.targets:
                self._collect_target(target)
            self.generic_visit(node)

        def visit_AnnAssign(self, node):
            if node.target:
                self._collect_target(node.target)
            self.generic_visit(node)

        def visit_AugAssign(self, node):
            self._collect_target(node.target)
            self.generic_visit(node)

        def visit_For(self, node):
            self._collect_target(node.target)
            self.generic_visit(node)

        def visit_With(self, node):
            for item in node.items:
                if item.optional_vars:
                    self._collect_target(item.optional_vars)
            self.generic_visit(node)

        def visit_Global(self, node):
            for name in node.names:
                self.current_scope().add(name)

        def visit_Nonlocal(self, node):
            for name in node.names:
                self.current_scope().add(name)

        def _collect_target(self, target):
            if isinstance(target, ast.Name):
                self.current_scope().add(target.id)
            elif isinstance(target, (ast.Tuple, ast.List)):
                for elt in target.elts:
                    self._collect_target(elt)

    DefCollector().visit(tree)

    # Pass 2: Emit tokens
    class TokenEmitter(ast.NodeVisitor):
        def __init__(self):
            self.scope_stack = [global_defs]
            self.func_node_stack = []

        def _is_defined(self, name):
            for scope in reversed(self.scope_stack):
                if name in scope:
                    return True
            return False

        def _get_param_names(self):
            if self.func_node_stack:
                node = self.func_node_stack[-1]
                params = set()
                for a in node.args.args:
                    params.add(a.arg)
                if node.args.vararg:
                    params.add(node.args.vararg.arg)
                if node.args.kwarg:
                    params.add(node.args.kwarg.arg)
                for a in node.args.posonlyargs:
                    params.add(a.arg)
                for a in node.args.kwonlyargs:
                    params.add(a.arg)
                return params
            return set()

        def visit_FunctionDef(self, node):
            # Function name token
            ttype = "function"
            mods = ["declaration"]
            if node.name.startswith("__") and node.name.endswith("__"):
                mods.append("magic")
            tokens.append({
                "line": node.lineno,
                "col": node.col_offset + 4,  # skip 'def '
                "length": len(node.name),
                "type": ttype,
                "modifiers": mods
            })
            # Parameters
            for arg in node.args.args:
                if arg.arg in ("self", "cls"):
                    tokens.append({
                        "line": arg.lineno,
                        "col": arg.col_offset,
                        "length": len(arg.arg),
                        "type": "selfParameter",
                        "modifiers": []
                    })
                else:
                    tokens.append({
                        "line": arg.lineno,
                        "col": arg.col_offset,
                        "length": len(arg.arg),
                        "type": "parameter",
                        "modifiers": ["declaration"]
                    })
            for arg_list in [node.args.posonlyargs, node.args.kwonlyargs]:
                for arg in arg_list:
                    tokens.append({
                        "line": arg.lineno,
                        "col": arg.col_offset,
                        "length": len(arg.arg),
                        "type": "parameter",
                        "modifiers": ["declaration"]
                    })
            if node.args.vararg:
                a = node.args.vararg
                tokens.append({
                    "line": a.lineno,
                    "col": a.col_offset,
                    "length": len(a.arg),
                    "type": "parameter",
                    "modifiers": ["declaration"]
                })
            if node.args.kwarg:
                a = node.args.kwarg
                tokens.append({
                    "line": a.lineno,
                    "col": a.col_offset,
                    "length": len(a.arg),
                    "type": "parameter",
                    "modifiers": ["declaration"]
                })

            local = scope_defs.get(id(node), set())
            self.scope_stack.append(local)
            self.func_node_stack.append(node)
            self.generic_visit(node)
            self.func_node_stack.pop()
            self.scope_stack.pop()

        visit_AsyncFunctionDef = visit_FunctionDef

        def visit_ClassDef(self, node):
            tokens.append({
                "line": node.lineno,
                "col": node.col_offset + 6,  # skip 'class '
                "length": len(node.name),
                "type": "class",
                "modifiers": ["declaration"]
            })
            local = scope_defs.get(id(node), set())
            self.scope_stack.append(local)
            self.generic_visit(node)
            self.scope_stack.pop()

        def visit_Import(self, node):
            for alias in node.names:
                name = alias.asname if alias.asname else alias.name
                tokens.append({
                    "line": node.lineno,
                    "col": alias.col_offset if hasattr(alias, 'col_offset') and alias.col_offset is not None else node.col_offset + 7,
                    "length": len(name),
                    "type": "module",
                    "modifiers": []
                })

        def visit_ImportFrom(self, node):
            for alias in node.names:
                name = alias.asname if alias.asname else alias.name
                if hasattr(alias, 'col_offset') and alias.col_offset is not None:
                    col = alias.col_offset
                else:
                    col = node.col_offset
                tokens.append({
                    "line": alias.lineno if hasattr(alias, 'lineno') and alias.lineno else node.lineno,
                    "col": col,
                    "length": len(name),
                    "type": "module",
                    "modifiers": []
                })

        def visit_Call(self, node):
            if isinstance(node.func, ast.Name):
                name = node.func.id
                if name in builtin_names:
                    ttype = "builtin"
                else:
                    ttype = "function-call"
                tokens.append({
                    "line": node.func.lineno,
                    "col": node.func.col_offset,
                    "length": len(name),
                    "type": ttype,
                    "modifiers": []
                })
            elif isinstance(node.func, ast.Attribute):
                attr = node.func.attr
                tokens.append({
                    "line": node.func.end_lineno or node.func.lineno,
                    "col": node.func.end_col_offset - len(attr) if node.func.end_col_offset else node.func.col_offset,
                    "length": len(attr),
                    "type": "function-call",
                    "modifiers": []
                })
            self.generic_visit(node)

        def visit_Name(self, node):
            name = node.id
            # Skip if already handled by Call visitor
            # We handle Name nodes that are NOT the func of a Call
            if name in ("self", "cls"):
                tokens.append({
                    "line": node.lineno,
                    "col": node.col_offset,
                    "length": len(name),
                    "type": "selfParameter",
                    "modifiers": []
                })
            elif name in builtin_names:
                # Only tag builtins when they're loaded (read), not when shadowed by assignment
                if isinstance(node.ctx, ast.Load):
                    tokens.append({
                        "line": node.lineno,
                        "col": node.col_offset,
                        "length": len(name),
                        "type": "builtin",
                        "modifiers": []
                    })
            elif name in self._get_param_names():
                tokens.append({
                    "line": node.lineno,
                    "col": node.col_offset,
                    "length": len(name),
                    "type": "parameter",
                    "modifiers": []
                })
            elif isinstance(node.ctx, ast.Store):
                tokens.append({
                    "line": node.lineno,
                    "col": node.col_offset,
                    "length": len(name),
                    "type": "variable",
                    "modifiers": ["declaration"]
                })
            elif isinstance(node.ctx, ast.Load):
                if self._is_defined(name):
                    tokens.append({
                        "line": node.lineno,
                        "col": node.col_offset,
                        "length": len(name),
                        "type": "variable",
                        "modifiers": []
                    })
                else:
                    tokens.append({
                        "line": node.lineno,
                        "col": node.col_offset,
                        "length": len(name),
                        "type": "variable-undefined",
                        "modifiers": []
                    })

        def visit_Decorator(self, node):
            pass  # decorators handled by TextMate

    TokenEmitter().visit(tree)
    return tokens

_result = _semantic_analyze(${JSON.stringify(code)})
_json.dumps(_result)
`);
    return JSON.parse(resultJson);
  } catch (err) {
    console.warn("Semantic analysis failed:", err);
    return [];
  }
}

export async function executeTests(userCode, testCode, targetClassName, targetMethodName) {
  userCode = cleanTestCode(userCode);
  testCode = cleanTestCode(testCode);
  if (!_pyodideReady || !pyodideInstance) {
    return {
      success: false,
      testsRun: 0,
      failures: 0,
      errors: 0,
      output: "",
      failureDetails: [],
      errorDetails: [],
      errorMessage: "Python environment is not ready. Please wait and try again.",
    };
  }

  // Pre-check user code for syntax errors before running tests
  try {
    const syntaxCheck = await pyodideInstance.runPythonAsync(`
import json as _json
try:
    compile(${JSON.stringify(userCode)}, "<user_code>", "exec")
    _json.dumps({"ok": True})
except SyntaxError as _e:
    _json.dumps({"ok": False, "msg": f"SyntaxError: {_e.msg} (line {_e.lineno})"})
`);
    const syntaxResult = JSON.parse(syntaxCheck);
    if (!syntaxResult.ok) {
      return {
        success: false,
        testsRun: 0,
        failures: 0,
        errors: 0,
        output: "",
        failureDetails: [],
        errorDetails: [],
        errorMessage: syntaxResult.msg,
      };
    }
  } catch (err) {
    // If even the syntax check fails, continue to the main execution
  }

  const wrappedCode = `
import sys
import json
import unittest
from io import StringIO

# Clean up old test classes from previous runs
for _k in list(globals().keys()):
    _v = globals()[_k]
    if isinstance(_v, type) and issubclass(_v, unittest.TestCase) and _v is not unittest.TestCase:
        del globals()[_k]

# Capture stdout
_captured_stdout = StringIO()
_original_stdout = sys.stdout

_result = {
    "success": False,
    "testsRun": 0,
    "failures": 0,
    "errors": 0,
    "output": "",
    "failureDetails": [],
    "errorDetails": [],
}

try:
    # Redirect stdout to capture print statements
    sys.stdout = _captured_stdout

    # Execute user code
    exec(${JSON.stringify(userCode)}, globals())

    # Execute test code
    exec(${JSON.stringify(testCode)}, globals())

    # Restore stdout before running tests
    sys.stdout = _original_stdout

    # Discover test classes
    _test_classes = []
    for _name, _obj in list(globals().items()):
        if isinstance(_obj, type) and issubclass(_obj, unittest.TestCase) and _obj is not unittest.TestCase:
            _test_classes.append(_obj)

    # Build test suite
    _target_class = ${targetClassName ? JSON.stringify(targetClassName) : "None"}
    _target_method = ${targetMethodName ? JSON.stringify(targetMethodName) : "None"}
    _suite = unittest.TestSuite()
    _loader = unittest.TestLoader()
    for _cls in _test_classes:
        if _target_class and _cls.__name__ != _target_class:
            continue
        if _target_method:
            _suite.addTest(_cls(_target_method))
        else:
            _suite.addTests(_loader.loadTestsFromTestCase(_cls))

    # Run with verbose output
    _stream = StringIO()
    _runner = unittest.TextTestRunner(stream=_stream, verbosity=2)
    _test_result = _runner.run(_suite)

    _result["testsRun"] = _test_result.testsRun
    _result["failures"] = len(_test_result.failures)
    _result["errors"] = len(_test_result.errors)
    _result["success"] = _test_result.wasSuccessful()
    _result["output"] = _stream.getvalue()

    for _test, _traceback in _test_result.failures:
        _result["failureDetails"].append({
            "test": str(_test),
            "message": _traceback,
        })

    for _test, _traceback in _test_result.errors:
        _result["errorDetails"].append({
            "test": str(_test),
            "message": _traceback,
        })

except SyntaxError as e:
    sys.stdout = _original_stdout
    _result["errorMessage"] = f"SyntaxError: {e.msg} (line {e.lineno})"
except Exception as e:
    sys.stdout = _original_stdout
    _result["errorMessage"] = f"{type(e).__name__}: {str(e)}"
finally:
    sys.stdout = _original_stdout
    _result["stdout"] = _captured_stdout.getvalue()

json.dumps(_result)
`;

  try {
    const resultJson = await pyodideInstance.runPythonAsync(wrappedCode);
    return JSON.parse(resultJson);
  } catch (err) {
    // Pyodide-level error
    let errorMessage = err.message || String(err);
    // Try to extract just the Python error
    const lines = errorMessage.split("\n");
    const pyLine = lines.find(
      (l) =>
        l.startsWith("SyntaxError") ||
        l.startsWith("NameError") ||
        l.startsWith("TypeError") ||
        l.startsWith("ValueError") ||
        l.startsWith("IndentationError") ||
        l.startsWith("AttributeError")
    );
    if (pyLine) errorMessage = pyLine;

    return {
      success: false,
      testsRun: 0,
      failures: 0,
      errors: 0,
      output: "",
      failureDetails: [],
      errorDetails: [],
      errorMessage: errorMessage,
    };
  }
}
