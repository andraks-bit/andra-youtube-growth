#!/usr/bin/env python3
"""
Generate SEO metadata (title, alt, description, tags, slug) for every boat_image
using Claude vision, and write it back to Supabase.

WHY: image search (Google Images) and LLM answers rank on what each photo's
title/alt/description/tags say. Today the alt text is generic ("Astondoa 40 — view 1").
This fills in real, descriptive metadata per photo.

PREREQS
  1. Apply supabase/migrations/002_media_metadata.sql FIRST (adds title/description/tags/slug/video_url).
  2. export ANTHROPIC_API_KEY=sk-ant-...                 # your Claude API key
  3. (optional) export CLAUDE_MODEL=claude-sonnet-4-5    # any vision-capable model your pipeline uses

RUN
  python3 scripts/seo_image_metadata.py            # DRY RUN — generates + prints, writes nothing
  python3 scripts/seo_image_metadata.py --apply    # generate + SAVE to the database
  python3 scripts/seo_image_metadata.py --apply --all   # also re-do images that already have a title

Safe: dry-run by default; only touches images whose `title` is still empty (unless --all);
reads creds from .env.local; never deletes anything.
"""
import os, sys, json, re, time, urllib.request

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

def env_local(key):
    try:
        for line in open(os.path.join(ROOT, '.env.local')):
            if line.startswith(key + '='):
                return line.split('=', 1)[1].strip().strip('"').strip("'")
    except FileNotFoundError:
        pass
    return None

SB = env_local('NEXT_PUBLIC_SUPABASE_URL')
SK = env_local('SUPABASE_SERVICE_ROLE_KEY')
AK = os.environ.get('ANTHROPIC_API_KEY')
MODEL = os.environ.get('CLAUDE_MODEL', 'claude-sonnet-4-5')
APPLY = '--apply' in sys.argv
ALL = '--all' in sys.argv

if not (SB and SK):
    sys.exit('Missing SUPABASE creds in .env.local')
if not AK:
    sys.exit('Set ANTHROPIC_API_KEY in your environment first (export ANTHROPIC_API_KEY=sk-ant-...).')

SBH = {'apikey': SK, 'Authorization': 'Bearer ' + SK, 'Content-Type': 'application/json'}

def sb_get(path):
    r = urllib.request.Request(SB + '/rest/v1/' + path)
    for k, v in SBH.items(): r.add_header(k, v)
    return json.loads(urllib.request.urlopen(r).read().decode())

def sb_patch(path, body):
    r = urllib.request.Request(SB + '/rest/v1/' + path, data=json.dumps(body).encode(), method='PATCH')
    for k, v in SBH.items(): r.add_header(k, v)
    urllib.request.urlopen(r).read()

def slugify(s):
    return re.sub(r'[^a-z0-9]+', '-', s.lower()).strip('-')[:56]

PROMPT = ("You are an SEO copywriter for a luxury boat-rental marketplace. "
          'Look at this photo of the boat "%s" (a %s in %s). Return STRICT JSON only, no prose:\n'
          '{"title":"4-8 word title of what is IN the photo, e.g. \'Sunseeker 63 teak sundeck at sunset\'",'
          '"alt":"concise literal alt text for accessibility + image search, under 125 chars",'
          '"description":"1-2 sentence rich description naming the boat, the feature shown, and the location",'
          '"tags":["5-8","lowercase","kebab-case","tags","like","sundeck","motor-yacht","marbella"]}\n'
          'Be specific to what is actually visible (exterior profile, sundeck, interior cabin, helm, swim platform, etc.).')

def describe(image_url, name, btype, city):
    body = {"model": MODEL, "max_tokens": 500, "messages": [{"role": "user", "content": [
        {"type": "image", "source": {"type": "url", "url": image_url}},
        {"type": "text", "text": PROMPT % (name, btype, city)},
    ]}]}
    r = urllib.request.Request("https://api.anthropic.com/v1/messages", data=json.dumps(body).encode(), method='POST')
    r.add_header('x-api-key', AK)
    r.add_header('anthropic-version', '2023-06-01')
    r.add_header('content-type', 'application/json')
    text = json.loads(urllib.request.urlopen(r).read().decode())['content'][0]['text']
    m = re.search(r'\{.*\}', text, re.S)
    return json.loads(m.group(0)) if m else None

flt = '' if ALL else '&title=is.null'
imgs = sb_get(f'boat_images?select=id,boat_id,storage_url{flt}&order=boat_id.asc')
boats = {b['id']: b for b in sb_get('boats?select=id,name,type,locations(city)')}
print(f"{len(imgs)} image(s) to process" + ('' if APPLY else '   (DRY RUN — nothing saved; add --apply to write)') + "\n")

done = 0
for i, img in enumerate(imgs):
    b = boats.get(img['boat_id'], {})
    name = b.get('name', 'boat')
    btype = (b.get('type') or 'boat').replace('_', ' ')
    city = (b.get('locations') or {}).get('city', 'Marbella')
    try:
        meta = describe(img['storage_url'], name, btype, city)
    except Exception as e:
        print(f"  [{i+1}/{len(imgs)}] ERROR {name}: {e}"); time.sleep(2); continue
    if not meta:
        print(f"  [{i+1}/{len(imgs)}] {name}: no JSON returned, skipped"); continue
    title = str(meta.get('title', '')).strip()[:120]
    alt = str(meta.get('alt', '')).strip()[:160]
    desc = str(meta.get('description', '')).strip()[:400]
    tags = [str(t).strip().lower() for t in (meta.get('tags') or []) if str(t).strip()][:8]
    slug = slugify(f"{name}-{title}")[:50] + '-' + img['id'][:6]
    print(f"  [{i+1}/{len(imgs)}] {name}: {title}  | tags: {', '.join(tags)}")
    if APPLY:
        try:
            sb_patch(f"boat_images?id=eq.{img['id']}", {"title": title, "alt": alt, "description": desc, "tags": tags, "slug": slug})
            done += 1
        except Exception as e:
            print(f"        write failed: {e}")
    time.sleep(0.4)

print(f"\n{'Saved ' + str(done) + ' images.' if APPLY else 'Dry run complete — re-run with --apply to save.'}")
