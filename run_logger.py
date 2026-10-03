"""
Structured run logging.

Every automated run writes one JSON line per step to logs/run_log.jsonl
(append-only, git-committed history of every run) plus a human-readable
logs/last_run.md summary. Each step record captures: what ran, when,
what data was collected (counts), what was produced, and success/failure.
"""
import datetime
import json
import os
import traceback

import config


class RunLogger:
    def __init__(self):
        self.run_id = datetime.datetime.utcnow().strftime("%Y%m%dT%H%M%SZ")
        self.started_at = datetime.datetime.utcnow().isoformat() + "Z"
        self.steps = []
        os.makedirs(config.LOGS_DIR, exist_ok=True)

    def step(self, name):
        return _Step(self, name)

    def _record(self, record):
        self.steps.append(record)

    def finalize(self):
        finished_at = datetime.datetime.utcnow().isoformat() + "Z"
        overall_status = "success" if all(s["status"] == "success" for s in self.steps) else "failed"
        summary = {
            "run_id": self.run_id,
            "started_at": self.started_at,
            "finished_at": finished_at,
            "overall_status": overall_status,
            "steps": self.steps,
        }
        with open(config.RUN_LOG_FILE, "a") as f:
            f.write(json.dumps(summary) + "\n")

        lines = [
            f"# Run {self.run_id}",
            "",
            f"- Started: {self.started_at}",
            f"- Finished: {finished_at}",
            f"- Overall status: **{overall_status.upper()}**",
            "",
            "| Step | Status | Collected | Produced | Duration (s) | Error |",
            "|---|---|---|---|---|---|",
        ]
        for s in self.steps:
            lines.append(
                f"| {s['name']} | {s['status']} | {s.get('collected', '')} | "
                f"{s.get('produced', '')} | {s['duration_s']:.2f} | "
                f"{(s.get('error') or '')[:200]} |"
            )
        with open(os.path.join(config.LOGS_DIR, "last_run.md"), "w") as f:
            f.write("\n".join(lines) + "\n")

        return summary


class _Step:
    def __init__(self, logger, name):
        self.logger = logger
        self.name = name
        self.collected = None
        self.produced = None

    def __enter__(self):
        self.t0 = datetime.datetime.utcnow()
        print(f"[{self.name}] starting...")
        return self

    def set_collected(self, value):
        self.collected = value

    def set_produced(self, value):
        self.produced = value

    def __exit__(self, exc_type, exc, tb):
        duration = (datetime.datetime.utcnow() - self.t0).total_seconds()
        if exc_type is None:
            status = "success"
            error = None
            print(f"[{self.name}] done in {duration:.2f}s "
                  f"(collected={self.collected}, produced={self.produced})")
        else:
            status = "failed"
            error = f"{exc_type.__name__}: {exc}"
            print(f"[{self.name}] FAILED after {duration:.2f}s: {error}")
            traceback.print_exc()
        self.logger._record({
            "name": self.name,
            "status": status,
            "collected": self.collected,
            "produced": self.produced,
            "duration_s": duration,
            "error": error,
        })
        # Swallow the exception: one failed step shouldn't crash the whole
        # run and skip logging/reporting for everything else. run_daily.py
        # checks overall_status afterward and exits non-zero if anything failed.
        return True
