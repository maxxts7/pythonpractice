document.addEventListener("DOMContentLoaded", () => {
  const grid = document.getElementById("problems-grid");
  const statsBar = document.getElementById("stats-bar");

  // Count difficulties
  const counts = { easy: 0, medium: 0, hard: 0 };
  PROBLEMS.forEach((p) => counts[p.difficulty]++);

  // Render stats
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

  // Render problem cards
  PROBLEMS.forEach((problem, index) => {
    const card = document.createElement("div");
    card.className = "problem-card";
    card.addEventListener("click", () => {
      window.location.href = `practice.html?problem=${problem.id}`;
    });

    const tagsHtml = problem.tags
      .map((tag) => `<span class="tag">${tag}</span>`)
      .join("");

    card.innerHTML = `
      <div class="card-header">
        <h3>${problem.title}</h3>
        <span class="badge badge-${problem.difficulty}">${problem.difficulty}</span>
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
});
