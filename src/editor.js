/* === Editor Setup & Wiring === */

import * as monaco from "monaco-editor";
import { servicesReady } from "./monaco-setup.js";
import { PROBLEMS } from "./problems.js";
import { initializePyodide, executeTests, isPyodideReady } from "./pyodide-runner.js";
import {
  state,
  setRunSingleTest,
  renderTestResults,
  renderError,
  renderRunning,
  renderTestTree,
  renderTestTreeFromStructure,
  updateTestStatusMapFromResult,
  parseTestCodeStructure,
  initTestStatusMap,
  initOutputTabs,
  updateStatusBar,
  updateStatusBarAfterTests,
  escapeHtml,
} from "./ui.js";
import { registerPythonSemanticTokensProvider } from "./semantic-tokens.js";
import { registerPythonCompletionProvider } from "./python-completions.js";

let monacoEditor = null;
let currentProblem = null;
let solutionModel = null;
let testModel = null;
let activeTab = "solution";

function populateSidebar(problem) {
  document.getElementById("sidebar-title").textContent = problem.title;

  const badge = document.getElementById("sidebar-badge");
  badge.textContent = problem.difficulty;
  badge.className = `badge badge-${problem.difficulty}`;

  const content = document.getElementById("sidebar-content");

  let examplesHtml = "";
  problem.examples.forEach((ex) => {
    examplesHtml += `
      <div class="example-block">
        <div><span class="label">Input: </span>${escapeHtml(ex.input)}</div>
        <div><span class="label">Output: </span><span class="value">${escapeHtml(ex.output)}</span></div>
      </div>
    `;
  });

  let constraintsHtml = "";
  problem.constraints.forEach((c) => {
    constraintsHtml += `<li>${escapeHtml(c)}</li>`;
  });

  let tagsHtml = "";
  problem.tags.forEach((t) => {
    tagsHtml += `<span class="tag">${escapeHtml(t)}</span>`;
  });

  content.innerHTML = `
    <h3>Description</h3>
    <p>${problem.detailedDescription}</p>

    <h3>Examples</h3>
    ${examplesHtml}

    <h3>Constraints</h3>
    <ul class="constraint-list">
      ${constraintsHtml}
    </ul>

    <h3>Tags</h3>
    <div class="sidebar-tags">${tagsHtml}</div>
  `;
}

/* === Activity Bar Panel Switching === */
function initActivityBar() {
  const icons = document.querySelectorAll(".activity-icon[data-panel]");
  const views = document.querySelectorAll(".side-view");

  icons.forEach((icon) => {
    icon.addEventListener("click", () => {
      const panelId = icon.getAttribute("data-panel");

      icons.forEach((i) => i.classList.remove("active"));
      icon.classList.add("active");

      views.forEach((v) => v.classList.remove("active"));
      const targetView = document.getElementById(`${panelId}-view`);
      if (targetView) {
        targetView.classList.add("active");
      }
    });
  });
}

/* === Resize Handle between Editor and Output === */
function initResizeHandle() {
  const handle = document.getElementById("resize-handle");
  const rightArea = handle.parentElement;
  const editorPanel = rightArea.querySelector(".editor-panel");
  const outputPanel = rightArea.querySelector(".output-panel");

  let isResizing = false;
  let startY = 0;
  let startEditorHeight = 0;
  let startOutputHeight = 0;

  handle.addEventListener("mousedown", (e) => {
    isResizing = true;
    startY = e.clientY;
    startEditorHeight = editorPanel.getBoundingClientRect().height;
    startOutputHeight = outputPanel.getBoundingClientRect().height;
    handle.classList.add("dragging");
    document.body.style.cursor = "row-resize";
    document.body.style.userSelect = "none";
    e.preventDefault();
  });

  document.addEventListener("mousemove", (e) => {
    if (!isResizing) return;
    const delta = e.clientY - startY;
    const newEditorHeight = Math.max(120, startEditorHeight + delta);
    const newOutputHeight = Math.max(80, startOutputHeight - delta);

    editorPanel.style.flex = "none";
    editorPanel.style.height = newEditorHeight + "px";
    outputPanel.style.height = newOutputHeight + "px";
  });

  document.addEventListener("mouseup", () => {
    if (!isResizing) return;
    isResizing = false;
    handle.classList.remove("dragging");
    document.body.style.cursor = "";
    document.body.style.userSelect = "";
    if (monacoEditor) monacoEditor.layout();
  });
}

/* === Editor Tab Switching === */
function initEditorTabs() {
  const tabs = document.querySelectorAll(".editor-tab[data-tab]");
  tabs.forEach((tab) => {
    tab.addEventListener("click", () => {
      const tabName = tab.getAttribute("data-tab");
      switchEditorTab(tabName);
    });
  });
}

function switchEditorTab(tab) {
  if (tab === activeTab) return;
  activeTab = tab;

  const tabs = document.querySelectorAll(".editor-tab[data-tab]");
  tabs.forEach((t) => {
    if (t.getAttribute("data-tab") === tab) {
      t.classList.add("active");
    } else {
      t.classList.remove("active");
    }
  });

  if (!monacoEditor) return;

  if (tab === "test" && testModel) {
    monacoEditor.setModel(testModel);
    monacoEditor.updateOptions({ readOnly: true });
  } else if (tab === "solution" && solutionModel) {
    monacoEditor.setModel(solutionModel);
    monacoEditor.updateOptions({ readOnly: false });
  }
}

async function initMonaco(problem) {
  await servicesReady;

  const storageKey = `pypractice-code-${problem.id}`;
  const savedCode = localStorage.getItem(storageKey);
  const initialCode = savedCode !== null ? savedCode : problem.starterCode;

  solutionModel = monaco.editor.createModel(initialCode, "python");
  testModel = monaco.editor.createModel(problem.testCode, "python");

  monacoEditor = monaco.editor.create(
    document.getElementById("editor-container"),
    {
      model: solutionModel,
      language: "python",
      fontSize: 14,
      fontFamily: "'JetBrains Mono', 'Cascadia Code', 'Fira Code', Consolas, monospace",
      fontLigatures: true,
      minimap: { enabled: false },
      scrollBeyondLastLine: false,
      lineNumbers: "on",
      renderLineHighlight: "line",
      padding: { top: 14 },
      automaticLayout: true,
      tabSize: 4,
      insertSpaces: true,
      wordWrap: "on",
      suggestOnTriggerCharacters: true,
      quickSuggestions: true,
      cursorBlinking: "smooth",
      cursorSmoothCaretAnimation: "on",
      smoothScrolling: true,
      roundedSelection: true,
      "semanticHighlighting.enabled": true,
    }
  );

  // Register semantic token highlighting (uses Pyodide AST analysis)
  registerPythonSemanticTokensProvider();

  // Register Jedi-powered autocomplete
  registerPythonCompletionProvider();

  // Auto-save to localStorage on change (solution model only)
  solutionModel.onDidChangeContent(() => {
    if (activeTab === "solution") {
      const code = solutionModel.getValue();
      localStorage.setItem(storageKey, code);
    }
  });

  // Ctrl+Enter to run tests
  monacoEditor.addCommand(
    monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter,
    () => {
      runTests();
    }
  );
}

function wireButtons() {
  document.getElementById("run-btn").addEventListener("click", runTests);

  document.getElementById("reset-btn").addEventListener("click", () => {
    if (!currentProblem || !solutionModel) return;
    if (confirm("Reset to starter code? Your changes will be lost.")) {
      switchEditorTab("solution");
      solutionModel.setValue(currentProblem.starterCode);
      const storageKey = `pypractice-code-${currentProblem.id}`;
      localStorage.removeItem(storageKey);
    }
  });

  document.getElementById("solution-btn").addEventListener("click", () => {
    if (!currentProblem || !solutionModel) return;
    if (
      confirm("Show the solution? This will replace your current code.")
    ) {
      switchEditorTab("solution");
      solutionModel.setValue(currentProblem.solution);
    }
  });

  document.addEventListener("keydown", (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
      e.preventDefault();
      runTests();
    }
  });
}

async function runTests() {
  if (!currentProblem || !solutionModel || !isPyodideReady()) return;

  const runBtn = document.getElementById("run-btn");
  runBtn.disabled = true;
  runBtn.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"/></svg> Running...`;

  renderRunning();
  document.querySelector('.output-tab[data-tab="results"]').click();

  updateStatusBar("tests", "running");

  for (const key of Object.keys(state.testStatusMap)) {
    state.testStatusMap[key] = "running";
  }
  renderTestTreeFromStructure();

  const userCode = solutionModel.getValue();
  const testCode = currentProblem.testCode;

  try {
    const result = await executeTests(userCode, testCode);
    renderTestResults(result);
    renderTestTree(result);
    updateStatusBarAfterTests(result);
  } catch (err) {
    const pane = document.getElementById("results-pane");
    pane.innerHTML = renderError(String(err));
    updateStatusBar("tests", "error");
  }

  runBtn.disabled = false;
  runBtn.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"/></svg> Run`;
}

async function runSingleTest(className, methodName) {
  if (!currentProblem || !solutionModel || !isPyodideReady()) return;

  if (methodName) {
    state.testStatusMap[`${className}.${methodName}`] = "running";
  } else {
    for (const key of Object.keys(state.testStatusMap)) {
      if (key.startsWith(`${className}.`)) {
        state.testStatusMap[key] = "running";
      }
    }
  }
  renderTestTreeFromStructure();

  const userCode = solutionModel.getValue();
  const testCode = currentProblem.testCode;

  try {
    const result = await executeTests(userCode, testCode, className, methodName);
    renderTestResults(result);
    updateStatusBarAfterTests(result);

    if (!result.errorMessage) {
      updateTestStatusMapFromResult(result, className, methodName);
      renderTestTreeFromStructure();
    } else {
      if (methodName) {
        state.testStatusMap[`${className}.${methodName}`] = "error";
      } else {
        for (const key of Object.keys(state.testStatusMap)) {
          if (key.startsWith(`${className}.`)) {
            state.testStatusMap[key] = "error";
          }
        }
      }
      renderTestTreeFromStructure();
    }
  } catch (err) {
    console.error("Single test run failed:", err);
  }
}

// Register the callback so ui.js can call runSingleTest
setRunSingleTest(runSingleTest);

/* === Boot === */
document.addEventListener("DOMContentLoaded", async () => {
  const params = new URLSearchParams(window.location.search);
  const problemId = params.get("problem");

  if (!problemId) {
    window.location.href = "index.html";
    return;
  }

  currentProblem = PROBLEMS.find((p) => p.id === problemId);
  if (!currentProblem) {
    window.location.href = "index.html";
    return;
  }

  document.title = `PyPractice \u2014 ${currentProblem.title}`;

  populateSidebar(currentProblem);
  updateStatusBar("problem", currentProblem.title);

  const testTabName = document.getElementById("test-file-tab-name");
  if (testTabName) {
    testTabName.textContent = `test_${currentProblem.id.replace(/-/g, "_")}.py`;
  }

  // Pre-populate test tree from test code structure
  state.testStructure = parseTestCodeStructure(currentProblem.testCode);
  initTestStatusMap(state.testStructure);
  renderTestTreeFromStructure();

  initActivityBar();
  initOutputTabs();
  initResizeHandle();
  initEditorTabs();

  const overlay = document.getElementById("loading-overlay");
  const loadingText = document.getElementById("loading-text");

  loadingText.textContent = "Loading Python environment...";
  const pyodideOk = await initializePyodide();

  if (!pyodideOk) {
    loadingText.textContent = "Failed to load Python. Please refresh the page.";
    updateStatusBar("pyodide", "error");
    return;
  }

  updateStatusBar("pyodide", "ready");

  loadingText.textContent = "Loading code editor...";
  await initMonaco(currentProblem);

  overlay.classList.add("hidden");
  document.getElementById("run-btn").disabled = false;

  wireButtons();
});
