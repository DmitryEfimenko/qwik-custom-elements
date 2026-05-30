## Summary

<!-- Describe what this PR changes and why. -->

## Checklist

- [ ] All quality gates pass locally (`pnpm build && pnpm typecheck && pnpm test && pnpm lint && pnpm format:check && pnpm compatibility:check`)
- [ ] If generated output changed, `pnpm generate` was run and changed files under `apps/qwik-demo/src/generated/` are committed
- [ ] If this moves responsibility across the core/adapter boundary, `docs/SYSTEM/decisions.md`, `docs/SYSTEM/findings-log.md`, and affected package READMEs are updated

## Breaking changes

- [ ] This PR contains no breaking changes

If this PR **does** contain breaking changes, replace the checkbox above with an explicit `BREAKING` section:

```
## BREAKING

- <what changed>
- <what consumers must update>
```

And confirm:

- [ ] `COMPATIBILITY.md` is updated with the new package version row
