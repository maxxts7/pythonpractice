// === Built-in default problems ===
// Pulled from https://github.com/maxxts7/PracticePython
// The .py files live under ./default-problems/ and are imported verbatim via
// Vite's ?raw suffix, so the Python stays pristine (no escaping). Each problem
// ships a skeleton (solution.py) with TODO methods plus a unittest test file.

import libraryStarter from "./default-problems/library_management/solution.py?raw";
import libraryTest from "./default-problems/library_management/solution_test.py?raw";
import dictStarter from "./default-problems/dictionary_functions/solution.py?raw";
import dictTest from "./default-problems/dictionary_functions/solution_test.py?raw";
import fsStarter from "./default-problems/filesystem_design/solution.py?raw";
import fsTest from "./default-problems/filesystem_design/solution_test.py?raw";
import stringStarter from "./default-problems/string_operations/solution.py?raw";
import stringTest from "./default-problems/string_operations/solution_test.py?raw";

export const DEFAULT_REPO_ID = "default-practicepython";
export const DEFAULT_REPO_NAME = "PracticePython";

// Strip the "from solution import X" line and the "if __name__ == '__main__'"
// guard so the displayed test file matches the exec environment (the user's
// class is defined in the same globals). Mirrors cleanUploadedTestCode in
// main-page.js / cleanTestCode in pyodide-runner.js used for uploaded and
// git-imported problems.
function cleanTestCode(code) {
  const lines = code.split("\n");
  const result = [];
  let skipBlock = false;
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.match(/^from\s+solution\s+import\b/) || trimmed.match(/^import\s+solution\b/)) continue;
    if (trimmed.match(/^if\s+__name__\s*==\s*['"]__main__['"]\s*:/)) {
      skipBlock = true;
      continue;
    }
    if (skipBlock) {
      if (trimmed === "" || line.match(/^\s+/)) continue;
      skipBlock = false;
    }
    if (trimmed.match(/^unittest\.main\s*\(/)) continue;
    result.push(line);
  }
  return result.join("\n");
}

function makeProblem({ slug, title, difficulty, description, tags, starter, test }) {
  return {
    id: `${DEFAULT_REPO_ID}-${slug}`,
    title,
    difficulty,
    description,
    detailedDescription: description,
    examples: [],
    constraints: [],
    tags,
    starterCode: starter,
    testCode: cleanTestCode(test),
    // No reference solution ships with the repo, so "Show Solution" falls back
    // to the skeleton — same as a git-imported problem without a solution file.
    solution: starter,
    repoId: DEFAULT_REPO_ID,
    repoName: DEFAULT_REPO_NAME,
  };
}

export const DEFAULT_PROBLEMS = [
  makeProblem({
    slug: "string-operations-toolkit",
    title: "String Operations Toolkit",
    difficulty: "easy",
    description:
      "Implement utility functions that operate on strings: word counts, character frequency, longest word, and a Caesar cipher.",
    tags: ["strings"],
    starter: stringStarter,
    test: stringTest,
  }),
  makeProblem({
    slug: "dictionary-toolkit",
    title: "Dictionary Toolkit",
    difficulty: "easy",
    description:
      "Implement utility functions that operate on dictionaries: value-frequency counts, merge-with-sum, max-value key, and flattening nested dicts.",
    tags: ["dictionaries"],
    starter: dictStarter,
    test: dictTest,
  }),
  makeProblem({
    slug: "in-memory-file-system",
    title: "In-Memory File System",
    difficulty: "medium",
    description:
      "Build an in-memory file system supporting directory listing, appending to files, recursive deletion, and finding files by extension.",
    tags: ["design", "recursion", "trees"],
    starter: fsStarter,
    test: fsTest,
  }),
  makeProblem({
    slug: "library-management-system",
    title: "Library Management System",
    difficulty: "hard",
    description:
      "Implement book reservations, overdue tracking, and member borrowing history for a library system.",
    tags: ["classes", "dictionaries", "dates"],
    starter: libraryStarter,
    test: libraryTest,
  }),
];
