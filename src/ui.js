/* === Test Result UI Rendering === */

// Shared state exported for cross-module access
export const state = {
  testStructure: [],   // [{className, methods: [string]}]
  testStatusMap: {},    // {"ClassName.method_name": "pending"|"ok"|"fail"|"error"|"running"}
};

// Callback injection to break circular dependency with editor.js
let _runSingleTest = null;
export function setRunSingleTest(fn) {
  _runSingleTest = fn;
}

export function renderTestResults(result) {
  const pane = document.getElementById("results-pane");
  const consoleOutput = document.getElementById("console-output");

  // Check for error (syntax/runtime)
  if (result.errorMessage) {
    pane.innerHTML = renderError(result.errorMessage);
    consoleOutput.textContent = result.errorMessage;
    return;
  }

  // Update console output
  consoleOutput.textContent = result.stdout || result.output || "";

  // Build summary
  const passed = result.testsRun - result.failures - result.errors;
  const allPassed = result.success;
  const summaryClass = allPassed ? "pass" : "fail";
  const summaryIcon = allPassed ? "&#10004;" : "&#10008;";
  const summaryText = allPassed
    ? "All tests passed!"
    : `${result.failures + result.errors} test(s) failed`;

  let html = `
    <div class="test-summary ${summaryClass}">
      <span>${summaryIcon}</span>
      <span>${summaryText}</span>
      <span class="count">${passed}/${result.testsRun} passed</span>
    </div>
  `;

  // Parse verbose output into individual test results
  const testLines = parseTestOutput(result.output);

  testLines.forEach((test) => {
    const isPass = test.status === "ok";
    const itemClass = isPass ? "pass" : "fail";
    const icon = isPass ? "&#10004;" : "&#10008;";

    html += `
      <div class="test-item ${itemClass}">
        <span class="icon">${icon}</span>
        <span class="name">${escapeHtml(test.name)}</span>
      </div>
    `;

    // Show failure details if applicable
    if (!isPass) {
      const detail = findFailureDetail(test.name, result);
      if (detail) {
        html += `<div class="failure-detail">${escapeHtml(detail)}</div>`;
      }
    }
  });

  pane.innerHTML = html;
}

export function renderError(errorMessage) {
  return `
    <div class="error-block">
      <div class="error-title">&#9888; Error</div>
      <div>${escapeHtml(errorMessage)}</div>
    </div>
  `;
}

export function renderRunning() {
  const pane = document.getElementById("results-pane");
  pane.innerHTML = `
    <div class="running-indicator">
      <div class="spinner"></div>
      <span>Running tests...</span>
    </div>
  `;
}

function parseTestOutput(output) {
  const tests = [];
  const seen = new Set();
  const lines = output.split("\n");

  for (const line of lines) {
    const match = line.match(/^(\S+)\s+\(([^)]+)\)\s+\.\.\.\s+(ok|FAIL|ERROR)$/);
    if (match) {
      const method = match[1];
      const rawClassName = match[2];
      const parts = rawClassName.split(".");
      let className = rawClassName;
      if (parts.length >= 2) {
        const filtered = parts.filter(p => p !== "__main__" && p !== method);
        className = filtered.length > 0 ? filtered.join(".") : parts[parts.length - 2] || rawClassName;
      }

      const key = `${className}.${method}`;
      if (seen.has(key)) continue;
      seen.add(key);

      tests.push({
        name: key,
        method: method,
        className: className,
        status: match[3].toLowerCase(),
      });
    }
  }

  return tests;
}

function findFailureDetail(testName, result) {
  for (const f of result.failureDetails || []) {
    if (testName && f.test && (f.test.includes(testName.split(".").pop()) || testName.includes(f.test.split(" ")[0]))) {
      return f.message;
    }
  }
  for (const e of result.errorDetails || []) {
    if (testName && e.test && (e.test.includes(testName.split(".").pop()) || testName.includes(e.test.split(" ")[0]))) {
      return e.message;
    }
  }
  return null;
}

export function escapeHtml(text) {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}

// Tab switching
export function initOutputTabs() {
  const tabs = document.querySelectorAll(".output-tab");
  tabs.forEach((tab) => {
    tab.addEventListener("click", () => {
      tabs.forEach((t) => t.classList.remove("active"));
      document.querySelectorAll(".output-pane").forEach((p) => p.classList.remove("active"));
      tab.classList.add("active");
      const target = tab.getAttribute("data-tab");
      document.getElementById(`${target}-pane`).classList.add("active");
    });
  });
}

/* === Test Tree (Side Panel) === */

export function parseTestCodeStructure(testCode) {
  const structure = [];
  const classRegex = /^class\s+(\w+)\s*\(.*TestCase.*\)\s*:/gm;

  let classMatch;
  while ((classMatch = classRegex.exec(testCode)) !== null) {
    const className = classMatch[1];
    const classStart = classMatch.index;

    const remaining = testCode.slice(classStart);
    const nextClassMatch = remaining.slice(classMatch[0].length).search(/^class\s+\w+/m);
    const classBody = nextClassMatch !== -1
      ? remaining.slice(0, classMatch[0].length + nextClassMatch)
      : remaining;

    const methods = [];
    let methodMatch;
    const localMethodRegex = /^\s+def\s+(test_\w+)\s*\(\s*self\s*\)/gm;
    while ((methodMatch = localMethodRegex.exec(classBody)) !== null) {
      methods.push(methodMatch[1]);
    }

    structure.push({ className, methods });
  }

  return structure;
}

export function initTestStatusMap(structure) {
  state.testStatusMap = {};
  for (const group of structure) {
    for (const method of group.methods) {
      state.testStatusMap[`${group.className}.${method}`] = "pending";
    }
  }
}

function getIconForStatus(status) {
  switch (status) {
    case "ok": return { html: "&#10004;", cls: "pass" };
    case "fail": case "error": return { html: "&#10008;", cls: "fail" };
    case "running": return { html: "&#9679;", cls: "running" };
    default: return { html: "&#9679;", cls: "pending" };
  }
}

export function renderTestTreeFromStructure() {
  const treeContainer = document.getElementById("test-tree");

  if (state.testStructure.length === 0) {
    treeContainer.innerHTML = `<div class="tree-placeholder">No tests found</div>`;
    return;
  }

  let html = "";

  for (const group of state.testStructure) {
    const statuses = group.methods.map(m => state.testStatusMap[`${group.className}.${m}`] || "pending");
    const allPending = statuses.every(s => s === "pending");
    const allPass = !allPending && statuses.every(s => s === "ok");
    const anyFail = statuses.some(s => s === "fail" || s === "error");
    const anyRunning = statuses.some(s => s === "running");

    let groupIcon, groupColor;
    if (anyRunning) {
      groupIcon = "&#9679;";
      groupColor = "#f0c674";
    } else if (allPending) {
      groupIcon = "&#9679;";
      groupColor = "var(--text-secondary)";
    } else if (allPass) {
      groupIcon = "&#10004;";
      groupColor = "var(--success)";
    } else if (anyFail) {
      groupIcon = "&#10008;";
      groupColor = "var(--error)";
    } else {
      groupIcon = "&#10004;";
      groupColor = "var(--success)";
    }

    const passCount = statuses.filter(s => s === "ok").length;

    html += `<div class="tree-group">`;
    html += `<div class="tree-group-header" data-class="${escapeHtml(group.className)}">`;
    html += `<span class="tree-chevron" onclick="this.closest('.tree-group').classList.toggle('collapsed')">&#9660;</span>`;
    html += `<span class="tree-group-icon" style="color:${groupColor}">${groupIcon}</span>`;
    html += `<span class="tree-group-name" onclick="this.closest('.tree-group').classList.toggle('collapsed')">${escapeHtml(group.className)}</span>`;
    html += `<button class="tree-play-btn" data-class="${escapeHtml(group.className)}" title="Run all tests in ${escapeHtml(group.className)}">&#9654;</button>`;
    html += `<span class="tree-group-count">${allPending ? "" : passCount + "/" + group.methods.length}</span>`;
    html += `</div>`;
    html += `<div class="tree-children">`;

    for (const method of group.methods) {
      const key = `${group.className}.${method}`;
      const status = state.testStatusMap[key] || "pending";
      const icon = getIconForStatus(status);

      html += `<div class="tree-item" data-class="${escapeHtml(group.className)}" data-method="${escapeHtml(method)}">`;
      html += `<span class="tree-item-icon ${icon.cls}">${icon.html}</span>`;
      html += `<span class="tree-item-name">${escapeHtml(method)}</span>`;
      html += `<button class="tree-play-btn" data-class="${escapeHtml(group.className)}" data-method="${escapeHtml(method)}" title="Run ${escapeHtml(method)}">&#9654;</button>`;
      html += `</div>`;
    }

    html += `</div></div>`;
  }

  treeContainer.innerHTML = html;
  wireTreePlayButtons();
}

function wireTreePlayButtons() {
  document.querySelectorAll(".tree-play-btn").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      const className = btn.getAttribute("data-class");
      const methodName = btn.getAttribute("data-method");
      if (_runSingleTest) {
        _runSingleTest(className, methodName || null);
      }
    });
  });
}

export function updateTestStatusMapFromResult(result, targetClassName, targetMethodName) {
  if (result.errorMessage) return;

  const testLines = parseTestOutput(result.output);

  if (!targetClassName && !targetMethodName) {
    for (const key of Object.keys(state.testStatusMap)) {
      state.testStatusMap[key] = "pending";
    }
  }

  for (const t of testLines) {
    const key = `${t.className}.${t.method}`;
    state.testStatusMap[key] = t.status;
  }
}

export function renderTestTree(result) {
  if (result.errorMessage) {
    // Mark all tests as error but keep the tree structure
    for (const key of Object.keys(state.testStatusMap)) {
      state.testStatusMap[key] = "error";
    }
    renderTestTreeFromStructure();
    return;
  }

  updateTestStatusMapFromResult(result, null, null);
  renderTestTreeFromStructure();
}

/* === Status Bar Updates === */
export function updateStatusBar(type, value) {
  if (type === "problem") {
    const el = document.getElementById("status-problem");
    if (el) el.textContent = value;
  }

  if (type === "pyodide") {
    const el = document.getElementById("status-pyodide");
    if (!el) return;
    if (value === "ready") {
      el.innerHTML = `<span class="status-dot ready"></span> Python: Ready`;
    } else if (value === "error") {
      el.innerHTML = `<span class="status-dot error"></span> Python: Error`;
    } else {
      el.innerHTML = `<span class="status-dot loading"></span> Python: Loading`;
    }
  }

  if (type === "tests") {
    const el = document.getElementById("status-tests");
    if (!el) return;
    if (value === "running") {
      el.textContent = "Running tests...";
    } else if (value === "error") {
      el.textContent = "Tests: Error";
    }
  }
}

export function updateStatusBarAfterTests(result) {
  const el = document.getElementById("status-tests");
  if (!el) return;

  if (result.errorMessage) {
    el.textContent = "Tests: Error";
    return;
  }

  const passed = result.testsRun - result.failures - result.errors;
  if (result.success) {
    el.textContent = `\u2714 ${passed}/${result.testsRun} tests passed`;
  } else {
    el.textContent = `\u2718 ${passed}/${result.testsRun} tests passed`;
  }
}
