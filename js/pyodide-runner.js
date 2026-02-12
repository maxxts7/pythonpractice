/* === Pyodide Test Runner === */

let pyodideInstance = null;
let pyodideReady = false;

async function initializePyodide() {
  try {
    pyodideInstance = await loadPyodide();
    pyodideReady = true;
    return true;
  } catch (err) {
    console.error("Failed to load Pyodide:", err);
    return false;
  }
}

async function executeTests(userCode, testCode, targetClassName, targetMethodName) {
  if (!pyodideReady || !pyodideInstance) {
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
