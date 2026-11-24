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

let pinnedChartDetail = null;

function bindChartDetail(target, title, details, keyboard = false) {
  const tooltip = $("#chart-tooltip");
  const selectable = !target.matches(".score-row, .scatter-point, .tradeoff-model");
  target.classList.add("chart-detail-target");
  target.dataset.selectionKey = title;
  if (keyboard) {
    target.tabIndex = 0;
    target.setAttribute("aria-label", [title, ...details].join(". "));
    target.setAttribute("role", "button");
  }
  if (selectable) target.setAttribute("aria-pressed", "false");
  if (keyboard) {
    target.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        target.click();
      }
    });
  }

  function show() {
    tooltip.replaceChildren(element("strong", "", title), ...details.map((detail) => element("span", "", detail)));
    tooltip.hidden = false;
    const bounds = target.getBoundingClientRect();
    const left = Math.min(innerWidth - tooltip.offsetWidth - 12, Math.max(12, bounds.left + (bounds.width - tooltip.offsetWidth) / 2));
    const above = bounds.top - tooltip.offsetHeight - 9;
    tooltip.style.left = `${left}px`;
    tooltip.style.top = `${above >= 8 ? above : Math.min(innerHeight - tooltip.offsetHeight - 8, bounds.bottom + 9)}px`;
  }

  function hide() {
    if (pinnedChartDetail?.target.isConnected) pinnedChartDetail.show();
    else tooltip.hidden = true;
  }
  target.addEventListener("pointerenter", (event) => { if (event.pointerType !== "touch") show(); });
  target.addEventListener("pointerleave", () => { if (!target.matches(":focus-visible")) hide(); });
  target.addEventListener("focus", show);
  target.addEventListener("blur", hide);
  target.addEventListener("click", () => {
    if (selectable) {
      const scope = target.closest(".metric-chart, .chart-panel, .difficulty") || target.parentElement;
      const selected = target.getAttribute("aria-pressed") !== "true";
      for (const item of scope.querySelectorAll(".chart-detail-target")) {
        const active = selected && item.dataset.selectionKey === title;
        item.classList.toggle("is-pinned", active);
        item.setAttribute("aria-pressed", String(active));
      }
      pinnedChartDetail = selected ? { target, show } : null;
      if (!selected) { tooltip.hidden = true; return; }
    }
    show();
  });
}

window.addEventListener("scroll", () => { $("#chart-tooltip").hidden = true; }, { passive: true });
window.addEventListener("resize", () => { $("#chart-tooltip").hidden = true; });
document.addEventListener("keydown", (event) => {
  if (event.key !== "Escape") return;
  pinnedChartDetail = null;
  for (const target of document.querySelectorAll(".is-pinned")) {
    target.classList.remove("is-pinned");
    target.setAttribute("aria-pressed", "false");
  }
  for (const target of document.querySelectorAll(".scatter-point.selected, .tradeoff-model[aria-pressed='true']")) {
    target.classList.remove("selected");
    target.setAttribute("aria-pressed", "false");
  }
  for (const guide of document.querySelectorAll(".scatter-guides")) guide.hidden = true;
  $("#chart-tooltip").hidden = true;
});
document.addEventListener("pointerdown", (event) => { if (!event.target.closest(".chart-detail-target")) $("#chart-tooltip").hidden = true; });

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
  $("#leaderboard-weight-summary").textContent = `${weights.correctness}% accuracy, ${weights.cost}% cost, ${weights.speed}% SQL speed.`;
  for (const [key, metric] of Object.entries(metrics)) {
    const rule = element("div", key);
    rule.append(element("dt", "", `${metric.name} · ${weights[key]} pts`), element("dd", "", `${weights[key]} × (${metric.rule})`));
    $("#formula-list").append(rule);
  }
}

function createModelInspector(model, sequence) {
  const inspector = element("div", "model-inspector");
  const provider = model.key.startsWith("claude") ? "anthropic" : model.key.startsWith("gpt") ? "openai" : model.key.startsWith("gemini") ? "googlegemini" : "kimi";
  const header = element("div", "model-provider");
  const icon = element("img", "provider-icon");
  icon.src = `assets/${provider}.svg`;
  icon.alt = "";
  icon.width = 24;
  icon.height = 24;
  header.append(icon, element("strong", "", model.name));

  const donut = element("div", "model-donut");
  const namespace = "http://www.w3.org/2000/svg";
  const svg = document.createElementNS(namespace, "svg");
  svg.setAttribute("viewBox", "0 0 120 120");
  svg.setAttribute("aria-hidden", "true");
  function circle(className) {
    const node = document.createElementNS(namespace, "circle");
    node.setAttribute("cx", "60");
    node.setAttribute("cy", "60");
    node.setAttribute("r", "49");
    node.setAttribute("pathLength", "100");
    node.setAttribute("fill", "none");
    node.setAttribute("stroke-width", "8");
    node.setAttribute("transform", "rotate(-90 60 60)");
    node.setAttribute("class", className);
    return node;
  }
  const track = circle("model-ring-track");
  const definitions = document.createElementNS(namespace, "defs");
  const mask = document.createElementNS(namespace, "mask");
  const maskId = `model-ring-${sequence}`;
  mask.setAttribute("id", maskId);
  mask.setAttribute("maskUnits", "userSpaceOnUse");
  mask.setAttribute("x", "0");
  mask.setAttribute("y", "0");
  mask.setAttribute("width", "120");
  mask.setAttribute("height", "120");
  const sweep = circle("model-ring-sweep");
  sweep.setAttribute("stroke", "white");
  sweep.setAttribute("stroke-width", "10");
  sweep.setAttribute("stroke-dasharray", "100 100");
  sweep.setAttribute("stroke-dashoffset", "100");
  mask.append(sweep);
  definitions.append(mask);
  const segments = document.createElementNS(namespace, "g");
  segments.setAttribute("mask", `url(#${maskId})`);
  const contributions = element("dl", "model-contributions");
  let offset = 0;
  for (const [key, metric] of Object.entries(metrics)) {
    const portion = model.points[key];
    const segment = circle(`model-ring-segment ${key}`);
    segment.setAttribute("stroke-dasharray", `${portion} ${100 - portion}`);
    segment.setAttribute("stroke-dashoffset", String(-offset));
    segments.append(segment);
    offset += portion;
    const item = element("div", key);
    item.append(element("dt", "", key === "correctness" ? "Accuracy" : metric.name), element("dd", "", `${fixed(model.points[key])} pts`));
    contributions.append(item);
  }
  svg.append(definitions, track, segments);
  const center = element("div", "model-ring-center");
  center.append(element("strong", "", fixed(model.score)), element("span", "", "out of 100"));
  donut.append(svg, center);
  inspector.append(header, donut, contributions);
  return inspector;
}

function animateModelRing(inspector, score) {
  const sweep = inspector.querySelector(".model-ring-sweep");
  const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)");
  const damping = 5;
  const normalization = 1 - (1 + damping) * Math.exp(-damping);
  let startedAt = null;
  function frame(timestamp) {
    if (!inspector.isConnected) return;
    if (reducedMotion.matches) {
      sweep.setAttribute("stroke-dashoffset", String(100 - score));
      return;
    }
    if (startedAt === null) startedAt = timestamp + 120;
    const elapsed = Math.max(0, Math.min(1, (timestamp - startedAt) / 1920));
    const progress = (1 - (1 + damping * elapsed) * Math.exp(-damping * elapsed)) / normalization;
    sweep.setAttribute("stroke-dashoffset", String(100 - score * progress));
    if (elapsed < 1) requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
}

function renderLeaderboard(models, weights) {
  const buttons = [];
  let viewerSequence = 0;
  const viewer = $("#model-viewer");
  $("#winning-score").textContent = fixed(models[0].score);
  $("#winning-model").textContent = models[0].name;
  async function inspect(model) {
    const sequence = ++viewerSequence;
    const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;
    const previous = viewer.firstElementChild;
    if (!reducedMotion && previous) {
      previous.getAnimations().forEach((animation) => animation.cancel());
      await previous.animate([
        { opacity: 1, transform: "translateY(0) scale(1)" },
        { opacity: 0, transform: "translateY(-12px) scale(.94)" },
      ], { duration: 160, easing: "ease-in", fill: "forwards" }).finished.catch(() => {});
    }
    if (sequence !== viewerSequence) return;
    viewer.setAttribute("aria-label", `${model.name} score breakdown`);
    const inspector = createModelInspector(model, sequence);
    viewer.replaceChildren(inspector);
    animateModelRing(inspector, model.score);
  }
  function select(model, showViewer = false) {
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
    if (showViewer) inspect(model);
  }

  for (const [index, model] of models.entries()) {
    const isWinner = index === 0;
    const item = element("li");
    item.style.setProperty("--row-delay", `${index * 86}ms`);
    const button = element("button", isWinner ? "score-row chart-leader" : "score-row");
    const modelName = element("span", "score-model");
    const modelLabel = element("span", "score-model-label");
    modelLabel.append(element("span", "", model.name));
    if (isWinner) modelLabel.append(element("span", "winner-label", "Highest weighted score"));
    modelName.append(element("span", "rank", String(index + 1).padStart(2, "0")), modelLabel);
    const track = element("span", "score-track");
    track.setAttribute("aria-hidden", "true");
    const fill = element("span", "score-fill");
    fill.style.width = `${model.score}%`;
    for (const [key, points] of Object.entries(model.points)) {
      const segment = element("span", `segment ${key}`);
      segment.style.width = `${model.score ? 100 * points / model.score : 0}%`;
      fill.append(segment);
    }
    track.append(fill);
    button.type = "button";
    button.setAttribute("aria-controls", "score-detail model-viewer");
    button.setAttribute("aria-label", `${model.name}: ${fixed(model.score)} out of 100, ${isWinner ? "highest weighted score, rank 1" : `rank ${index + 1}`}`);
    button.addEventListener("click", () => select(model, true));
    bindChartDetail(button, `${model.name} · ${fixed(model.score)} / 100`,
      Object.entries(metrics).map(([key, metric]) => `${metric.name}: ${metric.format(model)} · ${fixed(model.points[key])} / ${weights[key]} pts`));
    button.append(modelName, track, element("strong", "score-total", fixed(model.score)));
    item.append(button);
    $("#score-chart").append(item);
    buttons.push(button);
  }
  select(models[0]);
}

function costColumns(models, max) {
  const plot = element("div", "cost-plot");
  const columns = element("div", "cost-columns");
  for (const [index, model] of models.entries()) {
    const column = element("div", index === 0 ? "cost-column chart-leader" : "cost-column");
    const track = element("div", "cost-bar-track");
    const fill = element("span", "cost-fill");
    fill.style.height = `${100 * model.cost / max}%`;
    track.append(fill);
    column.append(track, element("span", "column-index", String(index + 1)));
    bindChartDetail(column, model.name, [`Total spend: ${metrics.cost.format(model)}`], true);
    columns.append(column);
  }
  plot.append(element("span", "cost-ceiling", currency.format(max)), columns, element("span", "cost-origin", "$0"));
  return plot;
}

function metricPlot(key, models, max) {
  if (key === "cost") return costColumns(models, max);
  const plot = element("div", `metric-plot ${key}-plot`);
  for (const [index, model] of models.entries()) {
    const item = element("div", `metric-plot-item${index === 0 ? " chart-leader" : ""}`);
    const number = element("span", "metric-index", String(index + 1));
    if (key === "correctness") {
      const ring = element("span", "accuracy-ring");
      ring.style.setProperty("--value", `${accuracy(model)}%`);
      item.append(ring, number);
    } else {
      const track = element("div", "speed-track");
      const dot = element("span", "speed-dot");
      dot.style.left = `${100 * model.avg_sql_ms / max}%`;
      track.append(dot);
      item.append(number, track);
    }
    bindChartDetail(item, model.name, [`${metrics[key].name}: ${metrics[key].format(model)}`], true);
    plot.append(item);
  }
  if (key === "speed") {
    const scale = element("div", "speed-axis");
    scale.setAttribute("aria-hidden", "true");
    scale.append(element("span", "", "0 ms"), element("span", "", milliseconds(max)));
    plot.append(scale);
  }
  return plot;
}

function renderMetrics(models) {
  for (const [key, metric] of Object.entries(metrics)) {
    const ordered = [...models].sort((first, second) => (metric.value(first) - metric.value(second)) * (metric.high ? -1 : 1));
    const max = metric.high ? 100 : metric.value(ordered[ordered.length - 1]);
    const chart = element("article", `metric-chart ${key}`);
    const body = element("div", "metric-body");
    const list = element("ol");
    chart.append(element("h3", "", metric.name), element("p", "", metric.note));
    body.append(metricPlot(key, ordered, max));
    for (const [index, model] of ordered.entries()) {
      const row = element("li", index === 0 ? "chart-leader" : "");
      const context = key === "correctness" ? `${model.correct} correct out of ${model.planned} tasks`
        : key === "cost" ? "Includes all saved attempts" : `${model.executed} SQL executions completed`;
      bindChartDetail(row, model.name, [`${metric.name}: ${metric.format(model)}`, context], true);
      const label = element("div", "metric-label");
      const name = element("span", "metric-name");
      const mark = element("span", "metric-index", String(index + 1));
      mark.setAttribute("aria-hidden", "true");
      name.append(mark);
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
      list.append(row);
    }
    body.append(list);
    chart.append(body);
    $("#metric-grid").append(chart);
  }
}

const efficiencyMetrics = {
  cost: {label: "Cost per task", value: (model) => model.cost / model.planned, format: (value) => `$${value.toFixed(4)}`,
    description: "Total saved spend divided by assigned tasks. Lower is better.",
    note: "Includes reported charges and estimates where billing was unavailable."},
  time: {label: "Time per task", value: (model) => model.elapsed_ms == null ? null : model.elapsed_ms / model.planned / 1000,
    format: (value) => `${value.toFixed(1)} s`, description: "Mean active elapsed time per assigned task. Lower is better.",
    note: "Includes model requests, SQL execution, and saved retries; excludes idle time between attempts."},
  tokens: {label: "Output tokens", value: (model) => model.completion_tokens == null ? null : model.completion_tokens / model.planned,
    format: (value) => integer.format(Math.round(value)), description: "Mean reported completion tokens per assigned task.",
    note: "Includes reasoning where counted by the provider. Attempts without token usage contribute no reported tokens."},
  successfulCost: {label: "Cost per correct answer", value: (model) => model.correct ? model.cost / model.correct : null,
    format: (value) => `$${value.toFixed(4)}`, description: "Total saved spend divided by correct answers. Lower is better.",
    note: "Includes spending on failed tasks and mismatched results. Estimated charges are marked."},
};

function metricSwitcher(container, keys, draw) {
  const buttons = keys.map((key) => {
    const button = element("button", "", efficiencyMetrics[key].label);
    button.type = "button";
    button.addEventListener("click", () => select(key));
    container.append(button);
    return button;
  });
  function select(key) {
    buttons.forEach((button, index) => button.setAttribute("aria-pressed", String(keys[index] === key)));
    draw(key, efficiencyMetrics[key]);
  }
  select(keys[0]);
}

function metricText(key, metric, model) {
  return metric.format(metric.value(model)) + (key === "cost" || key === "successfulCost" ? estimateMark(model) : "");
}

function drawEfficiencyRank(models, key, metric) {
  const rows = models.filter((model) => metric.value(model) != null).sort((first, second) => metric.value(first) - metric.value(second));
  const max = Math.max(...rows.map(metric.value), 1e-12);
  const unmetered = models.reduce((count, model) => count + model.attempts - model.metered_attempts, 0);
  $("#efficiency-chart-title").textContent = key === "tokens" ? "Output tokens per task" : metric.label;
  $("#efficiency-description").textContent = metric.description;
  $("#efficiency-note").textContent = metric.note + (key === "tokens" && unmetered ? ` Attempts without usage: ${unmetered}.` : "");
  $("#efficiency-rank").replaceChildren(...rows.map((model, index) => {
    const row = element("li", index === 0 ? "chart-leader" : "");
    const track = element("div", "efficiency-track");
    track.setAttribute("aria-hidden", "true");
    const bar = element("span", "efficiency-bar");
    bar.style.height = `${100 * metric.value(model) / max}%`;
    track.append(bar);
    row.append(element("strong", "efficiency-value", metricText(key, metric, model)), track, element("span", "efficiency-name", model.name));
    bindChartDetail(row, model.name, [`${key === "tokens" ? "Output tokens per task" : metric.label}: ${metricText(key, metric, model)}`, `Rank ${index + 1} of ${rows.length}`], true);
    return row;
  }));
}

function logarithmicTicks(values) {
  const minimum = Math.min(...values);
  const maximum = Math.max(...values);
  const start = Math.floor(Math.log10(minimum));
  const end = Math.ceil(Math.log10(maximum));
  const ticks = [];
  for (let exponent = start; exponent <= end; exponent += 1) {
    for (const multiplier of [1, 2, 5]) ticks.push(multiplier * 10 ** exponent);
  }
  const first = ticks.findLastIndex((tick) => tick <= minimum);
  const last = ticks.findIndex((tick) => tick >= maximum);
  return ticks.slice(first, Math.max(last, first + 1) + 1);
}

function drawTradeoff(models, key, metric) {
  const ranked = models.filter((model) => metric.value(model) > 0).sort((first, second) => metric.value(first) - metric.value(second) || accuracy(second) - accuracy(first));
  const ticks = logarithmicTicks(ranked.map(metric.value));
  const low = Math.log10(ticks[0]);
  const high = Math.log10(ticks.at(-1));
  const bottom = Math.max(0, Math.floor((Math.min(...ranked.map(accuracy)) - 4) / 10) * 10);
  const x = (value) => 3 + 94 * (Math.log10(value) - low) / (high - low);
  const y = (value) => 5 + 90 * (100 - value) / (100 - bottom);
  const scatter = element("div", "scatter-inner");
  const points = new Map();
  const labels = new Map();
  const tradeoffTitle = key === "tokens" ? "output tokens per task" : metric.label.toLowerCase();
  $("#tradeoff-title").textContent = `Correctness vs. ${tradeoffTitle}`;

  function gridline(kind, position, text) {
    const line = element("div", `scatter-grid ${kind}`);
    line.style.setProperty("--position", `${position}%`);
    line.setAttribute("aria-hidden", "true");
    line.append(element("span", "", text));
    scatter.append(line);
  }

  for (let value = bottom; value <= 100; value += 10) gridline("horizontal", y(value), `${value}%`);
  ticks.forEach((value) => gridline("vertical", x(value), metric.format(value)));

  let bestAccuracy = -Infinity;
  const frontier = ranked.filter((model) => {
    if (accuracy(model) <= bestAccuracy) return false;
    bestAccuracy = accuracy(model);
    return true;
  });
  const namespace = "http://www.w3.org/2000/svg";
  const svg = document.createElementNS(namespace, "svg");
  svg.setAttribute("viewBox", "0 0 100 100");
  svg.setAttribute("preserveAspectRatio", "none");
  svg.setAttribute("aria-hidden", "true");
  const path = document.createElementNS(namespace, "polyline");
  path.setAttribute("points", frontier.map((model) => `${x(metric.value(model))},${y(accuracy(model))}`).join(" "));
  svg.append(path);
  scatter.append(svg);

  const guides = element("div", "scatter-guides");
  guides.setAttribute("aria-hidden", "true");
  const horizontalGuide = element("div", "scatter-guide horizontal");
  const verticalGuide = element("div", "scatter-guide vertical");
  const accuracyValue = element("span", "scatter-axis-value accuracy-value");
  const resourceValue = element("span", "scatter-axis-value resource-value");
  horizontalGuide.append(accuracyValue);
  verticalGuide.append(resourceValue);
  guides.append(horizontalGuide, verticalGuide);
  guides.hidden = true;
  scatter.append(guides);

  function select(model) {
    const selectedModel = points.get(model.key)?.classList.contains("selected") ? null : model.key;
    for (const [key, point] of points) {
      point.classList.toggle("selected", key === selectedModel);
      point.setAttribute("aria-pressed", String(key === selectedModel));
    }
    for (const [key, label] of labels) label.setAttribute("aria-pressed", String(key === selectedModel));
    guides.hidden = !selectedModel;
    if (!selectedModel) return;
    horizontalGuide.style.top = `${y(accuracy(model))}%`;
    horizontalGuide.style.width = `${x(metric.value(model))}%`;
    verticalGuide.style.left = `${x(metric.value(model))}%`;
    verticalGuide.style.top = `${y(accuracy(model))}%`;
    verticalGuide.style.height = `${100 - y(accuracy(model))}%`;
    accuracyValue.textContent = `${fixed(accuracy(model))}%`;
    resourceValue.textContent = metricText(key, metric, model);
  }

  const items = models.flatMap((model, index) => {
    if (!(metric.value(model) > 0)) return [];
    const marker = String(index + 1);
    const point = element("button", `scatter-point${index === 0 ? " chart-leader" : ""}`, marker);
    point.type = "button";
    point.setAttribute("aria-label", `${model.name}: ${fixed(accuracy(model))}% correct, ${metricText(key, metric, model)}`);
    point.style.left = `${x(metric.value(model))}%`;
    point.style.top = `${y(accuracy(model))}%`;
    point.addEventListener("click", () => select(model));
    const pointDetails = [`Accuracy: ${fixed(accuracy(model))}%`, `${tradeoffTitle}: ${metricText(key, metric, model)}`];
    bindChartDetail(point, model.name, pointDetails);
    points.set(model.key, point);
    scatter.append(point);
    const item = element("li");
    const label = element("button", "tradeoff-model");
    label.type = "button";
    const copy = element("span");
    copy.append(element("strong", "", model.name), element("small", "", `${fixed(accuracy(model))}% correct / ${metricText(key, metric, model)}`));
    label.append(element("span", "tradeoff-index", marker), copy);
    label.addEventListener("click", () => select(model));
    bindChartDetail(label, model.name, pointDetails);
    labels.set(model.key, label);
    item.append(label);
    return [item];
  });
  $("#tradeoff-plot").replaceChildren(scatter);
  $("#tradeoff-models").replaceChildren(...items);
  const frontierNote = frontier.length === 1
    ? `${frontier[0].name} leads on both axes.`
    : `Best trade-offs: ${frontier.map((model) => model.name).join(" and ")}. The dashed line connects these measured models; it is not a trend line. Other models offer no accuracy gain for their resource use.`;
  $("#tradeoff-frontier-key").hidden = frontier.length < 2;
  $("#tradeoff-note").textContent = `Horizontal axis uses a log scale. ${frontierNote} Ivory marks the weighted leader.`;
}

function drawDifficulty(models, tasks) {
  const tiers = ["simple", "moderate", "hard"];
  const table = $("#difficulty-table");
  const heading = table.createTHead().insertRow();
  for (const title of ["Model", "Simple", "Moderate", "Hard"]) {
    const cell = element("th", "", title);
    cell.scope = "col";
    heading.append(cell);
  }
  const groups = models.map((model) => tiers.map((tier) => {
    const assigned = tasks.filter((task) => task.model === model.key && task.difficulty === tier);
    return {planned: assigned.length, passed: assigned.filter((task) => task.score_percent === 100).length};
  }));
  const best = tiers.map((_, index) => Math.max(...groups.map((group) => group[index].passed / (group[index].planned || 1))));
  const body = table.createTBody();
  for (const [index, model] of models.entries()) {
    const row = body.insertRow();
    const name = element("th", "", model.name);
    name.scope = "row";
    row.append(name);
    groups[index].forEach(({passed, planned}, tier) => {
      const cell = row.insertCell();
      if (!planned) { cell.textContent = "—"; return; }
      const ratio = passed / planned;
      if (ratio === best[tier]) cell.classList.add("chart-leader");
      cell.style.setProperty("--heat", `${Math.round(5 + 30 * ratio)}%`);
      cell.append(element("strong", "", `${integer.format(100 * ratio)}%`), element("small", "", `${passed}/${planned}`));
      bindChartDetail(cell, `${model.name} · ${tiers[tier]}`, [`${passed} of ${planned} tasks correct`, `${planned - passed} mismatched or not executed`], true);
    });
  }
}

function renderEfficiency(models, tasks) {
  if (!models.every((model) => "completion_tokens" in model)) return;
  metricSwitcher($("#efficiency-controls"), Object.keys(efficiencyMetrics), (key, metric) => drawEfficiencyRank(models, key, metric));
  const tradeoffs = ["cost", "time", "tokens"].filter((key) => models.some((model) => efficiencyMetrics[key].value(model) > 0));
  metricSwitcher($("#tradeoff-controls"), tradeoffs, (key, metric) => drawTradeoff(models, key, metric));
  drawDifficulty(models, tasks);
  $("#efficiency").hidden = false;
}


async function loadBenchmarkData() {
  if (location.protocol === "file:") {
    await new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.src = "assets/benchmark-preview.js";
      script.onload = resolve;
      script.onerror = () => reject(new Error("The local benchmark preview data could not load."));
      document.head.append(script);
    });
    return window.queryBenchmarkPreview;
  }
  const response = await fetch("assets/benchmark.json?v=weighted-chart");
  if (!response.ok) throw new Error(`Benchmark data returned HTTP ${response.status}`);
  return response.json();
}

async function load() {
  try {
    const data = await loadBenchmarkData();
    data.models.sort((first, second) => second.score - first.score);
    renderFacts(data);
    renderWeights(data.weights);
    renderLeaderboard(data.models, data.weights);
    renderMetrics(data.models);
    renderEfficiency(data.models, data.tasks);
    for (const selector of ["#leaderboard", "#metrics", "#method"]) $(selector).hidden = false;
    $("#load-state").hidden = true;
    if (location.hash) document.getElementById(location.hash.slice(1))?.scrollIntoView();
  } catch (error) {
    console.error(error);
    $("#load-state .load-state").textContent = "Benchmark results could not load. Reload the page to try again.";
  }
}

load();
