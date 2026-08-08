# SkillSigil Production Deployment Guide

## Security-First Deployment Checklist

This guide ensures your Skills Registry Platform is deployed securely with zero-dollar infrastructure costs.

---

## 🔐 Security Overview

### Architecture Security Model
- **Authentication**: GitHub OAuth 2.0 with JWT sessions
- **API Security**: Rate limiting, CORS, input validation
- **Database**: SSL-enforced Neon Postgres with connection pooling
- **Secrets Management**: Environment variables, no hardcoded credentials
- **Scan Security**: Signed webhooks for SkillTrustOps callbacks
- **Transport**: HTTPS enforced (automatic with Cloudflare)

---

## 📋 Pre-Deployment Security Checklist

### 1. Generate Strong Secrets

```bash
# Generate SESSION_SECRET (32+ characters)
openssl rand -base64 32

# Generate SCAN_WEBHOOK_SECRET (32+ characters)
openssl rand -base64 32
```

**Critical**: Never commit these to version control. Use `.env.local` locally and Cloudflare secrets for production.

### 2. GitHub OAuth App (Production)

1. Go to https://github.com/settings/developers
2. Click **"New OAuth App"**
3. Fill in:
   - **Application name**: `SkillSigil`
   - **Homepage URL**: `https://your-domain.com` (or `https://skillsigil.pages.dev`)
   - **Authorization callback URL**: `https://your-domain.com/api/auth/github/callback`
4. Save **Client ID** and **Client Secret**

**Security Notes**:
- Use a separate OAuth app for production vs development
- Callback URL must match exactly (including https://)
- Store credentials securely

### 3. Neon Postgres Database

Your database is already set up. Verify security:

```bash
# Check connection string has sslmode=require
echo $DATABASE_URL | grep "sslmode=require"
```

**Security checklist**:
- ✅ SSL enforced (`?sslmode=require` in connection string)
- ✅ Connection pooling enabled (`-pooler` in hostname)
- ✅ No public IP exposure (Neon manages this)

### 4. Upstash Redis & QStash (Optional but Recommended)

For rate limiting and async scan jobs:

1. **Upstash Redis**: https://console.upstash.com/
   - Create Redis database (free tier: 10K commands/day)
   - Copy `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN`

2. **Upstash QStash**: https://console.upstash.com/qstash
   - Get `QSTASH_TOKEN`, `QSTASH_CURRENT_SIGNING_KEY`, `QSTASH_NEXT_SIGNING_KEY`

**Fallback**: If not configured, app uses in-memory rate limiting (works but doesn't persist across Workers instances).

---

## 🚀 Deployment Steps

### Step 1: Cloudflare Account Setup

```bash
# Login to Cloudflare (opens browser)
pnpm wrangler login

# Verify authentication
pnpm wrangler whoami
```

### Step 2: Create R2 Buckets

Cloudflare R2 stores ISR cache and skill artifacts:

```bash
# Create ISR cache bucket (required for Next.js on Workers)
pnpm wrangler r2 bucket create skillsigil-isr-cache

# Create artifacts bucket (for skill downloads)
pnpm wrangler r2 bucket create skillsigil-artifacts
```

**Security**: R2 buckets are private by default. Only your Workers can access them.

### Step 3: Configure Production Secrets

Set environment variables in Cloudflare Workers:

```bash
# Database (already in .env.local, now add to Workers)
pnpm wrangler secret put DATABASE_URL
# Paste: postgresql://neondb_owner:npg_4YXc0pImqvdC@ep-lucky-morning-ax2l1fv8-pooler.c-4.us-east-2.aws.neon.tech/neondb?sslmode=require

# Session secret (generate new one for production!)
pnpm wrangler secret put SESSION_SECRET
# Paste: <output from openssl rand -base64 32>

# GitHub OAuth (production app credentials)
pnpm wrangler secret put GITHUB_CLIENT_ID
# Paste: Ghp_xxxxxxxxxxxx

pnpm wrangler secret put GITHUB_CLIENT_SECRET
# Paste: <your client secret>

# Scan webhook secret (generate new one for production!)
pnpm wrangler secret put SCAN_WEBHOOK_SECRET
# Paste: <output from openssl rand -base64 32>

# Optional: Upstash Redis (if using)
pnpm wrangler secret put UPSTASH_REDIS_REST_URL
pnpm wrangler secret put UPSTASH_REDIS_REST_TOKEN

# Optional: QStash (if using)
pnpm wrangler secret put QSTASH_TOKEN
pnpm wrangler secret put QSTASH_CURRENT_SIGNING_KEY
pnpm wrangler secret put QSTASH_NEXT_SIGNING_KEY

# Optional: GitHub PAT for dispatching scan workflows
pnpm wrangler secret put GITHUB_TOKEN
# Paste: ghp_xxxxxxxxxxxx (PAT with actions:write scope)
```

**Security Best Practices**:
- ✅ Use `wrangler secret put` (encrypted at rest)
- ❌ Never use plain environment variables for secrets in `wrangler.jsonc`
- ✅ Rotate secrets regularly (especially SESSION_SECRET and SCAN_WEBHOOK_SECRET)
- ✅ Use separate credentials for dev/staging/production

### Step 4: Update wrangler.jsonc

Ensure your `wrangler.jsonc` has non-secret environment variables:

```jsonc
{
  "name": "skillsigil",
  "compatibility_date": "2024-01-01",
  "compatibility_flags": ["nodejs_compat"],
  "main": ".open-next/worker.mjs",
  "assets": {
    "directory": ".open-next/assets",
    "binding": "ASSETS"
  },
  "vars": {
    "APP_URL": "https://your-domain.com",
    "SCAN_WORKFLOW_REPO": "rakeshcheekatimala/SkillSigil",
    "SCAN_WORKFLOW_REF": "main"
  },
  "r2_buckets": [
    {
      "binding": "ISR_CACHE",
      "bucket_name": "skillsigil-isr-cache"
    },
    {
      "binding": "SKILL_ARTIFACTS",
      "bucket_name": "skillsigil-artifacts"
    }
  ]
}
```

**Update**:
- `APP_URL`: Your production domain (e.g., `https://skillsigil.com` or `https://skillsigil.pages.dev`)
- `SCAN_WORKFLOW_REPO`: Your GitHub repo (usually `owner/repo`)

### Step 5: Build and Deploy

```bash
# Build for production
pnpm build

# Deploy to Cloudflare Workers
pnpm deploy
```

**Expected output**:
```
✨ Built successfully!
🌍 Deploying to Cloudflare...
✅ Deployed to: https://skillsigil.YOUR-SUBDOMAIN.workers.dev
```

### Step 6: Custom Domain (Optional)

For a custom domain:

1. **Cloudflare Workers domain**:
   ```bash
   pnpm wrangler publish --domain=skillsigil.com
   ```

2. **Or use Cloudflare Pages** (recommended for better DX):
   - Connect your GitHub repo to Cloudflare Pages
   - Set build command: `pnpm build`
   - Set output directory: `.open-next`
   - Add all secrets via Cloudflare Pages dashboard

**Security**: Cloudflare automatically provisions SSL certificates and enforces HTTPS.

---

## 🔒 GitHub Actions Security (SkillTrustOps Scans)

### Step 1: Add Repository Secrets

In your GitHub repo (`rakeshcheekatimala/SkillSigil`):

1. Go to **Settings** → **Secrets and variables** → **Actions**
2. Add **New repository secret**:

| Secret Name | Value | Purpose |
|-------------|-------|---------|
| `SCAN_WEBHOOK_SECRET` | Same as your production secret | Signing scan results |
| `SCAN_CALLBACK_URL` | `https://your-domain.com/api/webhooks/scan` | Where to POST scan results |

### Step 2: Verify Workflow Permissions

In `.github/workflows/skilltrustops-scan.yml`, ensure:

```yaml
permissions:
  contents: read  # Read repo code
  actions: read   # Read workflow context
```

**Security**: Workflow uses least-privilege permissions.

### Step 3: Test Scan Dispatch

After deploying, publish a test skill via the UI. Check:
- GitHub Actions tab shows a new workflow run
- Scan completes successfully
- Results posted back to your app (check skill detail page)

---

## 🛡️ Security Hardening

### 1. Content Security Policy (CSP)

Add to `next.config.ts`:

```typescript
async headers() {
  return [
    {
      source: '/:path*',
      headers: [
        {
          key: 'Content-Security-Policy',
          value: "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:;"
        },
        {
          key: 'X-Frame-Options',
          value: 'DENY'
        },
        {
          key: 'X-Content-Type-Options',
          value: 'nosniff'
        },
        {
          key: 'Referrer-Policy',
          value: 'strict-origin-when-cross-origin'
        }
      ]
    }
  ];
}
```

### 2. Rate Limiting (Production)

With Upstash Redis configured, rate limits automatically apply:
- **Publish skill**: 5 requests / 15 minutes per IP
- **Upvote**: 20 requests / minute per IP
- **API routes**: 100 requests / minute per IP

**Monitor**: Check Upstash dashboard for rate limit hits.

### 3. Database Connection Limits

Neon Free Tier: **100 concurrent connections** (pooler).

If you hit limits:
- ✅ Use HTTP driver (`@neondatabase/serverless` with `fetchConnectionCache: true`)
- ✅ Enable connection pooling (already configured in your `DATABASE_URL`)
- ✅ Monitor via Neon dashboard

### 4. Input Validation

Already implemented:
- ✅ GitHub URL validation (regex + API verification)
- ✅ Slug sanitization (prevents injection)
- ✅ Category whitelist (enum validation)
- ✅ JWT signature verification (prevents token tampering)

### 5. Secret Rotation Schedule

| Secret | Rotation Frequency |
|--------|-------------------|
| `SESSION_SECRET` | Every 90 days |
| `SCAN_WEBHOOK_SECRET` | Every 90 days |
| `GITHUB_CLIENT_SECRET` | Yearly or if compromised |
| `UPSTASH_REDIS_REST_TOKEN` | Yearly |

**How to rotate**:
```bash
# Generate new secret
openssl rand -base64 32

# Update in Cloudflare Workers
pnpm wrangler secret put SESSION_SECRET

# Update in GitHub Actions (if applicable)
# Go to repo Settings → Secrets → Update value
```

---

## 📊 Monitoring & Logging

### Cloudflare Workers Analytics

Monitor in Cloudflare dashboard:
- **Requests**: Total, success/error rates
- **CPU Time**: Stay under 10ms average (free tier limit)
- **Errors**: Track 5xx responses

**Alert on**:
- Error rate > 5%
- CPU time > 8ms average
- Request spikes (potential attack)

### Neon Database Monitoring

Monitor in Neon dashboard:
- **Connections**: Stay under 100 concurrent
- **Storage**: Free tier has 0.5 GB limit
- **Compute time**: Free tier has 191 hours/month

**Alert on**:
- Storage > 400 MB (80% of limit)
- Connections > 80 (approaching limit)

### GitHub Actions Logs

For SkillTrustOps scans:
- Check workflow runs for failures
- Review scan results in workflow logs
- Monitor for stuck/timeout jobs

---

## 🧪 Post-Deployment Verification

### Security Tests

```bash
# 1. Test HTTPS enforcement
curl -I http://your-domain.com
# Should redirect to https://

# 2. Test authentication
curl https://your-domain.com/api/auth/me
# Should return 401 Unauthorized

# 3. Test rate limiting (requires Upstash)
for i in {1..10}; do
  curl -X POST https://your-domain.com/api/skills/test-skill/upvote
done
# Should return 429 Too Many Requests after limit

# 4. Test scan webhook signature
curl -X POST https://your-domain.com/api/webhooks/scan \
  -H "Content-Type: application/json" \
  -d '{"invalid": "payload"}'
# Should return 401 Unauthorized (no valid signature)
```

### Functional Tests

1. **GitHub OAuth**:
   - Visit your site → Click "Sign in"
   - Should redirect to GitHub → Authorize
   - Should redirect back logged in

2. **Publish Skill**:
   - Sign in → Publish → Submit valid GitHub skill URL
   - Should trigger GitHub Actions scan
   - Should show "Scanning..." status

3. **Upvote**:
   - Visit skill detail page → Click upvote
   - Should increment counter (optimistic UI + DB update)

4. **Catalog**:
   - Visit `/skills`
   - Should show published skills with search/filter

---

## 🚨 Incident Response

### Compromised Secrets

If `SESSION_SECRET` or `SCAN_WEBHOOK_SECRET` is compromised:

```bash
# 1. Rotate immediately
pnpm wrangler secret put SESSION_SECRET
pnpm wrangler secret put SCAN_WEBHOOK_SECRET

# 2. Update GitHub Actions secrets
# Go to repo Settings → Secrets → Update SCAN_WEBHOOK_SECRET

# 3. Invalidate all sessions (optional)
# All users will be logged out on next request
```

### Database Breach

If Neon credentials are compromised:

1. **Rotate password** in Neon dashboard
2. **Update** `DATABASE_URL` in Cloudflare Workers:
   ```bash
   pnpm wrangler secret put DATABASE_URL
   ```
3. **Audit** database access logs in Neon dashboard

### DDoS / Abuse

If experiencing abuse:

1. **Enable Cloudflare DDoS protection** (free tier includes basic protection)
2. **Review rate limiting** in Upstash dashboard
3. **Block abusive IPs** via Cloudflare Firewall Rules
4. **Scale rate limits** if legitimate traffic is blocked

---

## 💰 Cost Monitoring (Zero-Dollar Tier)

### Free Tier Limits

| Service | Free Tier | Current Usage | Alert Threshold |
|---------|-----------|---------------|-----------------|
| Cloudflare Workers | 100K requests/day | Monitor in dashboard | 80K/day |
| Neon Postgres | 0.5 GB storage, 191h compute/mo | Check Neon dashboard | 400 MB, 150h |
| Upstash Redis | 10K commands/day | Check Upstash dashboard | 8K/day |
| GitHub Actions | 2000 minutes/month | Check Actions usage | 1600 min |

**Alerts**:
- Set up email notifications in each service's dashboard
- Monitor daily/weekly to avoid hitting limits
- Scale to paid tiers if needed (but try to optimize first)

---

## 📞 Support & Resources

- **Cloudflare Workers**: https://developers.cloudflare.com/workers/
- **Neon Postgres**: https://neon.tech/docs
- **Upstash**: https://docs.upstash.com/
- **Next.js on Cloudflare**: https://opennext.js.org/cloudflare

---

## ✅ Deployment Checklist

Before going live, ensure:

- [ ] All secrets generated and stored securely
- [ ] GitHub OAuth app created for production domain
- [ ] Cloudflare R2 buckets created (`skillsigil-isr-cache`, `skillsigil-artifacts`)
- [ ] All Cloudflare Workers secrets set via `wrangler secret put`
- [ ] GitHub Actions secrets configured (`SCAN_WEBHOOK_SECRET`, `SCAN_CALLBACK_URL`)
- [ ] Production build successful (`pnpm build`)
- [ ] Deployed to Cloudflare Workers (`pnpm deploy`)
- [ ] Custom domain configured (optional)
- [ ] HTTPS enforced (automatic with Cloudflare)
- [ ] Post-deployment security tests passed
- [ ] Monitoring set up (Cloudflare, Neon, Upstash dashboards)
- [ ] Incident response plan documented

---

🎉 **Your SkillSigil platform is now securely deployed on the zero-dollar stack!**
