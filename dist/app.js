'use strict';

const $ = (selector) => document.querySelector(selector);
const number = new Intl.NumberFormat('en-US');
const percent = (value) => `${(value * 100).toFixed(value === 1 ? 0 : 1)}%`;
const escapeHTML = (value) => String(value ?? '').replace(/[&<>"']/g, (char) => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
let benchmark;
let activeFilter = 'all';
let selectedRun;

async function initialize() {
  try {
    const response = await fetch('./assets/benchmark.json');
    if (!response.ok) throw new Error(`Results could not be loaded (${response.status}).`);
    benchmark = await response.json();
    const runs = benchmark.runs;
    $('#nav-models').textContent = runs.length;
    $('#model-count').textContent = `${runs.length} models`;
    $('#stat-models').textContent = runs.length;
    $('#stat-questions').textContent = benchmark.questions.length;
    const attempts = runs.reduce((sum, run) => sum + run.task_count, 0);
    const executions = runs.reduce((sum, run) => sum + run.execution_success_count, 0);
    $('#stat-queries').textContent = number.format(attempts);
    $('#stat-execution').textContent = `${executions} completed without errors`;
    $('#stat-accuracy').textContent = percent(runs.reduce((sum, run) => sum + run.accuracy, 0) / runs.length);
    $('#updated-label').textContent = `Updated ${new Intl.DateTimeFormat('en-US', {month:'long',day:'numeric',year:'numeric',timeZone:'UTC'}).format(new Date(benchmark.updated + 'T12:00:00Z'))}`;
    renderRankings();
    renderHeatmap();
    renderTokens();
    connectControls();
  } catch (error) {
    $('#rankings-body').innerHTML = '<tr><td colspan="7" class="empty-row">Results are unavailable. Please refresh the page.</td></tr>';
    $('#error-banner').hidden = false;
    $('#error-banner').textContent = error.message;
  }
}

function rankedRuns() {
  return [...benchmark.runs].sort((a, b) => b.accuracy - a.accuracy || a.model.localeCompare(b.model));
}

function renderRankings() {
  const search = $('#model-search').value.trim().toLocaleLowerCase();
  let visible = benchmark.runs.filter((run) => run.model.toLocaleLowerCase().includes(search) && (activeFilter !== 'perfect' || run.correct_count === run.task_count));
  const sort = $('#sort-select').value;
  visible.sort(sort === 'tokens' ? (a, b) => a.total_tokens_reported - b.total_tokens_reported : sort === 'name' ? (a, b) => a.model.localeCompare(b.model) : (a, b) => b.accuracy - a.accuracy || a.model.localeCompare(b.model));
  $('#rankings-body').innerHTML = visible.length ? visible.map((run) => {
    const rank = 1 + benchmark.runs.filter((other) => other.accuracy > run.accuracy).length;
    const index = benchmark.runs.indexOf(run);
    return `<tr><td class="rank-cell"><span class="rank-value">${String(rank).padStart(2,'0')}</span></td><td><div class="model-cell"><span class="model-icon model-${index % 4}" aria-hidden="true">${escapeHTML(run.model[0])}</span><div><strong>${escapeHTML(run.model)}</strong><small>${escapeHTML(run.provider)} · SQLite</small></div></div></td><td class="accuracy-cell"><span class="accuracy-label">${percent(run.accuracy)}</span><div class="accuracy-meter ${run.accuracy < 1 ? 'partial' : ''}" aria-hidden="true"><span style="width:${run.accuracy * 100}%"></span></div></td><td class="number">${run.correct_count}<span class="muted"> / ${run.task_count}</span></td><td class="number muted">${number.format(run.total_tokens_reported)}</td><td class="number muted">${run.cost_usd_reported == null ? 'Not supplied' : '$' + run.cost_usd_reported.toFixed(2)}</td><td><button class="run-button" data-run="${escapeHTML(run.run_id)}" aria-label="Inspect ${escapeHTML(run.model)}">View <span aria-hidden="true">↗</span></button></td></tr>`;
  }).join('') : '<tr><td colspan="7" class="empty-row">No models match these filters. Try another name or select All models.</td></tr>';
  $('#visible-count').textContent = `Showing ${visible.length} of ${benchmark.runs.length} models`;
}

function renderHeatmap() {
  const questions = benchmark.questions;
  $('#heatmap').innerHTML = `<table class="heatmap"><thead><tr><th scope="col">MODEL</th>${questions.map((question) => `<th scope="col" title="${escapeHTML(question.title)}">Q${question.question_id}</th>`).join('')}</tr></thead><tbody>${rankedRuns().map((run) => `<tr><td>${escapeHTML(run.model)}</td>${questions.map((question) => {
    const result = run.results.find((item) => item.question_id === question.question_id);
    return `<td><button class="heatmap-button ${result.correct ? '' : 'failed'}" data-run="${escapeHTML(run.run_id)}" data-question="${question.question_id}" aria-label="${escapeHTML(run.model)}, question ${question.question_id}: ${result.correct ? 'pass' : 'fail'}. Inspect query.">${result.correct ? '✓' : '×'}</button></td>`;
  }).join('')}</tr>`).join('')}</tbody></table>`;
  $('#question-key').innerHTML = questions.map((question) => `<div><b>Q${question.question_id}</b>${escapeHTML(question.title)}</div>`).join('');
}

function renderTokens() {
  const maximum = Math.max(...benchmark.runs.map((run) => run.total_tokens_reported));
  const categories = [['input_tokens','input-color','Input'],['reasoning_tokens','reasoning-color','Reasoning'],['output_tokens','output-color','Output'],['cache_read_tokens','cache-color','Cache read']];
  $('#token-chart').innerHTML = rankedRuns().map((run) => `<div class="token-row"><div class="token-row-top"><span>${escapeHTML(run.model.replace(/ Free$/, ''))}</span><span>${number.format(run.total_tokens_reported)}</span></div><div class="token-bar-track"><div class="token-bar" style="width:${run.total_tokens_reported / maximum * 100}%" role="img" aria-label="${escapeHTML(run.model)}: ${categories.map(([key,,label]) => `${label} ${number.format(run[key])}`).join(', ')} tokens">${categories.map(([key, color, label]) => `<span class="${color}" style="width:${run[key] / run.total_tokens_reported * 100}%" title="${label}: ${number.format(run[key])} tokens"></span>`).join('')}</div></div></div>`).join('');
  const allZero = benchmark.runs.every((run) => run.cost_usd_reported === 0);
  $('#token-usage .panel-footnote').textContent = `These are session totals, not per-query costs. ${allZero ? `All ${benchmark.runs.length} sessions reported $0.00. ` : ''}Response times were not supplied.`;
}

function connectControls() {
  $('#model-search').addEventListener('input', renderRankings);
  $('#sort-select').addEventListener('change', renderRankings);
  document.querySelectorAll('[data-filter]').forEach((button) => button.addEventListener('click', () => {
    activeFilter = button.dataset.filter;
    document.querySelectorAll('[data-filter]').forEach((item) => { item.classList.toggle('selected', item === button); item.setAttribute('aria-pressed', String(item === button)); });
    renderRankings();
  }));
  document.addEventListener('click', (event) => {
    const button = event.target.closest('button[data-run]');
    if (button) openRun(button.dataset.run, Number(button.dataset.question) || benchmark.questions[0].question_id);
  });
  $('#question-select').addEventListener('change', () => renderQuestion(Number($('#question-select').value)));
  $('#close-dialog').addEventListener('click', () => $('#run-dialog').close());
  $('#run-dialog').addEventListener('click', (event) => {
    if (event.target !== $('#run-dialog')) return;
    const bounds = event.target.getBoundingClientRect();
    if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) event.target.close();
  });
  $('#copy-sql').addEventListener('click', async () => {
    try {
      const result = selectedRun.results.find((item) => item.question_id === Number($('#question-select').value));
      await navigator.clipboard.writeText(result.predicted_sql);
      $('#copy-sql').textContent = 'Copied';
      setTimeout(() => { $('#copy-sql').textContent = 'Copy SQL'; }, 1800);
    } catch { $('#copy-sql').textContent = 'Select SQL to copy'; }
  });
  const navigation = [...document.querySelectorAll('.nav-item')];
  const observer = new IntersectionObserver((entries) => {
    const current = entries.filter((entry) => entry.isIntersecting).sort((a,b) => b.intersectionRatio - a.intersectionRatio)[0];
    if (current) navigation.forEach((link) => link.classList.toggle('active', link.hash === '#' + current.target.id));
  }, {rootMargin:'-5% 0px -45% 0px',threshold:[0,0.2,0.5]});
  document.querySelectorAll('.anchor-section').forEach((section) => observer.observe(section));
}

function openRun(id, questionId) {
  selectedRun = benchmark.runs.find((run) => run.run_id === id);
  if (!selectedRun) return;
  $('#dialog-title').textContent = selectedRun.model;
  $('#dialog-subtitle').textContent = `${selectedRun.correct_count} of ${selectedRun.task_count} correct · ${number.format(selectedRun.total_tokens_reported)} reported tokens · ${selectedRun.provider}`;
  $('#question-select').innerHTML = benchmark.questions.map((question) => `<option value="${question.question_id}">Q${question.question_id} · ${escapeHTML(question.title)}</option>`).join('');
  $('#question-select').value = questionId;
  renderQuestion(questionId);
  $('#run-dialog').showModal();
  $('#run-dialog').scrollTop = 0;
}

function renderQuestion(id) {
  const question = benchmark.questions.find((item) => item.question_id === id);
  const result = selectedRun.results.find((item) => item.question_id === id);
  $('#question-status').textContent = result.correct ? 'Passed' : 'Failed';
  $('#question-status').classList.toggle('fail', !result.correct);
  $('#question-category').textContent = `${question.db_id} / ${question.difficulty}`;
  $('#question-text').textContent = question.question;
  $('#question-evidence').textContent = question.evidence ? `Evidence: ${question.evidence}` : 'No additional evidence supplied.';
  $('#failure-explanation').hidden = result.correct || !result.failure_explanation;
  $('#failure-explanation').textContent = result.failure_explanation || '';
  $('#submitted-sql').textContent = result.predicted_sql.trim();
  $('#reference-sql').textContent = result.reference_sql.trim();
  $('#copy-sql').textContent = 'Copy SQL';
  $('#submitted-result-heading').textContent = `Submitted output · ${result.prediction.row_count} rows`;
  $('#reference-result-heading').textContent = `Reference output · ${result.reference.row_count} rows`;
  $('#submitted-output').innerHTML = outputTable(result.prediction);
  $('#reference-output').innerHTML = outputTable(result.reference);
}

function outputTable(result) {
  if (result.error) return `<p>${escapeHTML(result.error)}</p>`;
  if (!result.rows.length) return '<p>No rows returned.</p>';
  return `<table><thead><tr>${result.columns.map((column) => `<th scope="col">${escapeHTML(column)}</th>`).join('')}</tr></thead><tbody>${result.rows.map((row) => `<tr>${row.map((value) => `<td>${value === null ? '<span class="muted">NULL</span>' : escapeHTML(value)}</td>`).join('')}</tr>`).join('')}</tbody></table>`;
}

initialize();
