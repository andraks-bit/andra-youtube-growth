#!/usr/bin/env bash
# Transfer your Claude memory between computers.
#
#   On THIS (source) machine:   ./scripts/claude-memory-transfer.sh export
#   On the NEW machine:         ./scripts/claude-memory-transfer.sh import <bundle>.tgz [/abs/project/path]
#
# Claude keeps memory under ~/.claude/projects/<slug>/memory, where <slug> is the
# project path you run Claude from (e.g. /Users/you/boat-rental-marbella ->
# -Users-you-boat-rental-marbella). Because the username/path differ per machine,
# `import` REMAPS the notes to THIS machine's project slug. Contents are just
# markdown notes — no secrets, no keys.
set -euo pipefail
ROOT="$HOME/.claude/projects"
slug() { printf '%s' "$1" | sed 's#/#-#g'; }

case "${1:-}" in
  export)
    OUT="$HOME/claude-memory-bundle-$(date +%Y%m%d-%H%M%S).tgz"
    dirs=()
    for d in "$ROOT"/*/memory; do [ -f "$d/MEMORY.md" ] && dirs+=("${d#"$ROOT"/}"); done
    [ ${#dirs[@]} -eq 0 ] && { echo "No memory dirs with MEMORY.md under $ROOT"; exit 1; }
    # dir names start with '-' (e.g. -Users-…), so end option parsing with -- so tar treats them as paths.
    # COPYFILE_DISABLE stops macOS tar writing ._ AppleDouble metadata files.
    COPYFILE_DISABLE=1 tar czf "$OUT" -C "$ROOT" -- "${dirs[@]}"
    nfiles=0; for d in "${dirs[@]}"; do for f in "$ROOT/$d"/*.md; do [ -f "$f" ] && nfiles=$((nfiles + 1)); done; done
    echo "✅ Exported ${#dirs[@]} memory dir(s), $nfiles files -> $OUT"
    echo "   1) Copy that .tgz to the other computer (AirDrop / cloud / USB)."
    echo "   2) There, from the project root, run:"
    echo "      ./scripts/claude-memory-transfer.sh import <that-file>.tgz \"\$(pwd)\""
    ;;
  import)
    BUNDLE="${2:?usage: import <bundle>.tgz [/abs/project/path]}"
    [ -f "$BUNDLE" ] || { echo "Bundle not found: $BUNDLE"; exit 1; }
    PROJ="${3:-$(pwd)}"
    DEST="$ROOT/$(slug "$PROJ")/memory"
    mkdir -p "$DEST"
    tmp="$(mktemp -d)"; tar xzf "$BUNDLE" -C "$tmp"
    n=0; while IFS= read -r f; do cp "$f" "$DEST/"; n=$((n + 1)); done < <(find "$tmp" -path '*/memory/*.md' ! -name '._*')
    rm -rf "$tmp"
    echo "✅ Imported $n memory file(s) -> $DEST"
    echo "   Slug for this machine: $(slug "$PROJ")"
    echo "   Run Claude from $PROJ and it will load them (check MEMORY.md is present)."
    ;;
  *)
    echo "Usage:"
    echo "  ./scripts/claude-memory-transfer.sh export"
    echo "  ./scripts/claude-memory-transfer.sh import <bundle>.tgz [/abs/project/path]"
    exit 1 ;;
esac
