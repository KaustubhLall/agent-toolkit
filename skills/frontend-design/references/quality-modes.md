# Optional quality modes

Read this reference only when a substantive frontend task meets one of the four gates below. It is not a pre-merge checklist, a standing audit schedule, or a reason to delay an ordinary component, copy, styling, or layout change.

The measurement-first release-audit method is adapted from `addyosmani/web-quality-skills@afa8da942115f2961fdbfa80807ea0b232ff6c00`, `skills/web-quality-audit/SKILL.md`, under the MIT license retained as `../LICENSE-WEB-QUALITY-MIT.txt`. Its source manifest records SHA-256 `1903cfb4dcba987d50dc7a51f6c19ec43830ff924c2c8f78979d8775fbe20f91`. The React/Vite/Next distinctions and browser-regression routing below are local integration guidance, not copied upstream rule catalogs.

## Choose a mode

| Gate | Read this mode | Do not select it for |
|---|---|---|
| The task has two or more credible layouts or hierarchy directions, and the choice would change task completion, comprehension, brand fit, responsive behavior, or accessibility. | [Design divergence](#design-divergence) | Routine spacing, a known component pattern, copy, or a user-specified visual direction. |
| A user-visible interaction is demonstrably slow, a release regression is reported, or a task explicitly asks for performance work. | [Measured performance diagnosis](#measured-performance-diagnosis) | A source-only suspicion, an unmeasured “optimization,” or a backend problem already localized outside the browser. |
| A public release, explicitly requested web-quality audit, or launch decision needs evidence across relevant browser quality categories. | [Release-quality audit](#release-quality-audit) | Authenticated/PII-bearing routes without a safe fixture, or recurring audits with no release/change trigger. |
| A reproduced user journey cannot be established by the chosen unit/component layer because it depends on the rendered browser, navigation, focus, or integration between local services. | [First browser regression](#first-browser-regression) | Pure functions, component-local state, queue/worker semantics, or an un-reproduced hypothesis. |

When a gate does not match, follow the compact frontend-design workflow normally. The focused dialog, keyboard-navigation, and accessibility-regression skills remain the preferred routes for their specific accessibility work.

## Design divergence

First state the competing directions and the decision that differs between them. Compare them against the product's primary task, real content, established components/brand, narrow-width behavior, keyboard/touch use, implementation cost, and any measured or known performance constraint. Select one direction and record the reason in the implementation or review; prototype both only when the decision cannot be resolved from those criteria.

Examples that qualify include deciding between a dense campaign workspace and a progressive-detail workflow, or whether a portfolio section should lead with work evidence or narrative. A request such as “align this existing button” does not qualify.

## Measured performance diagnosis

Establish the interaction, dataset/content size, device/browser, build or release identity, baseline observation, and target before changing code. Use a comparable browser trace or equivalent runtime evidence to classify the dominant cost: loading/network, JavaScript/main thread, rendering/layout, image/font/media, or a remote/API response. Inspect source only to explain that observation, and repeat the same scenario after the narrowest change.

Use the actual runtime before selecting tactics:

| Runtime | Inspect first | Avoid assuming |
|---|---|---|
| React 18/Vite | Client requests, state ownership, list/filter/render cost, event timing, and API payload/response boundaries. | Next Server Components, RSC serialization, server actions, or Next-specific dynamic APIs. |
| Next 16 static export | Generated assets, images/fonts, client JavaScript/hydration, route output, and public release behavior. | A server-rendered request path or runtime headers that static hosting does not provide. |
| Static HTML | Critical asset delivery, CSS/layout/paint, scripts, images/fonts, and browser behavior. | React hydration, component memoization, or framework data fetching. |

For a long list, distinguish pagination/windowing from paint containment: `content-visibility` may reduce paint work, but it is not list virtualization and may change discovery/accessibility behavior. For an input, preserve immediate typing and prove ordering/cancellation before retaining a deferred or debounced result. Stop this mode if the trace localizes the bottleneck to campaign aggregation, payload size, polling, or another service-side path; hand off to the relevant backend workflow with the trace evidence.

## Release-quality audit

Use only a public URL or a safe, representative local fixture. Define the route, viewport/device, network conditions, build/release identity, and whether the evidence is field or lab data. Capture the minimum relevant evidence before broad source inspection:

- a browser trace for a performance claim;
- Lighthouse or equivalent automated results for the requested accessibility, SEO, and browser-best-practice categories;
- rendered semantics and a manual journey for interaction claims;
- source/config inspection only to explain an observed issue.

Keep aggregate scores separate from pass/fail conclusions. Report the evidence conditions, confidence, user impact, and up to three concrete fixes. Re-run equivalent checks and the affected manual flow after a change. Field data, edge headers, and CDN behavior remain unverified unless actually observed from their source of truth. Do not add `llms.txt`, WebMCP, metadata, CSP, or SEO changes merely to improve an automated score.

## First browser regression

The absence of a browser runner is not disqualifying. Choose one only after a reproduced journey demonstrates that the browser layer adds evidence unavailable from existing tests.

1. Define the exact visible property and the safest fixture. A first test should avoid real Google/OAuth exchange, AWS writes, queues, email sends, production identities, and contact PII.
2. Choose the project-owned runner and browser version. If a third-party helper is proposed, inspect and pin it before execution; do not treat it as a black box.
3. Perform rendered reconnaissance, then use stable role/name/test-id selectors. Assert the original failure and the post-fix behavior, including focus/navigation where that is the property.
4. Keep pure parsing, URL/state, and worker semantics in unit/property tests. The browser test owns only the integration property it demonstrates.

For HUT-97 modal behavior, use the dialog and keyboard specialists first and add a focused browser regression only after the repaired interaction is verified. For HUT-100, separate OAuth callback UI behavior from Gmail sender OAuth/provider behavior and use fakes for the latter.
