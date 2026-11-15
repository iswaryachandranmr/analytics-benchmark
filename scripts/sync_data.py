#!/usr/bin/env python3
"""Export the local verified runs into this independently publishable website."""
from pathlib import Path
import argparse
import json
import shutil

SITE = Path(__file__).resolve().parents[1]
parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('--workspace', type=Path, default=SITE.parent)
args = parser.parse_args()
root = args.workspace.resolve()
metadata = json.loads((root / 'results/model_runs.json').read_text())
questions = json.loads((root / 'bird_mini_dev/sample_questions.json').read_text())
titles = {198:'Region and date filters',200:'Distinct account counts',210:'Zero-inclusive loan averages',212:'Joins and window ranking',315:'Spending per attendee',328:'Budgets and attendance'}
data = {'name':'QueryBench','updated':'2026-11-14','dataset':{'name':'BIRD Mini-Dev','url':'https://huggingface.co/datasets/birdsql/bird_mini_dev','annotation_release':'2026-10-28','license':'CC BY-SA 4.0','dialect':'SQLite','scope':'Six selected questions, two databases'},'questions':[{**q,'title':titles[q['question_id']]} for q in questions],'runs':[]}
fields = ['run_id','model','provider','session_created_local','messages','assistant_messages','context_limit','context_usage_reported','input_tokens','output_tokens','reasoning_tokens','cache_read_tokens','cache_write_tokens','total_tokens_reported','cost_usd_reported','response_time_seconds','submission_source']
for meta in metadata:
    summary_path = root / meta['summary_path']
    summary = json.loads(summary_path.read_text())
    run = {key:meta[key] for key in fields}
    run.update({key:summary[key] for key in ['task_count','correct_count','execution_success_count','accuracy']})
    run['results'] = []
    for item in summary['results']:
        record = json.loads((summary_path.parent / f'question_{item["question_id"]}.json').read_text())
        result = {key:record[key] for key in ['question_id','correct','predicted_sql','reference_sql','duplicate_preserving_match','required_order_match']}
        for label in ['prediction','reference']:
            result[label] = {key:record[label][key] for key in ['columns','row_count','error']}
            result[label]['rows'] = record[label]['rows'][:5]
        if not record['correct'] and record['question_id'] == 198:
            result['failure_explanation'] = "The query filters for 'East Bohemia', but the database stores 'east Bohemia'. SQLite's case-sensitive equality returns zero rows instead of the expected 364."
        elif not record['correct'] and record['question_id'] == 212:
            result['failure_explanation'] = 'The query returns numeric home-district IDs in column five, while the reference expects district names (for example, 51 instead of Trutnov). The other returned columns match.'
        run['results'].append(result)
    data['runs'].append(run)
for dest in [SITE/'data/benchmark.json',SITE/'dist/assets/benchmark.json']:
    dest.parent.mkdir(parents=True,exist_ok=True)
    dest.write_text(json.dumps(data,indent=2,ensure_ascii=False)+'\n')
shutil.copy2(root/'results/benchmark_prompt.md',SITE/'dist/assets/benchmark-prompt.md')
shutil.copy2(root/'outputs/01a1dca9-4460-77e1-a840-68120e154089/model_scores.xlsx',SITE/'dist/assets/model_scores.xlsx')
print(f'Exported {len(data["runs"])} runs and {len(questions)} questions. Database archives and screenshots are not part of the website.')
