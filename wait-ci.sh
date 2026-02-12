#!/bin/bash
# wait-ci.sh - 等待当前 commit 和 PR 相关的所有 CI 完成
# 用法: ./wait-ci.sh <repo_dir> [timeout_seconds]
#   repo_dir        必填，repo 根目录的绝对或相对路径
#   timeout_seconds 可选，等待超时秒数，默认 600

set -e

# ── 0. 参数解析 ───────────────────────────────────────────
REPO_DIR="${1:-}"
TIMEOUT="${2:-600}"

if [ -z "$REPO_DIR" ]; then
  echo "❌ 错误：必须指定 repo 目录" >&2
  echo "用法: $0 <repo_dir> [timeout_seconds]" >&2
  exit 1
fi

if [ ! -d "$REPO_DIR" ]; then
  echo "❌ 错误：目录不存在：$REPO_DIR" >&2
  exit 1
fi

if [ ! -d "$REPO_DIR/.git" ]; then
  echo "❌ 错误：指定目录不是一个 git repo：$REPO_DIR" >&2
  exit 1
fi

cd "$REPO_DIR"

POLL_INTERVAL=15
ELAPSED=0

# ── 1. 获取当前状态 ──────────────────────────────────────
COMMIT_SHA=$(git rev-parse HEAD)
BRANCH=$(git rev-parse --abbrev-ref HEAD)
PR_NUMBER=""  # 先置空，循环里动态获取

echo "📁 Repo:   $REPO_DIR" >&2
echo "📌 Commit: ${COMMIT_SHA:0:8}" >&2
echo "🌿 Branch: $BRANCH" >&2

# ── 2. 日志采样函数 ───────────────────────────────────────
# 分段采样：头部（捕获 setup 失败）+ 错误关键词上下文 + 尾部（捕获测试汇总）
get_failure_log() {
  local run_id="$1"
  local full_log
  full_log=$(gh run view "$run_id" --log-failed 2>/dev/null)

  local total_lines
  total_lines=$(echo "$full_log" | wc -l)

  # 日志较短，直接全要
  if [ "$total_lines" -le 500 ]; then
    echo "$full_log"
    return
  fi

  local head_part tail_part error_context
  head_part=$(echo "$full_log" | head -80)
  tail_part=$(echo "$full_log" | tail -150)

  # 提取包含关键错误词的行及其上下文（前2行 + 后5行）
  error_context=$(echo "$full_log" | grep -n \
    -E "(Error|error|FAILED|failed|Exception|exception|FATAL|fatal|panic|Cannot|cannot|No such|Permission denied|exit code [^0])" \
    | head -20 \
    | while IFS=: read -r lineno _; do
        local start=$((lineno - 2))
        local end=$((lineno + 5))
        [ "$start" -lt 1 ] && start=1
        echo "--- (line $lineno) ---"
        echo "$full_log" | sed -n "${start},${end}p"
      done)

  cat <<EOF
[日志总行数: ${total_lines}，以下为关键片段]

=== HEAD (前80行) ===
$head_part

=== ERROR CONTEXT (关键错误行及上下文) ===
$error_context

=== TAIL (后150行) ===
$tail_part
EOF
}

# ── 3. 等待所有相关 runs 完成 ─────────────────────────────
# PR_NUMBER 在循环内动态获取，避免 PR 创建延迟导致漏查
wait_for_runs() {
  while [ "$ELAPSED" -lt "$TIMEOUT" ]; do
    sleep "$POLL_INTERVAL"
    ELAPSED=$((ELAPSED + POLL_INTERVAL))

    # 每轮循环尝试获取 PR_NUMBER，直到成功为止
    if [ -z "$PR_NUMBER" ]; then
      PR_NUMBER=$(gh pr view "$BRANCH" --json number -q '.number' 2>/dev/null || echo "")
      if [ -n "$PR_NUMBER" ]; then
        echo "🔗 PR #$PR_NUMBER 已关联" >&2
      fi
    fi

    # 查询这个 commit 触发的所有 runs（用 SHA 锁定，不受并发影响）
    RUNS=$(gh run list \
      --commit "$COMMIT_SHA" \
      --json databaseId,name,status,conclusion,url,event,headSha \
      2>/dev/null)

    # 如果已有 PR，补充查询 PR 事件触发的 runs
    if [ -n "$PR_NUMBER" ]; then
      PR_RUNS=$(gh run list \
        --branch "$BRANCH" \
        --event pull_request \
        --json databaseId,name,status,conclusion,url,event,headSha \
        --limit 20 \
        2>/dev/null \
        | jq --arg sha "$COMMIT_SHA" \
          '[.[] | select(.headSha == $sha)]' 2>/dev/null || echo "[]")
      # 合并去重
      RUNS=$(printf '%s\n%s' "$RUNS" "$PR_RUNS" | jq -s 'add | unique_by(.databaseId)')
    fi

    local run_count
    run_count=$(echo "$RUNS" | jq 'length')
    if [ "$run_count" -eq 0 ]; then
      echo "⏳ 等待 Actions 触发... (${ELAPSED}s)" >&2
      continue
    fi

    # 检查是否还有进行中的
    local in_progress
    in_progress=$(echo "$RUNS" | jq '[.[] | select(
      .status == "in_progress" or
      .status == "queued" or
      .status == "waiting" or
      .status == "requested"
    )] | length')

    echo "🔄 共 ${run_count} 个 Action，${in_progress} 个运行中 (${ELAPSED}s)" >&2

    if [ "$in_progress" -gt 0 ]; then
      continue
    fi

    # 全部完成
    return 0
  done

  # 超时
  return 1
}

# ── 4. 执行等待 ───────────────────────────────────────────
echo "⏳ 等待 CI 结果..." >&2

# 用 || 捕获非零返回，避免 set -e 直接退出
wait_for_runs || {
  jq -n \
    --arg sha "$COMMIT_SHA" \
    --arg pr "$PR_NUMBER" \
    '{status:"timeout", commit:$sha, pr_number:$pr, message:"超时，CI 未在规定时间内完成"}'
  exit 1
}

# ── 5. 分析结果 ───────────────────────────────────────────
FAILED=$(echo "$RUNS" | jq '[.[] | select(.conclusion == "failure" or .conclusion == "cancelled")]')
FAILED_COUNT=$(echo "$FAILED" | jq 'length')

if [ "$FAILED_COUNT" -gt 0 ]; then
  echo "❌ ${FAILED_COUNT} 个 Action 失败，拉取日志..." >&2
  DETAILS="[]"
  while IFS= read -r run_id; do
    LOG=$(get_failure_log "$run_id")
    RUN_INFO=$(echo "$RUNS" | jq --arg id "$run_id" '.[] | select(.databaseId == ($id | tonumber))')
    DETAILS=$(echo "$DETAILS" | jq \
      --argjson info "$RUN_INFO" \
      --arg log "$LOG" \
      '. + [{
        run_id: ($info.databaseId | tostring),
        name: $info.name,
        url: $info.url,
        log: $log
      }]')
  done < <(echo "$FAILED" | jq -r '.[].databaseId')

  jq -n \
    --arg sha "$COMMIT_SHA" \
    --arg branch "$BRANCH" \
    --arg pr "$PR_NUMBER" \
    --argjson runs "$RUNS" \
    --argjson failed "$FAILED" \
    --argjson details "$DETAILS" \
    '{
      status: "failure",
      commit: $sha,
      branch: $branch,
      pr_number: $pr,
      summary: {
        total: ($runs | length),
        failed: ($failed | length),
        succeeded: ([$runs[] | select(.conclusion == "success")] | length)
      },
      failed_runs: $failed,
      failure_details: $details
    }'
else
  jq -n \
    --arg sha "$COMMIT_SHA" \
    --arg branch "$BRANCH" \
    --arg pr "$PR_NUMBER" \
    --argjson runs "$RUNS" \
    '{
      status: "success",
      commit: $sha,
      branch: $branch,
      pr_number: $pr,
      summary: {
        total: ($runs | length),
        succeeded: ($runs | length)
      },
      runs: $runs
    }'
fi