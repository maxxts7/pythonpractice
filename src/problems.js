// === Problem & Repository Storage ===
// No built-in problems — only user-uploaded and git-imported problems.

const STORAGE_KEYS = {
  customProblems: "pypractice-custom-problems",
  repositories: "pypractice-repositories",
};

function loadCustomProblems() {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.customProblems);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function loadRepositories() {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.repositories);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function rebuildProblems() {
  PROBLEMS.length = 0;
  const custom = loadCustomProblems();
  const repos = loadRepositories();
  const repoProblems = repos.flatMap((r) => r.problems || []);
  PROBLEMS.push(...custom, ...repoProblems);
}

// === Custom (uploaded) problems ===

export function saveCustomProblem(problem) {
  const custom = loadCustomProblems();
  const existing = custom.findIndex((p) => p.id === problem.id);
  if (existing !== -1) {
    custom[existing] = problem;
  } else {
    custom.push(problem);
  }
  localStorage.setItem(STORAGE_KEYS.customProblems, JSON.stringify(custom));
  rebuildProblems();
}

export function deleteCustomProblem(id) {
  const custom = loadCustomProblems().filter((p) => p.id !== id);
  localStorage.setItem(STORAGE_KEYS.customProblems, JSON.stringify(custom));
  rebuildProblems();
}

export function isCustomProblem(id) {
  return loadCustomProblems().some((p) => p.id === id);
}

export function getCustomProblems() {
  return loadCustomProblems();
}

// === Repository management ===

export function getRepositories() {
  return loadRepositories();
}

export function saveRepository(repo) {
  const repos = loadRepositories();
  const existing = repos.findIndex((r) => r.id === repo.id);
  if (existing !== -1) {
    repos[existing] = repo;
  } else {
    repos.push(repo);
  }
  localStorage.setItem(STORAGE_KEYS.repositories, JSON.stringify(repos));
  rebuildProblems();
}

export function deleteRepository(repoId) {
  const repos = loadRepositories().filter((r) => r.id !== repoId);
  localStorage.setItem(STORAGE_KEYS.repositories, JSON.stringify(repos));
  rebuildProblems();
}

export function isRepoProblem(id) {
  return loadRepositories().some((r) => (r.problems || []).some((p) => p.id === id));
}

// === Combined problems array (custom + repo) ===

export const PROBLEMS = [];
rebuildProblems();
