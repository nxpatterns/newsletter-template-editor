# GitHub Pages Deployments via Actions

Generic reference for deploying static sites (SPA, Angular, Vite, Astro, …) to **GitHub Pages** using **GitHub Actions** (`actions/upload-pages-artifact` + `actions/deploy-pages`).

Focus: failures that look like “Pages is not enabled” even when the Settings UI already shows GitHub Actions as the source.

## Goal

Push (or manual dispatch) on the default branch → build artifact → Pages deployment → public site under:

- User/org project site: `https://<owner>.github.io/<repo>/`
- User/org root site (`<owner>.github.io` repo): `https://<owner>.github.io/`

## Required setup (checklist)

### Repository settings

- **Settings → Pages → Build and deployment → Source** = **GitHub Actions** (not “Deploy from a branch”).
- Repo may be public or private (private Pages needs a plan that includes private Pages).
- Actions enabled for the repository (`Settings → Actions → General`).

### Workflow permissions

The workflow (or repo default) must grant the `GITHUB_TOKEN` at least:

```yaml
permissions:
  contents: read
  pages: write
  id-token: write
```

Without `pages: write` and `id-token: write`, `actions/deploy-pages` cannot create a deployment (OIDC + Pages API).

### Minimal workflow shape

```yaml
name: Deploy to GitHub Pages

on:
  push:
    branches: [main]
  workflow_dispatch:

permissions:
  contents: read
  pages: write
  id-token: write

concurrency:
  group: pages
  cancel-in-progress: true

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      # … install + build …
      - uses: actions/upload-pages-artifact@v3
        with:
          path: dist/…   # folder that contains index.html

  deploy:
    needs: build
    runs-on: ubuntu-latest
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    steps:
      - id: deployment
        uses: actions/deploy-pages@v4
```

Notes:

- **Two jobs** (build → deploy) is the supported pattern. Deploy consumes the Pages artifact from the build job.
- `environment.name: github-pages` is the conventional environment name Pages expects.
- Prefer `concurrency.group: pages` so overlapping pushes do not race deployments.

### App base path (project sites)

For a **project site** (`/<repo>/`), the built `index.html` must use a matching base URL. Otherwise assets 404 even when deploy is green.

| Stack | Typical setting |
| --- | --- |
| Angular | `projects.*.architect.build.configurations.production.baseHref`: `"/<repo>/"` |
| Vite | `base: '/<repo>/'` in `vite.config.*` |
| Astro | `site` + `base: '/<repo>/'` |
| Next (static export) | `basePath: '/<repo>'` |

Root sites (`<owner>.github.io`) use `/`.

Verify after deploy:

```bash
curl -sI "https://<owner>.github.io/<repo>/"
curl -s "https://<owner>.github.io/<repo>/" | head
# Expect HTTP 200 and <base href="/<repo>/"> (or equivalent asset paths)
```

### Artifact path

`upload-pages-artifact` `path` must point at the directory that **directly** contains `index.html` (and assets), not a parent that only holds a nested folder.

Angular application builder example:

```text
dist/<project-name>/browser
```

Wrong path → build job fails at upload, or deploy serves an empty/wrong tree.

## Symptom: deploy 404 “Ensure GitHub Pages has been enabled”

### What you see

- **Build job**: green (checkout, install, build, upload artifact OK).
- **Deploy job**: fails on `Deploy to GitHub Pages` (`actions/deploy-pages`).
- Log excerpt (canonical):

```text
##[error]Creating Pages deployment failed
HttpError: Not Found
Error: Failed to create deployment (status: 404) with build version <sha>.
Ensure GitHub Pages has been enabled: https://github.com/<owner>/<repo>/settings/pages
```

### What it does *not* mean

- Not “you forgot `gh auth login`” on the laptop (Actions uses `GITHUB_TOKEN`).
- Not necessarily “Source is still Deploy from a branch” — the UI can already show **GitHub Actions**.
- Not a broken production build if the build job already succeeded and the artifact path was accepted.

### Root cause pattern

Pages is only **partially** provisioned:

| Signal | Healthy | Broken (this failure mode) |
| --- | --- | --- |
| `GET /repos/{owner}/{repo}/pages` → `build_type` | `"workflow"` | often already `"workflow"` (misleading) |
| `status` | `"built"` / `"building"` after first success | `null` |
| Environments | environment `github-pages` exists | **missing** or incomplete |
| Pages deployments list | at least one deployment after success | **empty** |
| UI Settings → Pages | Source = GitHub Actions | same — UI alone is insufficient |

`actions/deploy-pages` calls the Pages deployment API. If the site/environment backend state was never fully created, the API returns **404**, and the action maps that to the generic “enable Pages” message.

Typical ways to get into this state:

- Source switched to Actions in the UI, but no successful Pages deployment ever completed.
- Repo created / Pages toggled quickly; environment not created yet.
- Environment `github-pages` deleted or never created; protection rules blocking first deploy (less common for the pure 404).
- Org/user policy or plan limits (rarer; often different error text).

### Diagnosis with GitHub CLI

```bash
# Auth and repo
gh auth status
gh repo view --json name,owner,url,defaultBranchRef,visibility

# Pages configuration
gh api repos/<owner>/<repo>/pages

# Environments (expect github-pages)
gh api repos/<owner>/<repo>/environments

# Recent workflow runs
gh run list --workflow=deploy.yml --limit 5
gh run view <run-id> --log-failed

# Optional: deployments under Pages
gh api repos/<owner>/<repo>/pages/deployments
```

Interpret:

- Build green + deploy 404 + `pages.build_type == workflow` + **no** `github-pages` environment → provisioning gap (this doc).
- Build red → fix Node/package manager/build/`path` first.
- Deploy permission errors → fix `permissions:` / org Actions token policy.
- Deploy green but blank site / wrong assets → `baseHref` / `base` / asset paths.

### Repair

Re-assert workflow-based Pages and ensure the environment exists, then re-run the workflow.

```bash
# Pin Pages to Actions builds
gh api --method PUT repos/<owner>/<repo>/pages --input - <<'EOF'
{"build_type":"workflow"}
EOF

# Create or refresh the conventional environment (no wait / no reviewers)
gh api --method PUT repos/<owner>/<repo>/environments/github-pages --input - <<'EOF'
{"deployment_branch_policy":null}
EOF

# Verify
gh api repos/<owner>/<repo>/pages
gh api repos/<owner>/<repo>/environments

# Re-run deploy
gh workflow run deploy.yml --ref main
# or: gh run rerun <failed-run-id> --failed

gh run list --workflow=deploy.yml --limit 3
gh run watch <run-id> --exit-status
```

UI alternative:

- **Settings → Pages** → Source **GitHub Actions** → save again.
- **Settings → Environments** → ensure `github-pages` exists; remove unexpected required reviewers / wait timer for the first deploy if they block you.
- **Actions** → open the workflow → **Re-run** or **Run workflow**.

After the first **green** deploy:

- `pages.status` should leave `null`.
- Site URL from the environment / run should respond `200`.
- Later pushes to the watched branch should deploy without manual environment surgery.

## Other frequent failure modes

### Wrong Source: branch deploy vs Actions

If Source is still “Deploy from a branch”, Actions-based `deploy-pages` is the wrong tool (or conflicts with branch publishing). Switch to **GitHub Actions** and use the artifact workflow above.

### Environment protection rules

`github-pages` with required reviewers or a wait timer will pause or block deploy until someone approves. Fine for controlled prod; surprising on a personal project. First-time setup is easier with **no** protection rules.

### Concurrency cancelling in-progress runs

`cancel-in-progress: true` is usually desirable. Rapid consecutive pushes cancel older deploys; only the latest should matter.

### Node / package manager on the runner

- Match the project’s Node major (`actions/setup-node` + `.nvmrc` / `package.json` engines if present).
- Prefer lockfile installs: `npm ci`, `pnpm i --frozen-lockfile`, `yarn install --immutable`.
- Cache the package manager via `actions/setup-node` `cache:`.

### SPA client-side routes on refresh

GitHub Pages serves static files only. Deep links like `/<repo>/some/route` 404 on refresh unless you add a `404.html` fallback (copy of `index.html`) or hash routing. Separate concern from deploy API 404s.

### Custom domain / HTTPS

`https_enforced` and custom domain verification are independent of the first Actions deploy. Fix DNS/domain after the default `*.github.io` URL works.

## Verification after a green run

```bash
gh api repos/<owner>/<repo>/pages --jq '{status,build_type,html_url}'
gh run list --workflow=deploy.yml --limit 1

curl -sI "https://<owner>.github.io/<repo>/"
# HTTP/2 200

curl -s "https://<owner>.github.io/<repo>/" | head -n 30
# index.html with correct base href / asset URLs
```

Optional browser check: hard refresh; confirm JS/CSS load under `/<repo>/…`, not `/…`.

## Operational commands (cheat sheet)

```bash
# Trigger
gh workflow run deploy.yml --ref main

# Inspect
gh run list --workflow=deploy.yml --limit 5
gh run view <id>
gh run view <id> --log-failed
gh run watch <id> --exit-status

# Pages / env
gh api repos/<owner>/<repo>/pages
gh api repos/<owner>/<repo>/environments
gh api --method PUT repos/<owner>/<repo>/pages --input - <<<'{"build_type":"workflow"}'
gh api --method PUT repos/<owner>/<repo>/environments/github-pages --input - <<<'{"deployment_branch_policy":null}'
```

## Takeaways

- **Green build ≠ live site.** Always confirm the **deploy** job and an HTTP 200 on the Pages URL.
- The message **“Ensure GitHub Pages has been enabled”** on `deploy-pages` is often a **404 from the Pages deployment API**, not a literal “checkbox off” in the UI.
- When UI says Actions but deploy 404s: check **`github-pages` environment**, `build_type: workflow`, and re-run after provisioning.
- Configure **`baseHref` / `base`** for project sites before calling the deploy “done”.
- Point **`upload-pages-artifact` `path`** at the folder that contains `index.html`.

## Related project notes

This repository’s workflow lives at `.github/workflows/deploy.yml`. Production Angular `baseHref` is `/newsletter-template-editor/`. Public URL:

`https://nxpatterns.github.io/newsletter-template-editor/`
