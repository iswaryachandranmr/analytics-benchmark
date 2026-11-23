# QueryBench

QueryBench compares five models on a single, independent 75-question SQL benchmark. The static site shows the weighted leaderboard, each raw metric, and a searchable task explorer with submitted and reference SQL. It publishes through the existing GitHub Pages workflow.

## Scoring

Each model earns up to 100 points:

| Metric | Points | Formula |
| --- | ---: | --- |
| Correctness | 40 | `40 × reference matches ÷ assigned tasks` |
| Cost | 40 | `40 × minimum model spend ÷ model spend` |
| SQL speed | 20 | `20 × minimum mean SQL time ÷ model mean SQL time` |

Correctness uses all 75 assigned tasks, so failures earn no credit. Spend includes saved attempts and continuation usage, using provider-reported charges when available (Kimi's spend is estimated). Mean SQL time includes timed final attempts and SQL timeouts, excludes missing calls, and does not include generation time. Scores are relative to this cohort and ranked at full precision before display rounding.

## Preview and refresh

Run `python3 -m http.server 8080 --directory dist` and open `http://localhost:8080`. No dependency installation or build is needed.

Refresh the browser data from the reviewed SQLite run with:

```sh
python3 scripts/sync_data.py --database '/path/to/results/benchmark75.sqlite'
```

The exporter defaults to `balanced75-high-200k-v2` and accepts `--run` for another fully reviewed run. It opens the database read-only. Commit `dist/assets/benchmark.json` with any updated source; GitHub Actions deploys `dist/` on pushes to `main`. The public export does not include database files, credentials, request/response payloads, provider reasoning, or result rows.

## Attribution

Questions and reference SQL are derived from [BIRD Mini-Dev](https://huggingface.co/datasets/birdsql/bird_mini_dev) (Li et al., 2023), licensed [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/). The reference queries use the original archive corresponding to the evaluated prompts. This sample is not an official BIRD leaderboard.
