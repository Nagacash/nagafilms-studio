#!/usr/bin/env bash
# Measure page-load times for every URL in a pages file.
# Usage: measure-pages.sh [pages-file] [output-csv]
#
# pages-file: one URL per line (default: .perf/pages.txt)
# output-csv: optional CSV path (default: stdout table)

set -euo pipefail

PAGES_FILE="${1:-.perf/pages.txt}"
OUTPUT_CSV="${2:-}"
RUNS="${MEASURE_RUNS:-5}"
TIMEOUT="${MEASURE_TIMEOUT:-10}"

if [[ ! -f "$PAGES_FILE" ]]; then
  echo "error: pages file not found: $PAGES_FILE" >&2
  echo "Create it with one URL per line, e.g. http://127.0.0.1:4173/" >&2
  exit 1
fi

median() {
  local -a vals=("$@")
  local n=${#vals[@]}
  if (( n == 0 )); then echo "0"; return; fi
  IFS=$'\n' sorted=($(printf '%s\n' "${vals[@]}" | sort -n))
  if (( n % 2 == 1 )); then
    echo "${sorted[$((n / 2))]}"
  else
    awk -v a="${sorted[$((n / 2 - 1))]}" -v b="${sorted[$((n / 2))]}" 'BEGIN { printf "%.3f", (a + b) / 2 }'
  fi
}

ms_from_seconds() {
  awk -v s="$1" 'BEGIN { printf "%.2f", s * 1000 }'
}

declare -a lines=()
pass=0
fail=0

while IFS= read -r url || [[ -n "$url" ]]; do
  [[ -z "$url" || "$url" =~ ^# ]] && continue
  declare -a totals=()
  for ((i = 1; i <= RUNS; i++)); do
    result=$(curl -sS -o /dev/null \
      --max-time "$TIMEOUT" \
      -w "%{time_total}" \
      "$url" 2>/dev/null || echo "999")
    totals+=("$result")
  done
  med=$(median "${totals[@]}")
  med_ms=$(ms_from_seconds "$med")
  status="FAIL"
  if awk -v m="$med_ms" 'BEGIN { exit (m < 50) ? 0 : 1 }'; then
    status="PASS"
    ((pass++)) || true
  else
    ((fail++)) || true
  fi
  runs_str=$(IFS=,; echo "${totals[*]}")
  line="$url,$med_ms,$status,$runs_str"
  lines+=("$line")
done < "$PAGES_FILE"

if [[ -n "$OUTPUT_CSV" ]]; then
  mkdir -p "$(dirname "$OUTPUT_CSV")"
  {
    echo "url,median_ms,status,runs_seconds"
    printf '%s\n' "${lines[@]}"
  } > "$OUTPUT_CSV"
  echo "Wrote $OUTPUT_CSV" >&2
fi

printf "%-8s %-10s %s\n" "STATUS" "MEDIAN_MS" "URL"
printf '%s\n' "${lines[@]}" | while IFS=, read -r url med_ms status _rest; do
  printf "%-8s %-10s %s\n" "$status" "$med_ms" "$url"
done

echo "" >&2
echo "Summary: $pass passed, $fail failed (threshold: 50 ms median, $RUNS runs/page)" >&2
[[ "$fail" -eq 0 ]]
