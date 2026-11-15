# analytics-benchmark

QueryBench is an independent SQL analytics benchmark website, prepared for GitHub Pages.
It contains four locally evaluated model submissions on six selected BIRD Mini-Dev questions.

## What visitors can do

- Search and sort the model leaderboard by accuracy, tokens, or name.
- Filter to models with 100% accuracy on this sample.
- Inspect each submitted query, reference query, and output preview.
- See pass/fail results for all questions and session token breakdowns.
- Download the score spreadsheet, benchmark prompt, and JSON evaluation data.
- Read the evaluation method, provenance, attribution, and limitations.

## Preview locally

```sh
python3 -m http.server 8080 --directory dist
```

Open http://localhost:8080. Use a local web server, because browsers restrict loading JSON with `file://` URLs.
The website has no package installation or build step and makes no calls to model providers.

## Publish to GitHub Pages

1. Create a repository named `analytics-benchmark` on the intended GitHub account.
2. Push the contents of this folder to its `main` branch.
3. In the repository's **Settings → Pages → Build and deployment**, select **GitHub Actions** as the source.
4. Run the **Deploy benchmark to GitHub Pages** workflow, or push another commit.

The workflow publishes only `dist/`. GitHub reports the live site URL in the deployment.
See [GitHub's Pages workflow documentation](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages).

## Refresh the results

With the original Analytics Benchmark workspace available:

```sh
python3 scripts/sync_data.py --workspace "/path/to/Analytics Benchmark"
```

This reads `results/model_runs.json` and each verified run's evaluation files, then updates the data and downloads.
Commit the generated files to publish the changes. If the site is checked out separately, pass the original workspace path.
The website source data is retained in `data/benchmark.json`; the browser reads `dist/assets/benchmark.json`.
Session dates and tokens are reported as supplied, and response times are left unavailable.
The export does not include the SQLite databases, archive, or session screenshots.

## Scope and attribution

The site scores exact result values and duplicate counts, and checks requested ordering for questions 212 and 328.
It is a six-question pilot, not an official BIRD leaderboard or a claim about overall model quality.
Model labels and usage are user-supplied; generation settings were not independently verified.

Question text, schema descriptions, and reference SQL are derived from [BIRD Mini-Dev](https://huggingface.co/datasets/birdsql/bird_mini_dev), corrected October 2026 annotations.
Attribution: Li et al., *Can LLM Already Serve as A Database Interface? A BIg Bench for Large-Scale Database Grounded Text-to-SQLs* (2023).
The dataset content is licensed [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/).
Published results include submitted model SQL, reference SQL, and up to five output rows per query.
