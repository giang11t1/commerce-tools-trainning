#!/usr/bin/env bash

LOG_FILE="/tmp/codex-session-start.log"

{
  echo "========================================"
  echo "[Codex Hook] EXECUTED"
  echo "Time: $(date)"
  echo "PWD: $(pwd)"
  echo "========================================"
} >> "$LOG_FILE"

exit 0
