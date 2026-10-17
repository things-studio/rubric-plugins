# Rubric UX Audit

Audit a live website the way a careful UX reviewer would, and hand back a report a person can act on. Every finding has a severity (critical, high, medium or low), the evidence Claude saw on the page, and the fix. There is no overall score: the report is sorted worst first, so the problem that costs the most is at the top.

The plugin adds one skill, `ux-audit`, and connects Claude to Rubric's MCP server, which holds a curated library of UX guidelines and audit checklists. The skill carries the method: walk the site first, then fetch the checklist that fits what was actually on the page, judge each check, mark up a screenshot for each finding, and save the audit to your Rubric account.

## Install

    /plugin marketplace add things-studio/rubric-plugins
    /plugin install rubric-audit@rubric

You will be asked once for a Rubric API key. Create one at https://rubric.design/app/setup/mcp (Settings → MCP Setup). Claude Code stores the key for you; it is never written into this repository or your project.

## What you need

- A Rubric account and API key.
- A browser Claude can drive, such as Claude in Chrome or a Playwright MCP server. Contrast, focus, motion and what sits above the fold can only be judged on a rendered page. Without a browser the skill still works, but it audits only what the page source can settle and marks the rest as not reached, so the report shows its own gaps.

## What this plugin sends and stores

- **MCP requests go to Rubric.** The plugin's MCP server is `https://rubric.design/mcp`. Each request carries your API key as a bearer token. The pages Claude audits are judged by Claude in your session; Rubric receives the checklist requests, the findings, the screenshots Claude attaches and the report requests.
- **Each MCP call counts toward your Rubric plan's MCP call allowance** (daily on the free plan, monthly on paid plans). The plugin never starts Rubric's managed audits, heatmaps or Probes.
- **The audit guard writes small marker files on your machine** in `~/.claude/.rubric-audit-state`. Each file holds a timestamp and is named after the session and audit id. Files older than 24 hours are deleted the next time the guard is called.
- **The audit guard never connects to the network.** It reads the tool call Claude is about to make and either lets it through or returns one short message.
- Nothing else is sent anywhere. Rubric's privacy policy: https://rubric.design/privacy

## What the audit guard does

The plugin includes one hook, `hooks/rubric-audit-guard.js`, which runs before three Rubric tools: `submit_findings`, `get_report` and `create_annotations`. It is a nudge, not a wall:

- If Claude tries to save findings before attaching any marked-up screenshot, the guard stops that call once and explains why screenshots matter. Repeating the same call goes through, so an audit with nothing visual to show is never stuck.
- If Claude asks for the report in a format other than HTML, the guard suggests HTML once, because that is the file a person can be handed and the only format that carries the screenshots. Repeating the call goes through.
- When Claude attaches screenshots, the guard notes it so it won't ask again for that audit.

## Support

help@rubric.design · https://rubric.design

## License

MIT
