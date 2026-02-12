import { PROBLEMS, saveCustomProblem, deleteCustomProblem, isCustomProblem } from "./problems.js";

document.addEventListener("DOMContentLoaded", () => {
  const grid = document.getElementById("problems-grid");
  const statsBar = document.getElementById("stats-bar");

  function render() {
    const counts = { easy: 0, medium: 0, hard: 0 };
    PROBLEMS.forEach((p) => counts[p.difficulty]++);

    statsBar.innerHTML = `
      <div class="stat-item">
        <span class="stat-count easy">${counts.easy}</span> Easy
      </div>
      <div class="stat-item">
        <span class="stat-count medium">${counts.medium}</span> Medium
      </div>
      <div class="stat-item">
        <span class="stat-count hard">${counts.hard}</span> Hard
      </div>
      <div class="stat-item">
        <span class="stat-count" style="color: var(--text-bright)">${PROBLEMS.length}</span> Total
      </div>
    `;

    grid.innerHTML = "";
    PROBLEMS.forEach((problem, index) => {
      const card = document.createElement("div");
      card.className = "problem-card";
      card.addEventListener("click", () => {
        window.location.href = `practice.html?problem=${problem.id}`;
      });

      const tagsHtml = problem.tags
        .map((tag) => `<span class="tag">${tag}</span>`)
        .join("");

      const custom = isCustomProblem(problem.id);
      const deleteBtn = custom
        ? `<button class="card-delete-btn" data-delete-id="${problem.id}" title="Delete custom problem">&times;</button>`
        : "";

      card.innerHTML = `
        <div class="card-header">
          <h3>${problem.title}</h3>
          <span style="display:flex;align-items:center;gap:6px;">
            ${deleteBtn}
            <span class="badge badge-${problem.difficulty}">${problem.difficulty}</span>
          </span>
        </div>
        <p class="card-description">${problem.description}</p>
        <div class="card-tags">${tagsHtml}</div>
        <div class="card-footer">
          <span class="problem-number">#${index + 1}</span>
          <button class="btn btn-primary" onclick="event.stopPropagation(); window.location.href='practice.html?problem=${problem.id}'">
            Start Coding &rarr;
          </button>
        </div>
      `;

      grid.appendChild(card);
    });

    document.querySelectorAll(".card-delete-btn").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        const id = btn.getAttribute("data-delete-id");
        if (confirm("Delete this custom problem?")) {
          deleteCustomProblem(id);
          render();
        }
      });
    });
  }

  render();

  // === Upload dialog wiring ===
  const overlay = document.getElementById("upload-overlay");
  const titleInput = document.getElementById("upload-title");
  const testFileInput = document.getElementById("test-file-input");
  const testFileDrop = document.getElementById("test-file-drop");
  const testFileName = document.getElementById("test-file-name");
  const solFileInput = document.getElementById("sol-file-input");
  const solFileDrop = document.getElementById("sol-file-drop");
  const solFileName = document.getElementById("sol-file-name");
  const preview = document.getElementById("upload-preview");
  const errorEl = document.getElementById("upload-error");
  const confirmBtn = document.getElementById("upload-confirm");

  // Add upload button to header
  const header = document.querySelector(".main-header");
  const uploadBtn = document.createElement("button");
  uploadBtn.className = "upload-btn";
  uploadBtn.innerHTML = `
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/>
      <polyline points="17 8 12 3 7 8"/>
      <line x1="12" y1="3" x2="12" y2="15"/>
    </svg>
    Upload Problem
  `;
  header.appendChild(uploadBtn);

  let testCode = "";
  let solutionCode = "";

  function openDialog() {
    overlay.classList.add("open");
    resetDialog();
  }

  function closeDialog() {
    overlay.classList.remove("open");
    resetDialog();
  }

  function resetDialog() {
    titleInput.value = "";
    testFileInput.value = "";
    solFileInput.value = "";
    testFileName.textContent = "";
    solFileName.textContent = "";
    testFileDrop.classList.remove("has-file");
    solFileDrop.classList.remove("has-file");
    preview.innerHTML = "";
    errorEl.textContent = "";
    confirmBtn.disabled = true;
    testCode = "";
    solutionCode = "";
    // Reset difficulty to easy
    document.querySelector('input[name="upload-diff"][value="easy"]').checked = true;
  }

  function escapeHtml(text) {
    const div = document.createElement("div");
    div.textContent = text;
    return div.innerHTML;
  }

  // Clean uploaded test code for exec() environment
  function cleanUploadedTestCode(code) {
    const lines = code.split("\n");
    const result = [];
    let skipBlock = false;
    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed.match(/^from\s+solution\s+import\b/) || trimmed.match(/^import\s+solution\b/)) continue;
      if (trimmed.match(/^import\s+[A-Z]\w*\s*$/)) continue;
      if (trimmed.match(/^from\s+[A-Z]\w*\s+import\b/)) continue;
      if (trimmed.match(/^if\s+__name__\s*==\s*['"]__main__['"]\s*:/)) { skipBlock = true; continue; }
      if (skipBlock) {
        if (trimmed === "" || line.match(/^\s+/)) continue;
        skipBlock = false;
      }
      if (trimmed.match(/^unittest\.main\s*\(/)) continue;
      result.push(line);
    }
    return result.join("\n");
  }

  // Extract function signatures from test code to generate starter code
  function generateStarterCode(testContent) {
    // Look for function calls in assertEqual, assertTrue, etc. to infer the function name
    const funcCalls = testContent.match(/(?:self\.assert\w+\()\s*(\w+)\s*\(/g) || [];
    const funcNames = new Set();
    for (const call of funcCalls) {
      const match = call.match(/(\w+)\s*\($/);
      if (match && !match[1].startsWith("assert") && !match[1].startsWith("self")) {
        funcNames.add(match[1]);
      }
    }

    if (funcNames.size === 0) {
      return "# Write your code here\npass\n";
    }

    return [...funcNames]
      .map((name) => `def ${name}():\n    # Write your code here\n    pass\n`)
      .join("\n");
  }

  function tryAutoTitle(filename) {
    if (titleInput.value.trim()) return; // Don't overwrite user input
    // test_two_sum.py → Two Sum
    let name = filename.replace(/\.py$/, "").replace(/^test_?/, "");
    name = name.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
    if (name) titleInput.value = name;
  }

  function updatePreview() {
    errorEl.textContent = "";
    preview.innerHTML = "";
    confirmBtn.disabled = true;

    if (!testCode) return;

    const title = titleInput.value.trim();
    if (!title) {
      errorEl.textContent = "Please enter a title.";
      return;
    }

    const testMethods = (testCode.match(/def (test_\w+)/g) || []).map((m) => m.replace("def ", ""));

    preview.innerHTML = `
      <div class="preview-title">${escapeHtml(title)}</div>
      <div class="preview-row"><span class="preview-label">Tests:</span> ${testMethods.length} test method(s)</div>
      <div class="preview-row"><span class="preview-label">Solution:</span> ${solutionCode ? "provided" : "starter code will be generated"}</div>
    `;
    confirmBtn.disabled = false;
  }

  function readFile(file, callback) {
    const reader = new FileReader();
    reader.onload = () => callback(reader.result);
    reader.readAsText(file);
  }

  function wireFileDrop(dropEl, inputEl, nameEl, onFile) {
    // Click the drop zone → open native file picker
    dropEl.addEventListener("click", () => {
      inputEl.click();
    });
    dropEl.addEventListener("dragover", (e) => {
      e.preventDefault();
      dropEl.classList.add("dragover");
    });
    dropEl.addEventListener("dragleave", () => {
      dropEl.classList.remove("dragover");
    });
    dropEl.addEventListener("drop", (e) => {
      e.preventDefault();
      dropEl.classList.remove("dragover");
      const file = e.dataTransfer.files[0];
      if (file) {
        nameEl.textContent = file.name;
        dropEl.classList.add("has-file");
        onFile(file);
      }
    });
    inputEl.addEventListener("change", () => {
      const file = inputEl.files[0];
      if (file) {
        nameEl.textContent = file.name;
        dropEl.classList.add("has-file");
        onFile(file);
      }
    });
  }

  wireFileDrop(testFileDrop, testFileInput, testFileName, (file) => {
    if (!file.name.endsWith(".py")) {
      errorEl.textContent = "Please upload a .py file.";
      return;
    }
    tryAutoTitle(file.name);
    readFile(file, (content) => {
      testCode = cleanUploadedTestCode(content);
      updatePreview();
    });
  });

  wireFileDrop(solFileDrop, solFileInput, solFileName, (file) => {
    if (!file.name.endsWith(".py")) {
      errorEl.textContent = "Please upload a .py file.";
      return;
    }
    readFile(file, (content) => {
      solutionCode = content;
      updatePreview();
    });
  });

  titleInput.addEventListener("input", updatePreview);

  uploadBtn.addEventListener("click", openDialog);
  document.getElementById("upload-close").addEventListener("click", closeDialog);
  document.getElementById("upload-cancel").addEventListener("click", closeDialog);

  overlay.addEventListener("click", (e) => {
    if (e.target === overlay) closeDialog();
  });

  confirmBtn.addEventListener("click", () => {
    if (!testCode) return;

    const title = titleInput.value.trim();
    if (!title) return;

    const difficulty = document.querySelector('input[name="upload-diff"]:checked').value;
    const id = "custom-" + title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
    const starter = solutionCode
      ? solutionCode.replace(/^(def \w+\([^)]*\):).*/s, "$1\n    # Write your code here\n    pass\n")
      : generateStarterCode(testCode);

    const problem = {
      id,
      title,
      difficulty,
      description: title,
      detailedDescription: title,
      examples: [],
      constraints: [],
      tags: ["custom"],
      starterCode: starter,
      testCode: testCode,
      solution: solutionCode || starter,
    };

    saveCustomProblem(problem);
    closeDialog();
    render();
  });
});
