#!/usr/bin/env node
// Rubric audit guard — keeps an audit from being submitted without its
// annotated screenshots, and steers the report to the one format a person can
// actually be handed.
//
// WHY THIS EXISTS. The method lives in the plugin's SKILL.md, and when that
// file reaches the agent the agent follows it. Twice it did not: the session
// materialised a stale copy carrying the older six-step flow, with no mention
// of create_annotations, and the audit came back as plain markdown with no
// images. The skill is the instruction; this is the backstop for the times the
// instruction does not arrive.
//
// It is deliberately a NUDGE, not a wall. Every gate below lets the very next
// attempt through — an audit with nothing visual to photograph, or a caller who
// genuinely wants the structured payload, must not be stuck arguing with a
// hook. One refusal carrying a reason, then out of the way.

const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const STATE_DIR = path.join(os.homedir(), '.claude', '.rubric-audit-state');
const MAX_MARKER_AGE_MS = 24 * 60 * 60 * 1000;

/** PreToolUse refusal. The reason is the only thing the model sees. */
function deny(reason) {
  process.stdout.write(
    JSON.stringify({
      hookSpecificOutput: {
        hookEventName: 'PreToolUse',
        permissionDecision: 'deny',
        permissionDecisionReason: reason,
      },
    }),
  );
  process.exit(0);
}

/** Anything that is not an explicit refusal. Silence means proceed. */
function allow() {
  process.exit(0);
}

function markerPath(kind, sessionId, auditId) {
  const safe = String(auditId).replace(/[^a-zA-Z0-9._-]/g, '_');
  const session = String(sessionId || 'nosession').replace(/[^a-zA-Z0-9._-]/g, '_');
  return path.join(STATE_DIR, `${kind}__${session}__${safe}`);
}

function touch(file) {
  fs.mkdirSync(STATE_DIR, { recursive: true });
  fs.writeFileSync(file, String(Date.now()));
}

function exists(file) {
  try {
    return Date.now() - Number(fs.readFileSync(file, 'utf8')) < MAX_MARKER_AGE_MS;
  } catch {
    return false;
  }
}

/** Markers are per-audit and short-lived; nothing here is worth keeping a day. */
function prune() {
  try {
    for (const name of fs.readdirSync(STATE_DIR)) {
      const file = path.join(STATE_DIR, name);
      if (Date.now() - fs.statSync(file).mtimeMs > MAX_MARKER_AGE_MS) fs.rmSync(file);
    }
  } catch {
    /* nothing to prune */
  }
}

function main(raw) {
  let input;
  try {
    input = JSON.parse(raw);
  } catch {
    allow(); // Unparseable payload is the harness's problem, not the audit's.
  }

  // MCP tools arrive as mcp__<server>__<tool>, and the server segment is not
  // stable: the CLI names it after the plugin ("rubric"), the desktop app after
  // an opaque id. Only the last segment is ours to match on.
  const tool = String(input.tool_name || '').split('__').pop();
  const args = input.tool_input || {};
  const session = input.session_id;
  const auditId = args.audit_id;

  prune();

  if (tool === 'create_annotations') {
    if (auditId) touch(markerPath('annotated', session, auditId));
    allow();
  }

  if (!auditId) allow(); // Nothing to key a decision on.

  if (tool === 'submit_findings') {
    if (exists(markerPath('annotated', session, auditId))) allow();
    const warned = markerPath('submit-warned', session, auditId);
    if (exists(warned)) allow();
    touch(warned);
    deny(
      'No annotated screenshot has been uploaded for this audit yet. EVERY finding ' +
        'gets one by default — a finding is something you saw fail on the page, so ' +
        'there is a pixel to point at: the low-contrast label, the missing focus ' +
        'ring, the competing CTAs. Do not wait to be asked; annotating every finding ' +
        'is how a Rubric audit ships. Mark up each one, send them all in ONE ' +
        'create_annotations call (one call per image bills the same flat rate each ' +
        'time), PUT the bytes to each upload_url, then submit. If this audit ' +
        'genuinely has nothing visual to photograph, or you have no browser, repeat ' +
        'this exact call and it will go through.',
    );
  }

  if (tool === 'get_report') {
    if (args.output === 'html') allow();
    const warned = markerPath('report-warned', session, auditId);
    if (exists(warned)) allow();
    touch(warned);
    deny(
      `output was ${args.output ? `'${args.output}'` : 'omitted'}. Use output: 'html' ` +
        'for the copy a person is handed: one self-contained file, print styling ' +
        'built in, and the only format the uploaded screenshots travel inside. ' +
        "'summary' is the structured payload to reason over and 'markdown' is plain " +
        'text — if you deliberately want one of those, repeat this exact call and it ' +
        'will go through.',
    );
  }

  allow();
}

let buf = '';
process.stdin.on('data', (c) => (buf += c));
process.stdin.on('end', () => main(buf));
