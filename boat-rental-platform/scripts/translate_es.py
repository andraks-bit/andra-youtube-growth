#!/usr/bin/env python3
"""Translate landing pages to Spanish (es) for boathire24.com/es/<slug>.

Reads lib/landing/auto-landing.json (English), translates the SEO fields + HTML
body to Spanish via DeepSeek, and writes lib/landing/auto-landing-es.json with
the SAME slugs (so /es/<slug> mirrors /<slug> for hreflang).

Usage:
  python3 scripts/translate_es.py --limit 10     # translate up to N not-yet-done
  python3 scripts/translate_es.py                 # all pending
"""
from __future__ import annotations
import argparse, datetime, json, os, pathlib, re, sys, urllib.request

ROOT = pathlib.Path(__file__).resolve().parents[1]
EN = ROOT / "lib" / "landing" / "auto-landing.json"
ES = ROOT / "lib" / "landing" / "auto-landing-es.json"
LOG = ROOT / "logs" / "translate_es.log"
LOG.parent.mkdir(exist_ok=True)


def log(m: str):
    line = f"[{datetime.datetime.now():%Y-%m-%d %H:%M:%S}] {m}"
    print(line, flush=True)
    with LOG.open("a") as f:
        f.write(line + "\n")


def load_env():
    for p in (ROOT / ".env.local", ROOT / ".env"):
        if p.exists():
            for line in p.read_text().splitlines():
                if line.startswith("DEEPSEEK_API_KEY=") and not os.environ.get("DEEPSEEK_API_KEY"):
                    os.environ["DEEPSEEK_API_KEY"] = line.split("=", 1)[1].strip().strip('"').strip("'")


def deepseek(system: str, user: str, timeout=600) -> str:
    body = json.dumps({
        "model": "deepseek-chat", "max_tokens": 8000, "temperature": 0.3,
        "messages": [{"role": "system", "content": system}, {"role": "user", "content": user}],
    }).encode()
    req = urllib.request.Request(
        "https://api.deepseek.com/chat/completions", data=body,
        headers={"Authorization": f"Bearer {os.environ['DEEPSEEK_API_KEY']}", "Content-Type": "application/json"},
        method="POST",
    )
    with urllib.request.urlopen(req, timeout=timeout) as r:
        return json.loads(r.read())["choices"][0]["message"]["content"].strip()


SYS = ("You are a professional English->Spanish (Spain, es-ES) translator for a boat-charter website. "
       "Translate naturally for a Spanish audience, keep all HTML tags and attributes intact, keep internal "
       "links (href) EXACTLY as-is, do not translate URLs/slugs, keep brand name 'BoatHire24'. "
       "Return ONLY a STRICT JSON object with the same keys you are given, values translated.")


def translate_page(p: dict) -> dict:
    payload = {
        "title": p["title"], "metaDescription": p.get("metaDescription", ""),
        "h1": p.get("h1", p["title"]), "intro": p.get("intro", ""),
        "bodyHtml": p.get("bodyHtml", ""),
        "faqs": p.get("faqs", []),
    }
    user = ("Translate the values of this JSON to Spanish (es-ES). Keep keys and HTML structure identical. "
            "For faqs, translate each q and a.\n\n" + json.dumps(payload, ensure_ascii=False))
    raw = deepseek(SYS, user)
    raw = re.sub(r"^```(?:json)?\s*|\s*```$", "", raw, flags=re.MULTILINE).strip()
    s, e = raw.find("{"), raw.rfind("}")
    data = json.loads(raw[s:e + 1])
    return {
        "slug": p["slug"],
        "title": data.get("title", p["title"]),
        "metaDescription": data.get("metaDescription", p.get("metaDescription", "")),
        "h1": data.get("h1", p.get("h1", p["title"])),
        "keyword": p.get("keyword", ""),
        "intro": data.get("intro", p.get("intro", "")),
        "bodyHtml": data.get("bodyHtml", p.get("bodyHtml", "")),
        "heroImage": p.get("heroImage", ""),
        "faqs": data.get("faqs", p.get("faqs", [])),
        "date": p.get("date", datetime.date.today().isoformat()),
    }


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--limit", type=int, default=10)
    args = ap.parse_args()
    load_env()
    if not os.environ.get("DEEPSEEK_API_KEY"):
        log("no DEEPSEEK_API_KEY"); return 1

    en = json.loads(EN.read_text()) if EN.exists() else []
    es = json.loads(ES.read_text()) if ES.exists() else []
    done = {p["slug"] for p in es}
    todo = [p for p in en if p["slug"] not in done][:args.limit]
    if not todo:
        log("es: nothing to translate"); return 0

    log(f"es: translating {len(todo)} landing page(s)")
    ok = 0
    for i, p in enumerate(todo, 1):
        try:
            es.append(translate_page(p))
            ES.write_text(json.dumps(es, ensure_ascii=False, indent=2) + "\n")
            ok += 1
            log(f"  [{i}/{len(todo)}] ✓ {p['slug']}")
        except Exception as ex:
            log(f"  [{i}/{len(todo)}] ✗ {p['slug']}: {type(ex).__name__}: {str(ex)[:140]}")
    log(f"es: {ok}/{len(todo)} translated (total es={len(es)})")
    # Commit + push the new Spanish content so Vercel deploys the /es pages.
    if ok:
        import subprocess
        try:
            subprocess.run(["git", "add", str(ES)], cwd=ROOT, check=True)
            if subprocess.run(["git", "diff", "--cached", "--quiet"], cwd=ROOT).returncode != 0:
                subprocess.run(["git", "commit", "-m", f"es: +{ok} Spanish landing translations"], cwd=ROOT, check=True)
                subprocess.run(["git", "push", "origin", "HEAD"], cwd=ROOT, check=True)
                log("es: pushed")
        except Exception as e:
            log(f"es: git push failed: {str(e)[:120]}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
