# SkillSigil

The living registry of agentic skills. Publish via GitHub, scan with [SkillTrustOps](https://github.com/rakeshcheekatimala/skilltrustops), discover, upvote, and install into your IDE.

## Stack (zero-dollar tier)

- **Next.js 16** (App Router) on **Cloudflare Workers** via `@opennextjs/cloudflare`
- Mostly **SSG/ISR** pages + client islands for upvotes / search / publish
- Design language: Hikari-clean light SaaS with (Geist, zinc, teal trust accent)

## Develop

```bash
pnpm install
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000).

## Cloudflare preview / deploy

Create R2 buckets `skillsigil-isr-cache` and `skillsigil-artifacts`, then:

```bash
pnpm preview   # local workerd
pnpm deploy    # Workers
```

## Routes

| Route | Purpose |
| --- | --- |
| `/` | Brand-first landing |
| `/skills` | Search / trending / categories |
| `/skills/[slug]` | Detail, trust report, upvote, install |
| `/publish` | GitHub URL or zip submit |
| `/api/skills` | List + submit (stub) |
| `/api/skills/:slug/upvote` | Idempotent upvote stub |
| `/api/skills/:slug/manifest` | IDE install manifest |
| `/api/skills/:slug/install` | Download redirect |

Backend wiring (Neon, Upstash, GitHub OAuth, Actions scan) follows the architecture plan; current API handlers are stubs with seed data for UI development.
