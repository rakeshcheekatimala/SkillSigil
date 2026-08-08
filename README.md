# SkillSigil

Registry for agentic skills: GitHub auth → publish → SkillTrustOps scan → discover / upvote / install.

**Repo:** https://github.com/rakeshcheekatimala/SkillSigil.git  
**DB:** Neon project `skillsigil` (`autumn-fire-29043878`)

## Local ($0)

```bash
pnpm install
cp .env.example .env.local   # DATABASE_URL + SESSION_SECRET required
pnpm dev
```

Open http://localhost:3000

The catalog starts **empty**. Sign in, then publish a real GitHub skill URL (directory containing `SKILL.md`). There is no seed/fake content.

### Working today without paid services

| Feature | Status |
| --- | --- |
| Browse / search / trending | Neon-backed (empty until real publishes) |
| Skill detail + trust report | Neon-backed |
| Sign in | Full-page nav to demo session, or real GitHub OAuth if env set |
| Publish via GitHub URL | Neon + local static scan (SkillTrustOps Actions when `GITHUB_TOKEN` set) |
| Upvote (idempotent) | Neon composite PK + atomic CTE |
| Rate limiting | Upstash if configured, else in-memory |
| Manifest / install | Live |

## Production Deployment

**📖 See [DEPLOYMENT.md](./DEPLOYMENT.md) for the complete security-first deployment guide.**

### Quick Deployment

Pre-flight security check:

```bash
./scripts/deploy-check.sh
```

Deploy to Cloudflare Workers:

```bash
pnpm wrangler login
pnpm build
pnpm deploy
```

### Essential Setup (Zero-Dollar Stack)

1. **R2 Buckets**: `skillsigil-isr-cache`, `skillsigil-artifacts`
2. **Secrets** (via `pnpm wrangler secret put`):
   - `DATABASE_URL` (Neon Postgres with SSL)
   - `SESSION_SECRET` (32+ chars, `openssl rand -base64 32`)
   - `SCAN_WEBHOOK_SECRET` (32+ chars)
   - `GITHUB_CLIENT_ID` / `GITHUB_CLIENT_SECRET` (production OAuth app)
3. **GitHub Actions Secrets**:
   - `SCAN_WEBHOOK_SECRET` (same as app)
   - `SCAN_CALLBACK_URL` (`https://your-domain.com/api/webhooks/scan`)

### Optional (Recommended)

- **Upstash Redis**: Rate limiting (10K commands/day free)
- **Upstash QStash**: Async scan dispatch
- **GitHub PAT**: For Actions workflow dispatch (`actions:write` scope)

## Scripts

| Command | Purpose |
| --- | --- |
| `pnpm dev` | Local Next.js |
| `pnpm build` | Production build |
| `pnpm preview` | OpenNext + workerd local |
| `pnpm deploy` | Deploy to Cloudflare Workers |
