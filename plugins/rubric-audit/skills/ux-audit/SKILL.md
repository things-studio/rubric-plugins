---
name: ux-audit
description: Audit a live website's UX against the Rubric corpus and produce a report. Use when asked to audit, review or evaluate a site's user experience, accessibility, conversion or checkout flow — and when asked why a page underperforms. Not for design-time guidance; that is get_guidelines.
---

# Running a UX audit

The `rubric` MCP server holds the knowledge. It does not hold the method. Each
tool describes its own contract; nothing describes the ORDER, and the order is
where audits go wrong.

You are the eyes. The corpus judges a rendered page — contrast, focus
visibility, motion, what sits above the fold, whether a control looks like a
control. The server never sees the site. Every one of those answers comes from
you actually looking.

## Before anything

**A browser.** Check what you have: Claude in Chrome, a Playwright/Puppeteer
MCP, a browser tool of any kind. `WebFetch` is not one — it returns markup, and
markup cannot answer "is the focus ring visible" or "does this move".

If you have no browser, say so plainly before you start, and audit only what
markup can settle. Everything else is `not_reached` with that as the reason.
Do not guess a visual answer from HTML. A confident wrong finding costs the
customer more than a gap they can see.

**Audit the live URL. Never a copy of it.** Do not download, mirror or snapshot
the site, and do not stand up a local server to serve it back to yourself. A
mirror is not the site: scripts that never ran, fonts that resolved differently,
CSS that depended on the real origin, and content that only appears after
hydration all make the copy answer questions the live page would answer
otherwise. An audit of a mirror is a confident wrong finding at scale, and the
customer's URL is right there.

**Measure inside the live page, not in a program beside it.** Checks like
contrast, focus visibility and what sits above the fold are measurements, and
`how_to_find` will often tell you which page to be on without telling you how to
take the measurement. Take it in the page: your browser tool can evaluate
JavaScript against the document, so read real values with `getComputedStyle`,
compute a contrast ratio there, focus an element and look at what changed. One
evaluation in the live page settles what a local Playwright rig spends minutes
failing to reproduce. If a script is the right tool, run it IN the page — never
as a Node program pointed at a downloaded folder.

**A real URL.** Synthetic hosts — `localhost`, private IPs, `.test`/`.local`/
`.example`, `smoke-`/`bench-`/`test-` prefixes — are deliberately never
persisted. They return `persisted: false` and there is no report to fetch
later. Use one only when you are testing this workflow, not when someone wants
a result.

## The shape

Six steps. Steps 1 and 2 are separate on purpose.

### 1. Walk the site once, before you fetch any checklist

You cannot ask for the right checklist until you know what the site has.
Record:

- **the vertical** — one of `ecommerce marketplace ott saas corporate landing`
- **which surfaces exist** — homepage, search, product, cart, checkout,
  account, and so on. A surface that does not exist is not a failure; it is a
  surface you will not request.
- **the mechanics present** — carousel, video, modal, chat widget, testimonial,
  infinite scroll, and the rest.

**`mechanics` is what you OBSERVED, not what you are interested in.** This is
the single most common way to get an audit wrong. Checks that presuppose a
component — "are the carousel's arrows reachable" — are withheld until you say
the carousel is there. Checks whose finding IS the absence of something are
never gated, so declaring nothing loses none of them, and declaring something
you did not see invents work.

Note the obvious blockers now too: a login wall, a region block, a cookie
gate you cannot pass. They become `not_reached` reasons later, and a reason
written while you are looking at the thing is a better reason than one
reconstructed at submission time.

### 2. `create_audit`

`url`, the `vertical` you decided, and a `label` a human will recognise later.
Keep the `audit_id`.

### 3. `get_checklist`, per surface

Pass the surfaces you found, the `mechanics` you observed, and `device`.
`include_login_gated` stays false unless you can actually authenticate.

This tool is **free in full** on every account — it returns navigation data,
not know-how. Fetch what you need; the cost is one call, not the contents.

Each item hands you `how_to_find`, `url_patterns`, `fallback_nav` and the
outcomes you may choose between. It gives you no severity and no finding text,
because judging is not your job — observing is.

### 4. Walk it again, and judge

For each unit: go where `how_to_find` says, look, and pick **exactly one** of:

- an **outcome** — `unit_key` + `outcome_key`, plus `evidence`
- a **state** — `unit_key` + `state` + `reason`, and no outcome_key

States are `not_applicable` (you reached the surface and the precondition is
genuinely absent) and `not_reached` (you could not get there at all).

**Evidence is what you saw. Never what it means.**

> good — `"Checkout at /checkout offers only 'Create account'. No guest option
>  in the form, the sign-in panel or the footer."`
> bad — `"Forcing account creation hurts conversion."`

The second sentence is the server's to write, from the corpus, at the customer's
tier. Writing it yourself replaces a curated finding with your paraphrase, and
the customer paid for the curated one.

**A reason must name what you looked for and did not find.**

> good — `"No search box in the header, the footer, or at /search."`
> bad — `"n/a"`, `"not applicable"`, `"couldn't check"`

`not_applicable` for a check that was merely hard misreports the audit. If it
was hard and you did not do it, that is `not_reached`, and saying so is the
honest answer.

### 5. `submit_findings`

Everything in ONE call, passed inline as the tool argument. The cap is 300
selections and a full checklist sits well inside it — a hundred units is
roughly 20 KB of JSON.

**Do not build a pipeline to get there.** Do not write the payload to a file,
generate a script to assemble it, or split it into batches. An audit that spent
forty minutes running shell commands to construct `batch2.json` is the reason
this paragraph exists: that work is pure overhead, it takes far longer than the
call it prepares, and the call would have accepted the whole thing at once.
Split only if you genuinely exceed 300.

**Submit the passes and the states too.** A unit you leave out is
indistinguishable from a unit you were never given. The report cannot tell the
customer "we checked this and it did not apply" unless you say so, and a
partial audit that omits its gaps reads as a complete one. That is the failure
this whole shape exists to prevent.

A pass produces no finding, only a count. A selection matching no known unit
comes back in `unresolved` rather than being dropped — read that array; it
usually means a typo in a `unit_key`.

**Check the response accounts for everything you sent.** `summary.submitted` is
how many selections arrived, and it should balance:

```
submitted === critical + high + medium + low
           + passed + not_applicable + not_reached + unresolved.length
```

If it does not, say so rather than working around it — that is a defect in the
server, and it is reported as one.

### 5b. Capture the evidence you are asserting

A finding that says a label measured 4.17:1 is a claim. A cropped image of that
label with a box around it is the proof, and the difference between the two is
what separates a report from a consultancy deliverable.

**Crop to the finding. Never ship the full page as evidence.** A full-page
capture of a long page is megabytes in which nobody can find the 12-pixel label
you are talking about. Capture the element and enough around it to place it,
mark it, and move on.

**Number each image to the finding it proves, and cite that number in the
finding.** `01-hero-etiket-kontrast.png` against finding 1. An archive of
screenshots nobody references is weight, not evidence — if the report never
names an image, do not produce it.

**Annotate.** A box or arrow on the element, and a short label carrying the
measured value. This is the same thing the corpus asks of a product page in
`product_detail.image-feature-callouts`; a report that recommends callouts and
ships bare screenshots argues against itself.

**Only where the evidence is visual.** Contrast, spacing, layout, a missing
element, a target too small — capture those. A missing `autocomplete`
attribute, an undefined CSS variable or a slow server response are settled by
the value you already quoted, and an image of them proves nothing. Roughly a
third of findings earn an image; producing one per finding is the burden this
section exists to avoid.

State the viewport and whether the capture is live or reconstructed. If any
capture was not taken against the live URL, say so on the image, not only in a
readme.

### 6. `get_report`

`output: 'markdown'` for something to hand a person, `summary` for the
structured payload. Findings resolve from the corpus at read time, so a report
re-fetched later reflects the corpus as it is then.

## When you report back to the human

Lead with severity, because severity is the only ranking signal there is.

**Do not compute a score.** No percentage, no grade, no "7 of 10 passed" framed
as a result, no confidence rating. The corpus refuses to produce one and so
should you — a number invites comparison between two audits that judged
different numbers of units on different sites, and it buries the one thing that
matters, which is that a critical finding is critical.

Say what was not judged. `not_applicable` and `not_reached` are in the report
for a reason, and they are free-tier fields precisely so nobody has to pay to
learn what the audit skipped.

## Cost

The free tier is capped by **calls**, not money — 100 per rolling 24 hours per
account, `get_checklist` included. A per-page loop over a large site will hit
that; batch by surface instead.

Free accounts receive `issue` and `severity` on every finding. `impact`,
`actions` and `references` are the paid fields. If the account is on the free
tier, say what the report is missing rather than presenting a thinner document
as the whole thing.

## What this skill is not for

Design-time work — "how should I build this checkout" — is `get_guidelines`
and `get_checklist` without an audit around them. Do not create an audit for a
page that does not exist yet.
