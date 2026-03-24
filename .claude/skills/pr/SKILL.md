---
name: pr
description: Create a pull request for the current branch
disable-model-invocation: true
allowed-tools: Bash(gh *), Bash(git *)
---

# Create Pull Request

Create a PR from the current branch to `main`.

## Steps

1. Run `git status` and `git log main..HEAD --oneline` to understand what's being shipped.
2. Read the diff with `git diff main...HEAD` to understand all changes.
3. Write a concise PR title (under 70 chars) and a body with:
   - **Summary** — 1-3 bullet points covering what changed and why
   - **Testing plan** — concrete steps to verify the changes work in the preview environment. These should be specific enough that someone (or Claude) can follow them step by step after the preview deploys. Include: what to navigate to, what actions to take, what the expected result is.
4. Push the branch if needed (`git push -u origin HEAD`).
5. Create the PR:

```
gh pr create --title "..." --body "$(cat <<'EOF'
## Summary
- ...

## Testing plan
- [ ] Step 1: Navigate to ... and verify ...
- [ ] Step 2: ...
- [ ] ...

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

6. Return the PR URL.

## Rules

- Never target `main` with a force push.
- Keep the title short and descriptive — details go in the body.
- Reference GitHub issues if the branch name contains an issue number (e.g., `Closes #3`).
- If there are uncommitted changes, ask whether to commit them first.
- The testing plan is not optional. Every PR must have one. See `packages/e2e/README.md` for the full testing philosophy.
- After the preview environment deploys, the testing plan should be executed against the preview URL to accept the work.
