# DuoNest

- For code changes, start at the affected entry point and search for an existing implementation before adding one. Use [duonest-reuse-first](.agents/skills/duonest-reuse-first/SKILL.md).
- For investigating bugs or locating a small change, limit searches and reads to relevant symbols, call sites and subsystems. Use [duonest-focused-context](.agents/skills/duonest-focused-context/SKILL.md).
- Keep app-authored UI and notification text free of emoji. Use Ionicons or existing SVG assets for visual cues and reuse the app's black, white and cream design tokens.
- Use the selected grammatical form for person-specific text. Use neutral wording when a profile or its preference is unavailable.
- Project documentation in `docs/` is configured as an Obsidian vault (`docs/.obsidian/`). When creating or editing notes, bases, or canvases in `docs/`, follow the installed Obsidian skills in `.agents/skills/` (`obsidian-markdown`, `obsidian-bases`, `json-canvas`, `obsidian-cli`).
- Shared skills (including `ponytail` and `obsidian-*`) live in `.agents/skills/` (symlinked to `.claude/skills/` for Claude Code) and are tracked in `skills-lock.json`.
