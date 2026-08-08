#!/bin/bash
# SkillSigil Pre-Deployment Security Check
# Run this before deploying to production

set -e

echo "🔐 SkillSigil Deployment Security Checklist"
echo "==========================================="
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

ERRORS=0
WARNINGS=0

check_required() {
  if [ -z "$1" ]; then
    echo -e "${RED}✗${NC} $2"
    ((ERRORS++))
  else
    echo -e "${GREEN}✓${NC} $2"
  fi
}

check_optional() {
  if [ -z "$1" ]; then
    echo -e "${YELLOW}⚠${NC} $2 (optional, but recommended)"
    ((WARNINGS++))
  else
    echo -e "${GREEN}✓${NC} $2"
  fi
}

echo "1. Checking Environment Variables"
echo "-----------------------------------"

# Check .env.local exists
if [ ! -f .env.local ]; then
  echo -e "${RED}✗${NC} .env.local not found!"
  ((ERRORS++))
else
  source .env.local
  
  # Required
  check_required "$DATABASE_URL" "DATABASE_URL set"
  check_required "$SESSION_SECRET" "SESSION_SECRET set"
  check_required "$APP_URL" "APP_URL set"
  check_required "$SCAN_WEBHOOK_SECRET" "SCAN_WEBHOOK_SECRET set"
  check_required "$SCAN_WORKFLOW_REPO" "SCAN_WORKFLOW_REPO set"
  
  # Optional but recommended
  check_optional "$GITHUB_CLIENT_ID" "GITHUB_CLIENT_ID set"
  check_optional "$GITHUB_CLIENT_SECRET" "GITHUB_CLIENT_SECRET set"
  check_optional "$UPSTASH_REDIS_REST_URL" "UPSTASH_REDIS_REST_URL set"
  check_optional "$UPSTASH_REDIS_REST_TOKEN" "UPSTASH_REDIS_REST_TOKEN set"
  check_optional "$GITHUB_TOKEN" "GITHUB_TOKEN set (for scan dispatch)"
fi

echo ""
echo "2. Checking Secret Strength"
echo "----------------------------"

if [ ! -z "$SESSION_SECRET" ]; then
  if [ ${#SESSION_SECRET} -lt 32 ]; then
    echo -e "${RED}✗${NC} SESSION_SECRET too short (${#SESSION_SECRET} chars, need 32+)"
    ((ERRORS++))
  else
    echo -e "${GREEN}✓${NC} SESSION_SECRET length OK (${#SESSION_SECRET} chars)"
  fi
fi

if [ ! -z "$SCAN_WEBHOOK_SECRET" ]; then
  if [ ${#SCAN_WEBHOOK_SECRET} -lt 32 ]; then
    echo -e "${RED}✗${NC} SCAN_WEBHOOK_SECRET too short (${#SCAN_WEBHOOK_SECRET} chars, need 32+)"
    ((ERRORS++))
  else
    echo -e "${GREEN}✓${NC} SCAN_WEBHOOK_SECRET length OK (${#SCAN_WEBHOOK_SECRET} chars)"
  fi
fi

echo ""
echo "3. Checking Database Configuration"
echo "------------------------------------"

if [[ "$DATABASE_URL" == *"sslmode=require"* ]]; then
  echo -e "${GREEN}✓${NC} SSL enforced on database connection"
else
  echo -e "${RED}✗${NC} SSL not enforced (add ?sslmode=require to DATABASE_URL)"
  ((ERRORS++))
fi

if [[ "$DATABASE_URL" == *"-pooler"* ]]; then
  echo -e "${GREEN}✓${NC} Connection pooling enabled"
else
  echo -e "${YELLOW}⚠${NC} Connection pooling not detected (recommended for Workers)"
  ((WARNINGS++))
fi

echo ""
echo "4. Checking wrangler.jsonc Configuration"
echo "------------------------------------------"

if [ -f wrangler.jsonc ]; then
  echo -e "${GREEN}✓${NC} wrangler.jsonc exists"
  
  # Check for R2 buckets
  if grep -q "ISR_CACHE" wrangler.jsonc; then
    echo -e "${GREEN}✓${NC} ISR_CACHE bucket configured"
  else
    echo -e "${RED}✗${NC} ISR_CACHE bucket not configured"
    ((ERRORS++))
  fi
  
  if grep -q "SKILL_ARTIFACTS" wrangler.jsonc; then
    echo -e "${GREEN}✓${NC} SKILL_ARTIFACTS bucket configured"
  else
    echo -e "${YELLOW}⚠${NC} SKILL_ARTIFACTS bucket not configured"
    ((WARNINGS++))
  fi
  
  # Check for nodejs_compat
  if grep -q "nodejs_compat" wrangler.jsonc; then
    echo -e "${GREEN}✓${NC} nodejs_compat flag enabled"
  else
    echo -e "${RED}✗${NC} nodejs_compat flag missing"
    ((ERRORS++))
  fi
else
  echo -e "${RED}✗${NC} wrangler.jsonc not found"
  ((ERRORS++))
fi

echo ""
echo "5. Checking GitHub Workflow Configuration"
echo "-------------------------------------------"

if [ -f .github/workflows/skilltrustops-scan.yml ]; then
  echo -e "${GREEN}✓${NC} SkillTrustOps workflow exists"
  
  # Check for required secrets documentation
  if grep -q "SCAN_WEBHOOK_SECRET" .github/workflows/skilltrustops-scan.yml; then
    echo -e "${GREEN}✓${NC} Workflow uses SCAN_WEBHOOK_SECRET"
  else
    echo -e "${YELLOW}⚠${NC} Workflow may not be using SCAN_WEBHOOK_SECRET"
    ((WARNINGS++))
  fi
else
  echo -e "${RED}✗${NC} SkillTrustOps workflow not found"
  ((ERRORS++))
fi

echo ""
echo "6. Checking Build Configuration"
echo "---------------------------------"

if [ -f package.json ]; then
  if grep -q '"deploy":' package.json; then
    echo -e "${GREEN}✓${NC} Deploy script configured"
  else
    echo -e "${YELLOW}⚠${NC} No deploy script in package.json"
    ((WARNINGS++))
  fi
  
  if grep -q '@opennextjs/cloudflare' package.json; then
    echo -e "${GREEN}✓${NC} OpenNext Cloudflare adapter installed"
  else
    echo -e "${RED}✗${NC} OpenNext Cloudflare adapter not found"
    ((ERRORS++))
  fi
fi

echo ""
echo "7. Security Best Practices"
echo "---------------------------"

# Check for .env.local in .gitignore
if [ -f .gitignore ]; then
  if grep -q ".env.local" .gitignore; then
    echo -e "${GREEN}✓${NC} .env.local in .gitignore"
  else
    echo -e "${RED}✗${NC} .env.local NOT in .gitignore (security risk!)"
    ((ERRORS++))
  fi
fi

# Check if APP_URL is production-ready
if [[ "$APP_URL" == *"localhost"* ]]; then
  echo -e "${YELLOW}⚠${NC} APP_URL still set to localhost (update for production)"
  ((WARNINGS++))
else
  echo -e "${GREEN}✓${NC} APP_URL configured for production"
fi

# Check for HTTPS
if [[ "$APP_URL" == https://* ]]; then
  echo -e "${GREEN}✓${NC} APP_URL uses HTTPS"
else
  echo -e "${RED}✗${NC} APP_URL does not use HTTPS"
  ((ERRORS++))
fi

echo ""
echo "==========================================="
echo "Summary"
echo "==========================================="

if [ $ERRORS -gt 0 ]; then
  echo -e "${RED}✗ $ERRORS error(s) found${NC}"
fi

if [ $WARNINGS -gt 0 ]; then
  echo -e "${YELLOW}⚠ $WARNINGS warning(s) found${NC}"
fi

if [ $ERRORS -eq 0 ] && [ $WARNINGS -eq 0 ]; then
  echo -e "${GREEN}✓ All checks passed! Ready to deploy.${NC}"
  echo ""
  echo "Next steps:"
  echo "1. Run: pnpm wrangler login"
  echo "2. Run: pnpm build"
  echo "3. Run: pnpm deploy"
  exit 0
elif [ $ERRORS -eq 0 ]; then
  echo -e "${GREEN}✓ No critical errors found.${NC}"
  echo -e "${YELLOW}⚠ Please review warnings before deploying.${NC}"
  exit 0
else
  echo -e "${RED}✗ Please fix errors before deploying.${NC}"
  echo ""
  echo "See DEPLOYMENT.md for detailed instructions."
  exit 1
fi
