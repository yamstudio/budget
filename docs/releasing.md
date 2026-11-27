# Releasing to production

Merging to `master` does **not** deploy. `master` is kept releasable by CI (PR checks are required, and CI also runs on every push to `master`). Production changes only when the owner publishes a GitHub Release, so the owner decides when, and how much, ships.

## Cut a release (owner)
1. GitHub, **Releases**, **Draft a new release**.
2. **Choose a tag** and create a new one targeting `master`. Use semantic versioning with a `v` prefix: `v0.1.0` was the first release. Bump the patch (`v0.1.1`) for fixes and the minor (`v0.2.0`) for features; go to `v1.0.0` when the app is stable. Any `v<digit>...` tag works with the workflow.
3. Click **Generate release notes**: it lists the PRs merged since the last release. Read them; that is your review of what ships.
4. **Publish release** (not a pre-release, not a draft: drafts do not deploy).
5. Watch the run in Actions ("Build and deploy Budget app to Azure"). The run summary also lists the commits since the previous release.
6. If the release changes `infra/`, the run first pauses for approval of the **production-infra** environment: it plans Terraform, refuses to delete or replace anything, and applies the rest. Releases without infra changes skip that gate.
7. If the release changes `src/WebApi/Migrations`, the run pauses for approval of the **production-migrations** environment: read the SQL in the summary, then approve (see `docs/migrations.md`). Releases without migration changes skip that gate.
8. The deploy ends with a smoke check (the app answers; a redirect to sign-in counts as up). It does not prove the app works, so open the app after a release.

## What the workflow enforces
- Only a tag named `v<digit>...` that is part of `master`'s history can deploy. Running the workflow by hand from a branch, or from a tag on an unmerged commit, fails in the `guard` job. So unreviewed branch code cannot ship.
- The tagged commit must pass all CI checks again before anything is built or applied.
- Deploys never overlap (`production-deploy` concurrency group). If a second release is queued while one is running, a still-pending older run can be replaced by the newest; check Actions if a release seems to have vanished.

## Required GitHub settings
- The `production-migrations` environment must allow **tags**: Deployment branches and tags, Selected branches and tags, with a branch rule for `master` (manual verify runs) and a tag rule for `v*`. With "Protected branches only" the migrate job is rejected before it starts (no steps, no log; the reason is in the job's check-run annotation).
- The `production-infra` environment has the owner as required reviewer and the same `v*` tag rule.
- The `production` environment carries the same `v*` tag rule (its deploy identity's federated credential trusts that environment).

## If a release run fails
- The workflow file used by a release run is the one **at the tag's commit**, so fixing a broken workflow on `master` does not repair an existing tag. Merge the fix, then cut a **new** tag (for example `v2026.11.26.1`).
- A failed release that never deployed can be deleted (Releases, delete, and also delete the tag). Otherwise it counts as the "previous release" when the next run decides whether migrations changed.
- A run that failed before `deploy` changed nothing in production, and the migration step only starts after your approval.

## Roll back
Actions, **Build and deploy Budget app to Azure**, **Run workflow**, and in **Use workflow from** pick the older `v*` tag. It rebuilds and redeploys that tag. Caveats:
- Database migrations are not reversed. Because migrations should be additive (`docs/migrations.md`), older code normally still runs on the newer schema. If a release made a destructive schema change, restore the database to the restore point printed in that release's migration run (7-day point-in-time restore) before or instead of rolling code back.

## Rules for Claude
Claude never creates tags or releases, never runs the deploy workflow, and never approves environments. It may draft release-note text on request. Branch protection and the `guard` job are the technical limits; this rule covers the rest.
