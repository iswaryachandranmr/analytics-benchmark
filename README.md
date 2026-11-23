# QueryBench

QueryBench compares five models on a single, independent 75-question SQL benchmark. The static site shows the weighted leaderboard, each raw metric, and model efficiency and difficulty comparisons. It publishes through the existing GitHub Pages workflow.

The efficiency section compares cost, active time, and reported output tokens per assigned task, plus cost per correct answer. It also plots correctness against each per-task resource measure and shows accuracy by difficulty. These views use saved SQLite measurements and are separate from the weighted score.

## Scoring

Each model earns up to 100 points:

| Metric | Points | Formula |
| --- | ---: | --- |
| Accuracy | 70 | `70 × reference matches ÷ assigned tasks` |
| Cost | 20 | `20 × minimum model spend ÷ model spend` |
| SQL speed | 10 | `10 × minimum mean SQL time ÷ model mean SQL time` |

Correctness uses all 75 assigned tasks, so failures earn no credit. Spend includes saved attempts and continuation usage, using provider-reported charges when available (Kimi's spend is estimated). Mean SQL time includes timed final attempts and SQL timeouts, excludes missing calls, and does not include generation time. Scores are relative to this cohort and ranked at full precision before display rounding.

## Preview and refresh

Run `python3 -m http.server 8080 --directory dist` and open `http://localhost:8080`. No dependency installation or build is needed.

Opening `dist/index.html` directly also works, using the matching `dist/assets/benchmark-preview.js` snapshot. The exporter refreshes both data files together. To rebuild only this preview snapshot from the existing public JSON, run `python3 scripts/sync_data.py --preview-only`.

Refresh the browser data from the reviewed SQLite run with:

```sh
python3 scripts/sync_data.py --database '/path/to/results/benchmark75.sqlite'
```

The exporter defaults to `balanced75-high-200k-v2` and accepts `--run` for another fully reviewed run. It opens the database read-only. Commit `dist/assets/benchmark.json` with any updated source; GitHub Actions deploys `dist/` on pushes to `main`. The public export does not include database files, credentials, request/response payloads, provider reasoning, or result rows.

## Attribution

Provider and social logos are from [Simple Icons](https://simpleicons.org/) (CC0); trademarks belong to their respective owners.

Questions and reference SQL are derived from [BIRD Mini-Dev](https://huggingface.co/datasets/birdsql/bird_mini_dev) (Li et al., 2023), licensed [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/). The reference queries use the original archive corresponding to the evaluated prompts. This sample is not an official BIRD leaderboard.
