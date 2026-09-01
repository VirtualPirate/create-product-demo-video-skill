#!/usr/bin/env bash
# Install create-product-demo-video as a plain SKILL.md folder.
#
# Claude Code users don't need this — `/plugin marketplace add` in README.md is
# one command and updates itself. This exists for Codex and Cursor, and for
# anyone who'd rather not use the plugin system.
set -euo pipefail

REPO="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
NAME=create-product-demo-video
SKILL="$REPO/skills/$NAME"

usage() {
  cat <<'USAGE'
usage: ./install.sh [--project] [--copy]

  (no flags)  symlink into whichever of ~/.claude ~/.codex ~/.cursor exist
  --project   install into ./.claude ./.codex ./.cursor instead, for this repo only
  --copy      copy the folder instead of symlinking it

Symlinks track the repo, so `git pull` updates the skill in place. `--copy`
detaches it — use that if the clone lives somewhere you might delete.
USAGE
}

MODE=link
SCOPE=user
for arg in "$@"; do
  case "$arg" in
    --project) SCOPE=project ;;
    --copy)    MODE=copy ;;
    -h|--help) usage; exit 0 ;;
    *) echo "unknown flag: $arg" >&2; usage >&2; exit 2 ;;
  esac
done

[ -f "$SKILL/SKILL.md" ] || { echo "no SKILL.md at $SKILL — run this from the clone" >&2; exit 1; }

if [ "$SCOPE" = project ]; then
  ROOTS=("$PWD/.claude" "$PWD/.codex" "$PWD/.cursor")
else
  ROOTS=("$HOME/.claude" "$HOME/.codex" "$HOME/.cursor")
fi

installed=0
for root in "${ROOTS[@]}"; do
  # User scope: only populate agents actually installed on this machine, so we
  # don't scatter empty ~/.cursor trees. Project scope: the dirs are ours to make.
  if [ "$SCOPE" = user ] && [ ! -d "$root" ]; then
    continue
  fi
  target="$root/skills/$NAME"
  mkdir -p "$root/skills"
  rm -rf "$target"
  if [ "$MODE" = copy ]; then
    cp -R "$SKILL" "$target"
  else
    ln -sfn "$SKILL" "$target"
  fi
  echo "$MODE  $target"
  installed=$((installed + 1))
done

if [ "$installed" -eq 0 ]; then
  echo "found none of ~/.claude ~/.codex ~/.cursor — is an agent installed? Or use --project." >&2
  exit 1
fi

echo
echo "Restart the agent, then: /create-product-demo-video <what should happen>"
