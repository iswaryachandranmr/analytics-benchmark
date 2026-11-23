"use strict";

const $ = (selector) => document.querySelector(selector);
const integer = new Intl.NumberFormat("en-US");
const currency = new Intl.NumberFormat("en-US", {style: "currency", currency: "USD"});
const fixed = (number) => number.toFixed(2);
const accuracy = (model) => 100 * model.correct / model.planned;
const milliseconds = (number) => `${integer.format(Math.round(number * 10) / 10)} ms`;
const estimateMark = (model) => model.estimated_cost !== null ? " est." : "";

const metrics = {
  correctness: {name: "Correctness", note: "Reference matches / assigned tasks", rule: "correct tasks ÷ assigned tasks", value: accuracy, format: (model) => `${fixed(accuracy(model))}%`, high: true},
  cost: {name: "Cost", note: "Total spend in USD · lower is better", rule: "lowest model spend ÷ model spend", value: (model) => model.cost, format: (model) => `${currency.format(model.cost)}${estimateMark(model)}`},
  speed: {name: "SQL speed", note: "Mean database time · lower is better", rule: "fastest mean SQL time ÷ model mean SQL time", value: (model) => model.avg_sql_ms, format: (model) => milliseconds(model.avg_sql_ms)},
};

function element(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

function renderFacts(data) {
  const facts = [["Models evaluated", data.models.length], ["Assigned tasks", data.tasks.length],
    ["Results scored", data.models.reduce((total, model) => total + model.reviewed, 0)]];
  for (const [label, value] of facts) {
    const group = element("div");
    group.append(element("dt", "", label), element("dd", "", integer.format(value)));
    $("#run-facts").append(group);
  }
  $("#run-facts").hidden = false;
}

function renderWeights(weights) {
  for (const [key, metric] of Object.entries(metrics)) {
    const weight = element("div", `weight ${key}`);
    weight.append(element("dt", "", metric.name), element("dd", "", `${weights[key]}%`));
    $("#weight-list").append(weight);
    const rule = element("div", key);
    rule.append(element("dt", "", `${metric.name} · ${weights[key]} pts`), element("dd", "", `${weights[key]} × (${metric.rule})`));
    $("#formula-list").append(rule);
  }
}

function renderLeaderboard(models, weights) {
  const buttons = [];
  function select(model) {
    for (const [index, button] of buttons.entries()) {
      button.setAttribute("aria-pressed", String(models[index] === model));
    }
    const detail = element("div", "detail-model");
    detail.append(element("strong", "", model.name), element("span", "", `${model.correct} correct / ${model.planned} tasks`));
    const contributions = Object.entries(metrics).map(([key, metric]) => {
      const group = element("div", `detail-metric ${key}`);
      group.append(element("span", "", `${metric.name} · ${metric.format(model)}`),
        element("strong", "", `${fixed(model.points[key])} / ${weights[key]} pts`));
      return group;
    });
    $("#score-detail").replaceChildren(detail, ...contributions);
  }

  for (const [index, model] of models.entries()) {
    const isWinner = index === 0;
    const item = element("li");
    const button = element("button", isWinner ? "score-row chart-leader" : "score-row");
    const modelName = element("span", "score-model");
    const modelLabel = element("span", "score-model-label");
    modelLabel.append(element("span", "", model.name));
    if (isWinner) modelLabel.append(element("span", "winner-label", "Highest weighted score"));
    modelName.append(element("span", "rank", String(index + 1).padStart(2, "0")), modelLabel);
    const track = element("span", "score-track");
    track.setAttribute("aria-hidden", "true");
    for (const [key, points] of Object.entries(model.points)) {
      const segment = element("span", `segment ${key}`);
      segment.style.width = `${points}%`;
      track.append(segment);
    }
    button.type = "button";
    button.setAttribute("aria-controls", "score-detail");
    button.setAttribute("aria-label", `${model.name}: ${fixed(model.score)} out of 100, ${isWinner ? "highest weighted score, rank 1" : `rank ${index + 1}`}`);
    button.addEventListener("click", () => select(model));
    button.append(modelName, track, element("strong", "score-total", fixed(model.score)));
    item.append(button);
    $("#score-chart").append(item);
    buttons.push(button);
  }
  select(models[0]);
}

function costColumns(models, max) {
  const plot = element("div", "cost-plot");
  plot.setAttribute("aria-hidden", "true");
  const columns = element("div", "cost-columns");
  for (const [index, model] of models.entries()) {
    const column = element("div", index === 0 ? "cost-column chart-leader" : "cost-column");
    const fill = element("span", "cost-fill");
    fill.style.height = `${100 * model.cost / max}%`;
    column.append(fill, element("span", "column-index", String(index + 1)));
    columns.append(column);
  }
  plot.append(element("span", "cost-ceiling", currency.format(max)), columns, element("span", "cost-origin", "$0"));
  return plot;
}

function renderMetrics(models) {
  for (const [key, metric] of Object.entries(metrics)) {
    const ordered = [...models].sort((first, second) => (metric.value(first) - metric.value(second)) * (metric.high ? -1 : 1));
    const max = metric.high ? 100 : metric.value(ordered[ordered.length - 1]);
    const chart = element("article", `metric-chart ${key}`);
    const list = element("ol");
    chart.append(element("h3", "", metric.name), element("p", "", metric.note));
    if (key === "cost") chart.append(costColumns(ordered, max));
    for (const [index, model] of ordered.entries()) {
      const row = element("li", index === 0 ? "chart-leader" : "");
      const label = element("div", "metric-label");
      const name = element("span", "metric-name");
      const mark = element("span", key === "correctness" ? "accuracy-ring" : "metric-index", key === "cost" ? String(index + 1) : "");
      mark.setAttribute("aria-hidden", "true");
      if (key === "correctness") mark.style.setProperty("--value", `${accuracy(model)}%`);
      if (key !== "speed") name.append(mark);
      name.append(element("span", "", model.name));
      if (model.key === models[0].key) {
        const overall = element("span", "overall-mark", "◆");
        overall.title = "Overall leader";
        overall.setAttribute("role", "img");
        overall.setAttribute("aria-label", "Overall leader");
        name.append(overall);
      }
      label.append(name, element("strong", "", metric.format(model)));
      row.append(label);
      if (key === "speed") {
        const track = element("div", "speed-track");
        track.setAttribute("aria-hidden", "true");
        const dot = element("span", "speed-dot");
        dot.style.left = `${100 * metric.value(model) / max}%`;
        track.append(dot);
        row.append(track);
      }
      list.append(row);
    }
    chart.append(list);
    if (key === "speed") {
      const scale = element("div", "speed-axis");
      scale.setAttribute("aria-hidden", "true");
      scale.append(element("span", "", "0 ms"), element("span", "", milliseconds(max)));
      chart.append(scale);
    }
    $("#metric-grid").append(chart);
  }
}

function taskOutcome(task) {
  if (task.score_percent === 100) return ["match", "Match"];
  if (task.score_percent === 0) return ["mismatch", "Mismatch"];
  if (task.status === "sql_error") return ["failed", "SQL timeout"];
  if (task.status === "tool_format_error") return ["failed", "Missing tool call"];
  return ["failed", "Not executed"];
}

function renderTask(task, model) {
  const [status, label] = taskOutcome(task);
  const details = element("details", "task");
  const summary = element("summary");
  const description = element("div", "task-description");
  description.append(element("span", "task-meta", `#${task.question_id} / ${task.database} / ${task.difficulty}`), element("strong", "", task.question));
  summary.append(description, element("span", "task-model", model.name), element("span", `outcome ${status}`, label));
  const panel = element("div", "task-panel");
  const stats = [];
  if (task.comparison) stats.push(task.comparison.replaceAll("_", " "));
  if (task.row_count !== null) stats.push(`${integer.format(task.row_count)} rows`);
  if (task.sql_ms !== null) stats.push(milliseconds(task.sql_ms));
  if (stats.length) panel.append(element("p", "task-meta", stats.join(" / ")));
  const queries = element("div", "queries");
  for (const [heading, query, missing] of [["Submitted SQL", task.sql, "No SQL was submitted."],
    ["Reference SQL", task.reference_sql, "Reference comparison is unavailable for this task."]]) {
    const column = element("div");
    column.append(element("h4", "", heading));
    if (query) {
      const pre = element("pre");
      pre.append(element("code", "", query));
      column.append(pre);
    } else column.append(element("p", "", missing));
    queries.append(column);
  }
  panel.append(queries);
  details.append(summary, panel);
  return details;
}

function renderExplorer({models, tasks}) {
  const names = new Map(models.map((model) => [model.key, model]));
  const controls = $("#filters");
  const filter = controls.elements;
  const size = 10;
  let page = 1;
  for (const model of models) $("#model-filter").add(new Option(model.name, model.key));

  function draw() {
    const query = filter.query.value.trim().toLowerCase();
    const found = tasks.filter((task) => (!filter.model.value || task.model === filter.model.value)
      && (!filter.outcome.value || taskOutcome(task)[0] === filter.outcome.value)
      && `${task.question_id} #${task.question_id} ${task.database} ${task.question}`.toLowerCase().includes(query));
    const pages = Math.max(1, Math.ceil(found.length / size));
    const start = (page - 1) * size;
    const current = found.slice(start, start + size);
    $("#task-count").textContent = found.length ? `Showing ${start + 1}–${start + current.length} of ${found.length} tasks` : "No tasks match. Try another search or change the filters.";
    $("#task-list").replaceChildren(...current.map((task) => renderTask(task, names.get(task.model))));
    $("#pagination").hidden = pages <= 1;
    $("#page-number").textContent = `Page ${page} of ${pages}`;
    $("#prev").disabled = page === 1;
    $("#next").disabled = page === pages;
  }

  controls.addEventListener("submit", (event) => event.preventDefault());
  controls.addEventListener("input", () => { page = 1; draw(); });
  $("#prev").addEventListener("click", () => { page -= 1; draw(); });
  $("#next").addEventListener("click", () => { page += 1; draw(); });
  draw();
}

async function load() {
  try {
    const response = await fetch("assets/benchmark.json");
    if (!response.ok) throw new Error(`Benchmark data returned HTTP ${response.status}`);
    const data = await response.json();
    data.models.sort((first, second) => second.score - first.score);
    renderFacts(data);
    renderWeights(data.weights);
    renderLeaderboard(data.models, data.weights);
    renderMetrics(data.models);
    renderExplorer(data);
    $("#dashboard").hidden = false;
    $("#load-state").hidden = true;
  } catch (error) {
    console.error(error);
    $("#load-state").textContent = "Benchmark results could not load. Reload the page to try again.";
  }
}

load();
