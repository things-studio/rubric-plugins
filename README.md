# Rubric plugins

Claude Code plugins for [Rubric](https://rubric.design) — a curated UX corpus
served to coding agents over MCP.

```
/plugin marketplace add things-studio/rubric-plugins
/plugin install rubric-audit@rubric
```

Installing configures the MCP connection as well. You will be asked for a
Rubric API key once; create one at <https://rubric.design/app>. It is stored by
Claude Code and sent as a bearer token — it is never written into this
repository or into your project.

## Plugins

| plugin | what it does |
|---|---|
| `rubric-audit` | Audit a live site and produce a report: severity, evidence, and the fix. |

`rubric-design`, for design-time guidance, is not published yet.

## Why a plugin and not just the MCP server

The MCP server holds the knowledge. It does not hold the method.

Each tool documents its own contract, but nothing documents the ORDER, and the
order is where audits go wrong. An agent coming to these tools cold will
reliably get three things wrong:

- **`mechanics` is what you OBSERVED, not what you want.** Checks that
  presuppose a carousel are withheld until you report a carousel. That makes an
  audit a two-pass job — walk the site, *then* fetch the checklist — and
  nothing in the tool list says so.
- **Omitting a unit is not the same as skipping it.** A unit left out of a
  submission is indistinguishable from one you were never given, so a partial
  audit reads as a complete one. `not_applicable` and `not_reached` exist to
  prevent exactly that, and they are free-tier fields so nobody pays to learn
  what an audit skipped.
- **Evidence is an observation, not a verdict.** The finding text is the
  corpus's, resolved at the customer's tier. An agent that writes its own
  replaces a curated finding with a paraphrase.

That method is what the plugin ships.

## Requirements

An audit needs a **browser**. The corpus judges a rendered page — contrast,
focus visibility, motion, what sits above the fold — and `WebFetch` returns
markup, which cannot answer any of those. Claude in Chrome or a
Playwright/Puppeteer MCP both work.

Without one the skill still runs, but it audits only what markup can settle
and records the rest as `not_reached`. That is deliberate: a gap the customer
can see is worth more than a confident wrong finding.

## Licence

MIT. The corpus itself is a service, not part of this repository.
