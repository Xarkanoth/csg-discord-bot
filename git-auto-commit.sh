#!/bin/bash
cd ~/csg-discord-bot

# Check for changes
if ! git diff --quiet || ! git diff --cached --quiet; then
  git add .
  git commit -m "Auto-save: $(date '+%Y-%m-%d %H:%M:%S')"
  git push origin master  # or main, depending on your branch name
else
  echo "🟢 No changes to commit."
fi
