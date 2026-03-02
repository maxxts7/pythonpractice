/* === Test Result UI Rendering === */

// Shared state exported for cross-module access
export const state = {
  testStructure: [],   // [{className, methods: [string]}]
  testStatusMap: {},    // {"ClassName.method_name": "pending"|"ok"|"fail"|"error"|"running"}
};

// Callback injections to break circular dependency with editor.js
let _runSingleTest = null;
export function setRunSingleTest(fn) {
  _runSingleTest = fn;
}

let _navigateToTest = null;
export function setNavigateToTest(fn) {
  _navigateToTest = fn;
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
  const allPassed = result.success && result.testsRun > 0;
  const noTests = result.testsRun === 0;
  const summaryClass = noTests ? "fail" : allPassed ? "pass" : "fail";
  const summaryIcon = allPassed ? "&#10004;" : "&#10008;";
  const summaryText = noTests
    ? "No tests were run"
    : allPassed
      ? "All tests passed!"
      : `${result.failures + result.errors} test(s) failed`;

  let html = `
    <div class="test-summary ${summaryClass}">
      <span>${summaryIcon}</span>
      <span>${summaryText}</span>
      <span class="count">${passed}/${result.testsRun} passed</span>
    </div>
  `;

  // Use structured test details from Python TestResult
  const details = result.testDetails || [];

  details.forEach((test) => {
    const isPass = test.status === "ok";
    const itemClass = isPass ? "pass" : "fail";
    const icon = isPass ? "&#10004;" : "&#10008;";
    const name = `${test.className}.${test.method}`;

    // Find line number from parsed test structure
    const line = findTestLine(test.className, test.method);
    const lineAttr = line ? ` data-line="${line}"` : "";

    html += `
      <div class="test-item ${itemClass}"${lineAttr}>
        <span class="icon">${icon}</span>
        <span class="name">${escapeHtml(name)}</span>
      </div>
    `;

    // Show failure details if applicable
    if (!isPass) {
      const detail = findFailureDetail(name, result);
      if (detail) {
        html += `<div class="failure-detail">${escapeHtml(detail)}</div>`;
      }
    }
  });

  pane.innerHTML = html;
  wireResultItemClicks(pane);
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

function findTestLine(className, methodName) {
  for (const group of state.testStructure) {
    if (group.className === className) {
      for (const m of group.methods) {
        if (m.name === methodName) return m.line;
      }
    }
  }
  return null;
}

function wireResultItemClicks(pane) {
  pane.querySelectorAll(".test-item[data-line]").forEach((item) => {
    item.style.cursor = "pointer";
    item.addEventListener("click", () => {
      const line = parseInt(item.getAttribute("data-line"), 10);
      if (_navigateToTest && line) {
        _navigateToTest(line);
      }
    });
  });
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
  const lines = testCode.split("\n");

  // Build a quick offset-to-line map
  const lineStartOffsets = [0];
  for (let i = 0; i < lines.length; i++) {
    lineStartOffsets.push(lineStartOffsets[i] + lines[i].length + 1);
  }
  function offsetToLine(offset) {
    for (let i = 1; i < lineStartOffsets.length; i++) {
      if (offset < lineStartOffsets[i]) return i; // 1-based
    }
    return lines.length;
  }

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
      const line = offsetToLine(classStart + methodMatch.index);
      methods.push({ name: methodMatch[1], line });
    }

    structure.push({ className, methods });
  }

  return structure;
}

export function initTestStatusMap(structure) {
  state.testStatusMap = {};
  for (const group of structure) {
    for (const method of group.methods) {
      state.testStatusMap[`${group.className}.${method.name}`] = "pending";
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

  // Preserve expanded/collapsed state before re-rendering
  // Default to collapsed on first render (no existing groups in DOM)
  const existingGroups = treeContainer.querySelectorAll(".tree-group");
  const firstRender = existingGroups.length === 0;
  const expandedGroups = new Set();
  if (!firstRender) {
    existingGroups.forEach((el) => {
      if (!el.classList.contains("collapsed")) {
        const header = el.querySelector(".tree-group-header");
        if (header) expandedGroups.add(header.getAttribute("data-class"));
      }
    });
  }

  let html = "";

  for (const group of state.testStructure) {
    const statuses = group.methods.map(m => state.testStatusMap[`${group.className}.${m.name}`] || "pending");
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

    const isExpanded = !firstRender && expandedGroups.has(group.className);
    html += `<div class="tree-group${isExpanded ? "" : " collapsed"}">`;
    html += `<div class="tree-group-header" data-class="${escapeHtml(group.className)}">`;
    html += `<span class="tree-chevron" onclick="this.closest('.tree-group').classList.toggle('collapsed')">&#9660;</span>`;
    html += `<span class="tree-group-icon" style="color:${groupColor}">${groupIcon}</span>`;
    html += `<span class="tree-group-name" onclick="this.closest('.tree-group').classList.toggle('collapsed')">${escapeHtml(group.className)}</span>`;
    html += `<button class="tree-play-btn" data-class="${escapeHtml(group.className)}" title="Run all tests in ${escapeHtml(group.className)}">&#9654;</button>`;
    html += `<span class="tree-group-count">${allPending ? "" : passCount + "/" + group.methods.length}</span>`;
    html += `</div>`;
    html += `<div class="tree-children">`;

    for (const method of group.methods) {
      const key = `${group.className}.${method.name}`;
      const status = state.testStatusMap[key] || "pending";
      const icon = getIconForStatus(status);

      html += `<div class="tree-item" data-class="${escapeHtml(group.className)}" data-method="${escapeHtml(method.name)}" data-line="${method.line}">`;
      html += `<span class="tree-item-icon ${icon.cls}">${icon.html}</span>`;
      html += `<span class="tree-item-name">${escapeHtml(method.name)}</span>`;
      html += `<button class="tree-play-btn" data-class="${escapeHtml(group.className)}" data-method="${escapeHtml(method.name)}" title="Run ${escapeHtml(method.name)}">&#9654;</button>`;
      html += `</div>`;
    }

    html += `</div></div>`;
  }

  treeContainer.innerHTML = html;
  wireTreePlayButtons();
  wireTreeItemClicks();
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

function wireTreeItemClicks() {
  document.querySelectorAll(".tree-item").forEach((item) => {
    item.addEventListener("click", (e) => {
      // Don't navigate if the play button was clicked
      if (e.target.closest(".tree-play-btn")) return;
      const line = parseInt(item.getAttribute("data-line"), 10);
      if (_navigateToTest && line) {
        _navigateToTest(line);
      }
    });
  });
}

export function updateTestStatusMapFromResult(result, targetClassName, targetMethodName) {
  if (result.errorMessage) return;

  const details = result.testDetails || [];

  if (!targetClassName && !targetMethodName) {
    // Run All: reset everything to pending first
    for (const key of Object.keys(state.testStatusMap)) {
      state.testStatusMap[key] = "pending";
    }
  } else {
    // Single test/class run: reset only the targeted tests to pending
    for (const key of Object.keys(state.testStatusMap)) {
      if (targetMethodName) {
        if (key === `${targetClassName}.${targetMethodName}`) {
          state.testStatusMap[key] = "pending";
        }
      } else if (key.startsWith(`${targetClassName}.`)) {
        state.testStatusMap[key] = "pending";
      }
    }
  }

  for (const t of details) {
    const key = `${t.className}.${t.method}`;
    if (key in state.testStatusMap) {
      state.testStatusMap[key] = t.status;
    }
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
  if (result.testsRun === 0) {
    el.textContent = `\u2718 No tests were run`;
  } else if (result.success && result.testsRun > 0) {
    el.textContent = `\u2714 ${passed}/${result.testsRun} tests passed`;
  } else {
    el.textContent = `\u2718 ${passed}/${result.testsRun} tests passed`;
  }
}
