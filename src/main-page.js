import {
  PROBLEMS,
  saveCustomProblem,
  deleteCustomProblem,
  isCustomProblem,
  getCustomProblems,
  getRepositories,
  saveRepository,
  deleteRepository,
} from "./problems.js";

document.addEventListener("DOMContentLoaded", () => {
  const grid = document.getElementById("problems-grid");
  const tabBar = document.getElementById("tab-bar");
  const emptyState = document.getElementById("empty-state");

  let activeTab = "all"; // "all" | "uploaded" | repo id

  // === Tab rendering ===
  function renderTabs() {
    const repos = getRepositories();
    const custom = getCustomProblems();
    const totalCount = PROBLEMS.length;

    tabBar.innerHTML = "";

    if (totalCount === 0) {
      tabBar.style.display = "none";
      return;
    }
    tabBar.style.display = "";

    // "All" tab
    const allTab = makeTab("All", totalCount, "all");
    tabBar.appendChild(allTab);

    // "Uploaded" tab (only if there are uploaded problems)
    if (custom.length > 0) {
      tabBar.appendChild(makeTab("Uploaded", custom.length, "uploaded"));
    }

    // One tab per repository
    repos.forEach((repo) => {
      const count = (repo.problems || []).length;
      const tab = makeTab(repo.name, count, repo.id);

      // Delete repo button
      const delBtn = document.createElement("button");
      delBtn.className = "tab-delete";
      delBtn.innerHTML = "&times;";
      delBtn.title = "Remove repository";
      delBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        if (confirm(`Remove repository "${repo.name}" and all its problems?`)) {
          deleteRepository(repo.id);
          if (activeTab === repo.id) activeTab = "all";
          render();
        }
      });
      tab.appendChild(delBtn);
      tabBar.appendChild(tab);
    });
  }

  function makeTab(label, count, id) {
    const tab = document.createElement("button");
    tab.className = "tab" + (activeTab === id ? " active" : "");
    tab.innerHTML = `${escapeHtml(label)} <span class="tab-count">${count}</span>`;
    tab.addEventListener("click", () => {
      activeTab = id;
      render();
    });
    return tab;
  }

  // === Problem grid rendering ===
  function renderGrid() {
    const filtered = getFilteredProblems();

    if (PROBLEMS.length === 0) {
      grid.style.display = "none";
      emptyState.style.display = "";
      return;
    }

    emptyState.style.display = "none";
    grid.style.display = "";

    if (filtered.length === 0) {
      grid.innerHTML = `<div class="tab-empty">No problems in this tab.</div>`;
      return;
    }

    grid.innerHTML = "";
    filtered.forEach((problem, index) => {
      const card = document.createElement("div");
      card.className = "problem-card";
      card.addEventListener("click", () => {
        window.location.href = `practice.html?problem=${problem.id}`;
      });

      const tagsHtml = (problem.tags || [])
        .map((tag) => `<span class="tag">${escapeHtml(tag)}</span>`)
        .join("");

      const custom = isCustomProblem(problem.id);
      const deleteBtn = custom
        ? `<button class="card-delete-btn" data-delete-id="${problem.id}" title="Delete problem">&times;</button>`
        : "";

      // Source label
      const source = problem.repoName
        ? `<span class="source-badge">${escapeHtml(problem.repoName)}</span>`
        : custom
        ? `<span class="source-badge uploaded">Uploaded</span>`
        : "";

      card.innerHTML = `
        <div class="card-header">
          <h3>${escapeHtml(problem.title)}</h3>
          <span style="display:flex;align-items:center;gap:6px;">
            ${deleteBtn}
            <span class="badge badge-${problem.difficulty}">${problem.difficulty}</span>
          </span>
        </div>
        <p class="card-description">${escapeHtml(problem.description)}</p>
        <div class="card-tags">${tagsHtml}</div>
        <div class="card-footer">
          ${source}
          <button class="btn btn-primary" onclick="event.stopPropagation(); window.location.href='practice.html?problem=${problem.id}'">
            Start Coding &rarr;
          </button>
        </div>
      `;

      grid.appendChild(card);
    });

    // Wire delete buttons
    document.querySelectorAll(".card-delete-btn").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        const id = btn.getAttribute("data-delete-id");
        if (confirm("Delete this problem?")) {
          deleteCustomProblem(id);
          render();
        }
      });
    });
  }

  function getFilteredProblems() {
    if (activeTab === "all") return PROBLEMS;
    if (activeTab === "uploaded") return getCustomProblems();
    // Repo tab
    const repo = getRepositories().find((r) => r.id === activeTab);
    return repo ? repo.problems || [] : [];
  }

  function render() {
    renderTabs();
    renderGrid();
  }

  render();

  // === Utility ===
  function escapeHtml(text) {
    const div = document.createElement("div");
    div.textContent = text;
    return div.innerHTML;
  }

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

  let testCode = "";
  let solutionCode = "";

  function openUploadDialog() {
    overlay.classList.add("open");
    resetUploadDialog();
  }

  function closeUploadDialog() {
    overlay.classList.remove("open");
    resetUploadDialog();
  }

  function resetUploadDialog() {
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
    document.querySelector('input[name="upload-diff"][value="easy"]').checked = true;
  }

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

  function generateStarterCode(testContent) {
    const funcCalls = testContent.match(/(?:self\.assert\w+\()\s*(\w+)\s*\(/g) || [];
    const funcNames = new Set();
    for (const call of funcCalls) {
      const match = call.match(/(\w+)\s*\($/);
      if (match && !match[1].startsWith("assert") && !match[1].startsWith("self")) {
        funcNames.add(match[1]);
      }
    }
    if (funcNames.size === 0) return "# Write your code here\npass\n";
    return [...funcNames]
      .map((name) => `def ${name}():\n    # Write your code here\n    pass\n`)
      .join("\n");
  }

  function tryAutoTitle(filename) {
    if (titleInput.value.trim()) return;
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
    dropEl.addEventListener("click", () => inputEl.click());
    dropEl.addEventListener("dragover", (e) => {
      e.preventDefault();
      dropEl.classList.add("dragover");
    });
    dropEl.addEventListener("dragleave", () => dropEl.classList.remove("dragover"));
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

  document.getElementById("btn-upload").addEventListener("click", openUploadDialog);
  document.getElementById("upload-close").addEventListener("click", closeUploadDialog);
  document.getElementById("upload-cancel").addEventListener("click", closeUploadDialog);
  overlay.addEventListener("click", (e) => {
    if (e.target === overlay) closeUploadDialog();
  });

  // Empty state buttons
  document.getElementById("empty-upload").addEventListener("click", openUploadDialog);
  document.getElementById("empty-git").addEventListener("click", openGitDialog);

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
      tags: ["uploaded"],
      starterCode: starter,
      testCode,
      solution: solutionCode || starter,
    };

    saveCustomProblem(problem);
    closeUploadDialog();
    activeTab = "uploaded";
    render();
  });

  // === Git Import dialog ===
  const gitOverlay = document.getElementById("git-overlay");
  const gitUrl = document.getElementById("git-url");
  const gitBranch = document.getElementById("git-branch");
  const gitStatus = document.getElementById("git-status");
  const gitError = document.getElementById("git-error");
  const gitConfirm = document.getElementById("git-confirm");

  function openGitDialog() {
    gitOverlay.classList.add("open");
    resetGitDialog();
  }

  function closeGitDialog() {
    gitOverlay.classList.remove("open");
    resetGitDialog();
  }

  function resetGitDialog() {
    gitUrl.value = "";
    gitBranch.value = "";
    gitStatus.innerHTML = "";
    gitError.textContent = "";
    gitConfirm.disabled = false;
    gitConfirm.textContent = "Import Repository";
  }

  document.getElementById("btn-git-import").addEventListener("click", openGitDialog);
  document.getElementById("git-close").addEventListener("click", closeGitDialog);
  document.getElementById("git-cancel").addEventListener("click", closeGitDialog);
  gitOverlay.addEventListener("click", (e) => {
    if (e.target === gitOverlay) closeGitDialog();
  });

  // Parse GitHub URL → { owner, repo }
  function parseGitHubUrl(url) {
    url = url.trim().replace(/\/+$/, "").replace(/\.git$/, "");
    const match = url.match(/github\.com\/([^/]+)\/([^/]+)/);
    if (!match) return null;
    return { owner: match[1], repo: match[2] };
  }

  // Fetch a raw file from GitHub
  async function fetchRawFile(owner, repo, branch, path) {
    const url = `https://raw.githubusercontent.com/${owner}/${repo}/${branch}/${path}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Failed to fetch ${path} (${res.status})`);
    return res.text();
  }

  // Fetch repo contents listing from GitHub API
  async function fetchRepoContents(owner, repo, branch, path = "") {
    const url = `https://api.github.com/repos/${owner}/${repo}/contents/${path}?ref=${branch}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Failed to list repository contents (${res.status})`);
    return res.json();
  }

  gitConfirm.addEventListener("click", async () => {
    gitError.textContent = "";
    gitStatus.innerHTML = "";

    const parsed = parseGitHubUrl(gitUrl.value);
    if (!parsed) {
      gitError.textContent = "Please enter a valid GitHub repository URL (e.g. https://github.com/owner/repo)";
      return;
    }

    const { owner, repo } = parsed;
    let branch = gitBranch.value.trim();
    const repoId = `repo-${owner}-${repo}`.toLowerCase();

    // Auto-detect default branch if not specified
    if (!branch) {
      try {
        const repoInfo = await fetch(`https://api.github.com/repos/${owner}/${repo}`);
        if (repoInfo.ok) {
          const repoData = await repoInfo.json();
          branch = repoData.default_branch || "main";
        } else {
          branch = "main";
        }
      } catch {
        branch = "main";
      }
    }

    // Check if already imported
    if (getRepositories().some((r) => r.id === repoId)) {
      gitError.textContent = "This repository has already been imported. Delete it first to re-import.";
      return;
    }

    gitConfirm.disabled = true;
    gitConfirm.textContent = "Importing...";
    gitStatus.innerHTML = statusMsg("Fetching repository contents...");

    try {
      // Step 1: List root contents to find directories (and check for root meta.json)
      let rootContents;
      try {
        rootContents = await fetchRepoContents(owner, repo, branch);
      } catch {
        gitError.textContent = "Could not access repository. Make sure it's a public GitHub repo.";
        gitConfirm.disabled = false;
        gitConfirm.textContent = "Import Repository";
        gitStatus.innerHTML = "";
        return;
      }

      // Collect all directories and check for root-level meta.json
      const dirs = rootContents.filter((item) => item.type === "dir");
      const hasRootMeta = rootContents.some((item) => item.name === "meta.json" && item.type === "file");

      // Build list of paths to scan for meta.json: each subdirectory + root if it has one
      const metaSources = [];
      if (hasRootMeta) {
        metaSources.push({ dir: "", path: "meta.json" });
      }
      for (const d of dirs) {
        metaSources.push({ dir: d.name, path: `${d.name}/meta.json` });
      }

      if (metaSources.length === 0) {
        gitError.textContent = "No directories or meta.json found in the repository.";
        gitConfirm.disabled = false;
        gitConfirm.textContent = "Import Repository";
        gitStatus.innerHTML = "";
        return;
      }

      gitStatus.innerHTML = statusMsg(`Scanning ${metaSources.length} location(s) for meta.json...`);

      // Step 2: Fetch meta.json from each location
      const allProblems = [];
      let repoName = repo;
      let foundAny = false;

      for (const source of metaSources) {
        let metaJson;
        try {
          const metaRaw = await fetchRawFile(owner, repo, branch, source.path);
          metaJson = JSON.parse(metaRaw);
        } catch {
          // No meta.json in this directory, skip
          continue;
        }

        foundAny = true;
        const dirLabel = source.dir || repo;
        const prefix = source.dir ? `${source.dir}/` : "";

        // Support two meta.json formats:
        // 1) Array or { problems: [...] } — multiple problems with test_file/skeleton_file per entry
        // 2) Single object { title, description, difficulty, ... } — one problem per directory,
        //    auto-detect test/skeleton files from the directory listing
        const problemsMeta = Array.isArray(metaJson) ? metaJson : metaJson.problems || null;

        if (problemsMeta) {
          // Format 1: explicit problem list
          if (metaJson.title && repoName === repo) repoName = metaJson.title;
          gitStatus.innerHTML = statusMsg(`Found ${problemsMeta.length} problem(s) in ${source.dir || "root"}. Fetching files...`);

          for (let i = 0; i < problemsMeta.length; i++) {
            const pm = problemsMeta[i];
            gitStatus.innerHTML = statusMsg(`Fetching ${prefix}${pm.test_file || "?"}...`);

            const testFile = pm.test_file;
            if (!testFile) { continue; }

            let rawTest = "";
            let rawSkeleton = "";
            let rawSolution = "";

            try { rawTest = await fetchRawFile(owner, repo, branch, prefix + testFile); }
            catch { continue; }

            if (pm.skeleton_file) {
              try { rawSkeleton = await fetchRawFile(owner, repo, branch, prefix + pm.skeleton_file); } catch {}
            }
            if (pm.solution_file) {
              try { rawSolution = await fetchRawFile(owner, repo, branch, prefix + pm.solution_file); } catch {}
            }

            const cleanedTest = cleanUploadedTestCode(rawTest);
            const starterCode = rawSkeleton || generateStarterCode(cleanedTest);
            const title = pm.title || testFile.replace(/\.py$/, "").replace(/^test_?/, "").replace(/_/g, " ");
            const problemId = `${repoId}-${title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "")}`;

            allProblems.push({
              id: problemId, title,
              difficulty: pm.difficulty || "medium",
              description: pm.description || title,
              detailedDescription: pm.detailed_description || pm.description || title,
              examples: pm.examples || [], constraints: pm.constraints || [],
              tags: pm.tags || [dirLabel],
              starterCode, testCode: cleanedTest, solution: rawSolution || starterCode,
              repoId, repoName,
            });
          }
        } else {
          // Format 2: single-problem directory — meta.json has title/description/difficulty directly,
          // auto-detect test file (*_test.py or test_*.py) and skeleton (solution.py or *.py)
          if (repoName === repo && metaJson.title) repoName = repo;
          const title = metaJson.title || dirLabel;
          gitStatus.innerHTML = statusMsg(`Fetching files for "${title}"...`);

          // List directory contents to find test and skeleton files
          let dirFiles = [];
          try {
            const listing = await fetchRepoContents(owner, repo, branch, source.dir);
            dirFiles = listing.filter((f) => f.type === "file" && f.name.endsWith(".py"));
          } catch {}

          const testFileName = dirFiles.find((f) => f.name.match(/test/i))?.name;
          const skeletonFileName = dirFiles.find((f) => f.name !== testFileName && f.name !== "meta.json")?.name;

          if (!testFileName) { continue; }

          let rawTest = "";
          let rawSkeleton = "";
          try { rawTest = await fetchRawFile(owner, repo, branch, prefix + testFileName); }
          catch { continue; }

          if (skeletonFileName) {
            try { rawSkeleton = await fetchRawFile(owner, repo, branch, prefix + skeletonFileName); } catch {}
          }

          const cleanedTest = cleanUploadedTestCode(rawTest);
          const starterCode = rawSkeleton || generateStarterCode(cleanedTest);
          const difficulty = (metaJson.difficulty || "medium").split(/\s+/)[0]; // "easy to hard" → "easy"
          const problemId = `${repoId}-${title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "")}`;

          allProblems.push({
            id: problemId, title,
            difficulty,
            description: metaJson.description || title,
            detailedDescription: metaJson.description || title,
            examples: metaJson.examples || [], constraints: metaJson.constraints || [],
            tags: metaJson.topics || [dirLabel],
            starterCode, testCode: cleanedTest, solution: rawSkeleton || starterCode,
            repoId, repoName,
          });
        }
      }

      if (!foundAny) {
        gitError.textContent = "No meta.json found in any directory of the repository.";
        gitConfirm.disabled = false;
        gitConfirm.textContent = "Import Repository";
        gitStatus.innerHTML = "";
        return;
      }

      if (allProblems.length === 0) {
        gitError.textContent = "No valid problems could be imported.";
        gitConfirm.disabled = false;
        gitConfirm.textContent = "Import Repository";
        gitStatus.innerHTML = "";
        return;
      }

      // Step 4: Save the repository
      saveRepository({
        id: repoId,
        name: repoName,
        url: gitUrl.value.trim(),
        branch,
        owner,
        repo,
        problems: allProblems,
      });

      gitStatus.innerHTML = statusMsg(`Successfully imported ${allProblems.length} problem(s)!`, true);

      setTimeout(() => {
        closeGitDialog();
        activeTab = repoId;
        render();
      }, 800);
    } catch (err) {
      gitError.textContent = `Import failed: ${err.message}`;
      gitConfirm.disabled = false;
      gitConfirm.textContent = "Import Repository";
      gitStatus.innerHTML = "";
    }
  });

  function statusMsg(text, success = false) {
    const color = success ? "var(--success)" : "var(--accent-primary)";
    return `<div class="git-status-row" style="color:${color}">
      ${success ? "&#10003;" : '<span class="mini-spinner"></span>'}
      ${escapeHtml(text)}
    </div>`;
  }
});
