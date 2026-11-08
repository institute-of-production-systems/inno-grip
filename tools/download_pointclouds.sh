#!/usr/bin/env bash
# Requires Bash 4+, OpenSSH and tar locally; Bash, GNU find/tar on the server.
# Usage: [DRY_RUN=1] [ORIENTATION=orientation_a] bash download_pointclouds.sh \
#          user@server /absolute/remote/root /local/project/imgs/3dr_display
# Without ORIENTATION, oriented files become SAMPLE_orientation_a_da3.ply.
# With ORIENTATION, only that orientation is selected and becomes SAMPLE_da3.ply.
# Existing destination files are replaced after each successful download.
# Uses exactly one SSH session per run, with connection multiplexing disabled.
# Downloads are staged in a temporary directory before destination files change.
# Live file names are shown during transfer; pv or GNU dd adds byte progress.
set -euo pipefail

if (( BASH_VERSINFO[0] < 4 )); then
    echo 'This script requires Bash 4 or newer.' >&2
    exit 1
fi
if (( $# != 3 )); then
    echo "Usage: $0 user@server /absolute/remote/root /local/project/imgs/3dr_display" >&2
    exit 1
fi

REMOTE=$1
REMOTE_ROOT=$2
LOCAL_ROOT=$3
DRY_RUN=${DRY_RUN:-0}
ORIENTATION=${ORIENTATION:-}
[[ $REMOTE_ROOT == /* ]] || { echo 'Remote root must be absolute.' >&2; exit 1; }
if [[ -n $ORIENTATION && ( $ORIENTATION != orientation_* || $ORIENTATION == */* ) ]]; then
    echo 'ORIENTATION must be a folder name such as orientation_a.' >&2
    exit 1
fi

# Quote paths for the remote POSIX shell, including spaces and single quotes.
shell_quote() {
    printf "'%s'" "${1//\'/\'\\\'\'}"
}

work=$(mktemp -d)
partial=
cleanup() {
    [[ -z $partial ]] || rm -f -- "$partial"
    rm -rf -- "$work"
}
trap cleanup EXIT
trap 'exit 130' INT
trap 'exit 143' TERM

# This function is called once per run. All selection and transfer happens
# inside that one foreground SSH session, so no control socket is needed.
run_remote() {
    ssh -T -S none -o ControlMaster=no -o ControlPersist=no \
        -o ServerAliveInterval=30 -o ServerAliveCountMax=3 -- "$REMOTE" \
        "bash -s -- $(shell_quote "$REMOTE_ROOT") $(shell_quote "$DRY_RUN") $(shell_quote "$ORIENTATION")" <<'REMOTE_SCRIPT'
set -euo pipefail
cd -- "$1"
dry_run=$2
selected_orientation=$3
printf '[server] Connected. Scanning %s ...\n' "$PWD" >&2
if [[ $dry_run != 1 ]] && ! command -v tar >/dev/null 2>&1; then
    echo '[server] Error: tar is not installed or is not on PATH.' >&2
    exit 1
fi
remote_work=$(mktemp -d)
trap 'rm -rf -- "$remote_work"' EXIT
trap 'exit 130' INT
trap 'exit 143' TERM
find . -mindepth 4 -maxdepth 5 -type f \
    -name compare_cropped_results.ply -print0 > "$remote_work/candidates"
: > "$remote_work/selected"
count=0
pattern='^\./([^/]+)/(single|multiple|stacked)/(orientation_[^/]+/)?(da3|vggt)/compare_cropped_results\.ply$'
while IFS= read -r -d '' rel; do
    [[ $rel =~ $pattern ]] || continue
    category=${BASH_REMATCH[2]}
    orientation=${BASH_REMATCH[3]%/}
    [[ -z $orientation || $category == single ]] || continue
    if [[ -n $orientation && -n $selected_orientation ]]; then
        [[ $orientation == "$selected_orientation" ]] || continue
    fi
    printf '%s\0' "$rel" >> "$remote_work/selected"
    count=$((count + 1))
done < "$remote_work/candidates"
printf '[server] Selected %d file(s).\n' "$count" >&2
if [[ $dry_run == 1 ]]; then
    cat -- "$remote_work/selected"
else
    # A single tar stream carries every selected point cloud over this SSH.
    echo '[server] Starting transfer ...' >&2
    tar -c -f - --null -T "$remote_work/selected"
    echo '[server] Transfer finished.' >&2
fi
REMOTE_SCRIPT
}

stream_progress() {
    if command -v pv >/dev/null 2>&1; then
        pv -f -b -r -t
    elif command -v dd >/dev/null 2>&1 && dd --version >/dev/null 2>&1; then
        dd bs=1M status=progress
    else
        cat
    fi
}

if [[ $DRY_RUN == 1 ]]; then
    run_remote > "$work/files"
else
    command -v tar >/dev/null 2>&1 || { echo 'Error: tar is required locally.' >&2; exit 1; }
    printf 'Downloading in one SSH session; temporary files: %s\n' "$work/data"
    echo 'File names below show extraction in progress. Destination files are updated after the batch arrives.'
    mkdir -p -- "$work/data"
    # pipefail catches errors from either SSH/remote tar or local extraction.
    # Failed transfers only affect temporary files; destination files stay intact.
    if run_remote | stream_progress | tar -x -v -f - -C "$work/data"; then
        echo 'Batch received. Preparing destination files ...'
    else
        pipeline_status=("${PIPESTATUS[@]}")
        printf 'Exit codes: SSH/remote=%s; progress=%s; local tar=%s\n' \
            "${pipeline_status[0]}" "${pipeline_status[1]}" "${pipeline_status[2]}" >&2
        echo 'Download failed; no destination files were changed.' >&2
        exit 1
    fi
    (cd -- "$work/data" && find . -type f -name compare_cropped_results.ply -print0) \
        > "$work/files"
fi

sources=()
destinations=()
declare -A seen=()
pattern='^\./([^/]+)/(single|multiple|stacked)/(orientation_[^/]+/)?(da3|vggt)/compare_cropped_results\.ply$'

# Validate the entire mapping before changing any destination files.
while IFS= read -r -d '' rel; do
    [[ $rel =~ $pattern ]] || continue
    sample=${BASH_REMATCH[1]}
    category=${BASH_REMATCH[2]}
    orientation=${BASH_REMATCH[3]%/}
    method=${BASH_REMATCH[4]}
    [[ -z $orientation || $category == single ]] || continue

    suffix=
    if [[ -n $orientation ]]; then
        if [[ -n $ORIENTATION ]]; then
            [[ $orientation == "$ORIENTATION" ]] || continue
        else
            suffix="_${orientation}"
        fi
    fi

    dest="${LOCAL_ROOT%/}/$category/${sample}${suffix}_${method}.ply"
    if [[ -n ${seen[$dest]+present} ]]; then
        printf 'Conflicting sources map to %s. No destination files were changed.\n' "$dest" >&2
        exit 1
    fi
    seen["$dest"]=1
    sources+=("$rel")
    destinations+=("$dest")
done < "$work/files"

for i in "${!sources[@]}"; do
    rel=${sources[$i]}
    dest=${destinations[$i]}
    printf '%s -> %s\n' "$rel" "$dest"
    [[ $DRY_RUN == 1 ]] && continue

    mkdir -p -- "$(dirname -- "$dest")"
    partial=$(mktemp "${dest}.part.XXXXXX")
    cp -- "$work/data/${rel#./}" "$partial"
    mv -f -- "$partial" "$dest"
    partial=
    rm -f -- "$work/data/${rel#./}"
done

if [[ $DRY_RUN == 1 ]]; then
    printf 'Dry run: %d file(s) matched.\n' "${#sources[@]}"
else
    printf 'Downloaded %d file(s).\n' "${#sources[@]}"
fi
