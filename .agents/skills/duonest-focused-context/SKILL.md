---
name: duonest-focused-context
description: Narrow DuoNest repository search, file reads, and validation output when investigating a bug or preparing a localized code change.
---

# Focused context

- Start with the exact route, label, endpoint, error, or symbol. Search the likely directories with `rg -n` or `rg --files`. Read just the matching function, callers, and relevant state. Widen the search when evidence points outside that area.
- For production API bugs, inspect `firebase.json` and the relevant handler in `functions/src/`. Follow the Nuxt dev handler too when it serves the same route locally. For native-only behavior, start at the relevant plugin and platform configuration.
- Skip generated output, caches, dependency trees and bulk logs by default. Use the manifest or lockfile to resolve versions. For a specific dependency behavior the repository cannot explain, consult only the installed dependency and its versioned documentation.
- Run the narrowest meaningful check first. Keep the failure and enough surrounding lines to diagnose it. In review or rework, use the current diff and earlier findings to avoid retracing resolved issues.
