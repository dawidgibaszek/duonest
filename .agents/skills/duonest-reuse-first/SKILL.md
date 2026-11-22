---
name: duonest-reuse-first
description: Find and extend existing DuoNest components, composables, utilities, or backend handlers before adding code for a feature, bug fix, or refactor.
---

# Reuse first

1. Find the feature's entry point with targeted `rg` searches, then inspect the nearest implementation and its callers. For UI, look in existing pages, components and shared styles. For data, follow the composable into the existing Firebase path and check the deployed Functions handler when the API is involved.
2. Reuse or extend the smallest existing unit that fits. Check that it has the right behavior, ownership and lifecycle for the new caller. Keep the established Ionic, Capacitor and Firebase patterns when they apply.
3. Add a new helper only for a real gap. Keep a one-off operation close to its caller. A few readable lines can be better than coupling unrelated features just to remove duplication.
4. Review the diff for duplicate logic and obsolete code made unnecessary by this change. Preserve existing callers, permission checks and native/web behavior. Check the feature through its normal entry point.
