"""Export the reviewed benchmark as a public, reproducible static data file."""

import argparse
import json
from pathlib import Path
import sqlite3


ROOT = Path(__file__).resolve().parents[1]
RUN = "balanced75-high-200k-v2"
WEIGHTS = {"correctness": 70, "cost": 20, "speed": 10}


def export(path, run_id):
    with sqlite3.connect(path.resolve().as_uri() + "?mode=ro", uri=True) as db:
        db.row_factory = sqlite3.Row
        models = [dict(row) for row in db.execute("""
            WITH spend AS (
                SELECT model_key, SUM(COALESCE(cost_usd, estimated_cost_usd)) cost,
                       SUM(cost_usd) reported_cost,
                       SUM(CASE WHEN cost_usd IS NULL THEN estimated_cost_usd END) estimated_cost,
                       SUM(total_tokens) tokens, SUM(completion_tokens) completion_tokens,
                       COUNT(completion_tokens) metered_attempts, COUNT(*) attempts,
                       CASE WHEN COUNT(total_elapsed_ms) = COUNT(*) THEN SUM(total_elapsed_ms) END elapsed_ms
                FROM attempts WHERE run_id = ? GROUP BY model_key
            )
            SELECT m.model_key key, m.display_name name, COUNT(*) planned,
                   SUM(m.sql_executed = 1) executed, COUNT(r.score_percent) reviewed,
                   SUM(r.score_percent = 100) correct, AVG(m.sql_execution_ms) avg_sql_ms,
                   s.cost, s.reported_cost, s.estimated_cost, s.tokens, s.completion_tokens,
                   s.metered_attempts, s.attempts, s.elapsed_ms
            FROM benchmark_metrics m JOIN spend s USING(model_key)
            LEFT JOIN correctness_reviews r USING(attempt_id)
            WHERE m.run_id = ? GROUP BY m.model_key ORDER BY m.model_key
        """, (run_id, run_id))]
        if not models or any(model["reviewed"] != model["executed"] or not model["executed"]
                             or not model["avg_sql_ms"] or not model["cost"] for model in models):
            raise ValueError("The run must have fully reviewed SQL results, timing, and spend for every model.")
        tasks = [dict(row) for row in db.execute("""
            SELECT m.model_key model, m.source_question_id question_id, m.db_id database,
                   m.difficulty, m.question, m.task_status status, m.row_count,
                   m.sql_execution_ms sql_ms, m.generated_sql sql, r.reference_sql,
                   r.score_percent, r.comparison
            FROM benchmark_metrics m LEFT JOIN correctness_reviews r USING(attempt_id)
            WHERE m.run_id = ? ORDER BY m.source_question_id, m.model_key
        """, (run_id,))]
    lowest_cost = min(model["cost"] for model in models)
    fastest_sql = min(model["avg_sql_ms"] for model in models)
    for model in models:
        model["points"] = {
            "correctness": WEIGHTS["correctness"] * model["correct"] / model["planned"],
            "cost": WEIGHTS["cost"] * lowest_cost / model["cost"],
            "speed": WEIGHTS["speed"] * fastest_sql / model["avg_sql_ms"],
        }
        model["score"] = sum(model["points"].values())
    return {
        "run": run_id, "weights": WEIGHTS,
        "models": sorted(models, key=lambda model: (-model["score"], model["key"])),
        "tasks": tasks,
    }


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--database", type=Path, default=ROOT.parent / "results/benchmark75.sqlite")
    parser.add_argument("--run", default=RUN)
    args = parser.parse_args()
    data = export(args.database, args.run)
    (ROOT / "dist/assets/benchmark.json").write_text(
        json.dumps(data, ensure_ascii=False, separators=(",", ":"), allow_nan=False) + "\n", encoding="utf-8"
    )
    print(f"Exported {len(data['tasks'])} tasks and {len(data['models'])} model scores.")


if __name__ == "__main__":
    main()
