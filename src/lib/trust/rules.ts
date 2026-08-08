/**
 * Rule catalogue mirrored from the SkillTrustOps `recommended-v2` policy.
 *
 * Rule IDs, severities, checks and developer actions are transcribed from the
 * scanner's published docs (`docs/security-scan.md`, `docs/policy-reference.md`).
 * Do not add a rule ID here unless the scanner documents it — an invented ID
 * would make the catalogue unverifiable, which defeats its purpose.
 *
 * Source: https://github.com/rakeshcheekatimala/skilltrustops
 */

export type Severity = "critical" | "high" | "medium" | "low";

export type RuleGroup = "lint" | "secrets" | "dangerous-code" | "package" | "privacy";

export type Rule = {
  id: string;
  group: RuleGroup;
  title: string;
  severity: Severity;
  /** What the scanner looks for. */
  check: string;
  /** Why an agent loading this skill is at risk. */
  risk: string;
  /** Remediation, as published by the scanner where available. */
  action: string;
  /**
   * True when the web preflight can evaluate this rule from `SKILL.md` text
   * alone. False means the rule needs the full adjacent package, so only the
   * CLI can decide it.
   */
  preflight: boolean;
};

export const RULE_GROUPS: Record<
  RuleGroup,
  { label: string; blurb: string; gate: string }
> = {
  lint: {
    label: "Structure",
    blurb:
      "Conformance to the agent-skills specification, so a runtime can load the skill predictably.",
    gate: "Gate 1 — structure",
  },
  secrets: {
    label: "Secrets and credentials",
    blurb:
      "Credential material committed into the skill. Matched secret values are redacted from all output.",
    gate: "Gate 2 — security and privacy",
  },
  "dangerous-code": {
    label: "Dangerous instructions",
    blurb:
      "Instructions that hand an agent destructive or opaque execution. Python fences are parsed with an AST; the rest of the Markdown is matched deterministically.",
    gate: "Gate 2 — security and privacy",
  },
  package: {
    label: "Complete-package risk",
    blurb:
      "Risk that only appears when the whole skill directory is inspected — manifests, scripts, references, archives and symlinks.",
    gate: "Gate 2 — security and privacy",
  },
  privacy: {
    label: "Privacy",
    blurb:
      "Personal data embedded in the skill package. Entity coverage is configured by policy.",
    gate: "Gate 2 — security and privacy",
  },
};

export const RULES: Rule[] = [
  // ---- Secrets and credentials -------------------------------------------
  {
    id: "STO-SEC-001",
    group: "secrets",
    title: "Private key material",
    severity: "critical",
    check: "RSA, EC, and OpenSSH private-key blocks.",
    risk:
      "A private key in a skill is published to everyone who installs it, and can be replayed against whatever it authenticates.",
    action:
      "Remove the key, rotate it, and load key material from the environment at run time instead.",
    preflight: true,
  },
  {
    id: "STO-SEC-002",
    group: "secrets",
    title: "AWS access-key ID",
    severity: "critical",
    check: "AWS access-key IDs beginning with AKIA or ASIA.",
    risk:
      "A live AWS key grants an agent — and every reader of the skill — the permissions attached to that identity.",
    action: "Revoke the key and use short-lived, environment-injected credentials.",
    preflight: true,
  },
  {
    id: "STO-SEC-003",
    group: "secrets",
    title: "GitHub token",
    severity: "critical",
    check: "GitHub tokens with a supported gh*_ prefix.",
    risk:
      "A leaked token can read private repositories and push code, which is how skill supply-chain compromises spread.",
    action: "Revoke the token and rely on the runtime's own authenticated context.",
    preflight: true,
  },
  {
    id: "STO-SEC-004",
    group: "secrets",
    title: "Hard-coded credential assignment",
    severity: "high",
    check:
      "Values assigned to names such as api_key, access_token, password, or secret. Common placeholders (example, placeholder, changeme, redacted, ${...}, <...>) are ignored.",
    risk:
      "Credentials pasted inline get copied into every install and into the agent's context window.",
    action: "Read the value from configuration or the environment at run time.",
    preflight: true,
  },
  {
    id: "RT-006",
    group: "secrets",
    title: "Red-team canary left in a skill",
    severity: "medium",
    check: "Canary markers from red-team fixtures left behind in a shipped skill.",
    risk:
      "A canary in production output means test scaffolding shipped, and can mask or mimic real findings.",
    action: "Remove the fixture content before publishing.",
    preflight: false,
  },

  // ---- Dangerous instructions -------------------------------------------
  {
    id: "STO-SEC-100",
    group: "dangerous-code",
    title: "Dynamic code execution",
    severity: "high",
    check: "Dynamic Python execution through eval() or exec().",
    risk:
      "Dynamically constructed code cannot be reviewed before it runs, so the skill's real behaviour is unknowable from its source.",
    action: "Replace with explicit calls a reviewer can read.",
    preflight: true,
  },
  {
    id: "STO-SEC-101",
    group: "dangerous-code",
    title: "Destructive filesystem command",
    severity: "critical",
    check: "Recursive or forced rm commands.",
    risk:
      "An agent that follows the instruction deletes developer data with no confirmation step.",
    action: "Remove the command or scope it to a path the user explicitly confirms.",
    preflight: true,
  },
  {
    id: "STO-SEC-102",
    group: "dangerous-code",
    title: "Remote download piped to a shell",
    severity: "critical",
    check: "curl or wget output piped directly to sh, bash, or zsh.",
    risk:
      "Whatever the remote host serves at that moment executes with the developer's privileges. The reviewed content and the executed content are not the same thing.",
    action: "Download to a file, pin a checksum, review it, then run it.",
    preflight: true,
  },
  {
    id: "STO-SEC-103",
    group: "dangerous-code",
    title: "Shell execution helper",
    severity: "high",
    check: "Shell execution through os.system() or subprocess with shell=True.",
    risk:
      "String-built shell commands are injectable, and the agent supplies the strings.",
    action: "Call the binary directly with an argument list and shell=False.",
    preflight: true,
  },

  // ---- Complete-package risk -------------------------------------------
  {
    id: "STO-PKG-200",
    group: "package",
    title: "Prompt injection or authority override",
    severity: "high",
    check: "Prompt-injection or authority-override language.",
    risk:
      "Text that claims higher authority than the user redirects the agent while looking like documentation. This is the core agent-skill attack.",
    action: "Remove it or isolate it as a labeled test fixture.",
    preflight: true,
  },
  {
    id: "STO-PKG-201",
    group: "package",
    title: "Runtime payload decoding",
    severity: "high",
    check: "Runtime payload decoding or reconstruction.",
    risk:
      "Encoded payloads hide the instruction that actually executes from both the reviewer and the scanner.",
    action: "Keep executable behavior transparent and reviewable.",
    preflight: true,
  },
  {
    id: "STO-PKG-202",
    group: "package",
    title: "Host persistence",
    severity: "critical",
    check: "Startup, scheduler, authentication, or hook persistence.",
    risk:
      "The skill keeps running after the agent session ends, which turns a one-off install into a foothold.",
    action: "Remove persistent host changes.",
    preflight: true,
  },
  {
    id: "STO-PKG-203",
    group: "package",
    title: "Secret or data exfiltration flow",
    severity: "critical",
    check: "Potential secret or data-exfiltration flow.",
    risk:
      "The agent becomes the exfiltration channel, sending repository or credential content to a destination the user never approved.",
    action: "Remove transmission or constrain data and destinations.",
    preflight: true,
  },
  {
    id: "STO-PKG-204",
    group: "package",
    title: "Excessive privilege",
    severity: "high",
    check: "Excessive privilege or permission changes.",
    risk:
      "Broad permissions widen the blast radius of every other weakness in the skill.",
    action: "Apply least privilege and exact resource scopes.",
    preflight: true,
  },
  {
    id: "STO-PKG-205",
    group: "package",
    title: "Lifecycle execution hook",
    severity: "high",
    check: "Install or build lifecycle execution hook.",
    risk:
      "Install hooks run before anyone reads the code, which is the classic package-manager compromise path.",
    action: "Review or remove executable supply-chain hooks.",
    preflight: false,
  },
  {
    id: "STO-PKG-206",
    group: "package",
    title: "Link or special filesystem entry",
    severity: "high",
    check: "Link or special filesystem entry.",
    risk:
      "Links can point outside the reviewed package, so the installed bytes differ from the audited bytes.",
    action: "Replace it with a reviewed regular file.",
    preflight: false,
  },
  {
    id: "STO-PKG-207",
    group: "package",
    title: "Unsafe or over-limit archive",
    severity: "critical",
    check: "Unsafe or over-limit archive.",
    risk:
      "Path traversal and expansion bombs let an archive write outside its directory or exhaust the host.",
    action: "Rebuild it with bounded regular relative entries.",
    preflight: false,
  },
  {
    id: "STO-PKG-208",
    group: "package",
    title: "Unpinned dependency",
    severity: "medium",
    check: "Unpinned dependency.",
    risk:
      "An unpinned dependency can change after review — the rug-pull path for skills that track a moving target.",
    action: "Pin reviewed versions and hashes.",
    preflight: false,
  },
  {
    id: "STO-PKG-209",
    group: "package",
    title: "Missing referenced file",
    severity: "medium",
    check: "Missing file referenced by SKILL.md.",
    risk:
      "The agent follows an instruction to a file that is not there, producing unpredictable improvisation.",
    action: "Add the file or remove the stale instruction.",
    preflight: false,
  },
  {
    id: "STO-PKG-210",
    group: "package",
    title: "Risky cross-file delegation",
    severity: "high",
    check: "SKILL.md delegates to a risky adjacent file.",
    risk:
      "A clean SKILL.md can still hand control to a script that is not clean; reviewing only the Markdown misses it.",
    action: "Review and constrain the referenced behavior.",
    preflight: false,
  },

  // ---- Structure --------------------------------------------------------
  {
    id: "STO-LINT-015",
    group: "lint",
    title: "Skill name does not follow the required format",
    severity: "medium",
    check: "The front-matter name field against the agent-skills specification.",
    risk:
      "Non-conforming names break addressing and install paths across runtimes.",
    action: "Rename the skill to the specified format.",
    preflight: true,
  },
  {
    id: "STO-LINT-021",
    group: "lint",
    title: "Front matter contains unsupported fields",
    severity: "medium",
    check: "Front-matter keys outside the specified set.",
    risk:
      "Unspecified keys are silently ignored by some runtimes and honoured by others, so behaviour diverges per tool.",
    action: "Move extension data under 'metadata' or remove unsupported fields.",
    preflight: true,
  },
];

const BY_ID = new Map(RULES.map((r) => [r.id, r]));

export function getRule(id: string): Rule | null {
  return BY_ID.get(id.toUpperCase()) ?? null;
}

export function rulesByGroup(group: RuleGroup): Rule[] {
  return RULES.filter((r) => r.group === group);
}

export const PREFLIGHT_RULE_IDS = RULES.filter((r) => r.preflight).map((r) => r.id);

/**
 * Groups whose rule IDs are assigned by the CLI ruleset rather than published
 * individually. Listed so the catalogue does not imply these checks are absent.
 */
export const UNENUMERATED_GROUPS: Array<{
  group: RuleGroup;
  note: string;
}> = [
  {
    group: "lint",
    note:
      "The structure gate runs the full agent-skills-specification ruleset. Two representative rules are listed; the CLI reports the complete set with stable IDs.",
  },
  {
    group: "privacy",
    note:
      "The privacy gate detects email, phone, ssn, and credit_card entities by default. Findings are reported by the CLI with redacted evidence.",
  },
];

export const POLICY = {
  profile: "recommended-v2",
  lintRuleset: "agent-skills-specification",
  scanner: "skilltrustops",
  scannerUrl: "https://github.com/rakeshcheekatimala/skilltrustops",
  packageUrl: "https://pypi.org/project/skilltrustops/",
  /** Package inspection bounds, from the scanner's security-scan docs. */
  bounds: [
    { label: "Regular files inspected", value: "2,000 max" },
    { label: "Total input", value: "32 MiB max" },
    { label: "Decoded text per file", value: "1 MiB max" },
    { label: "Archive members", value: "5,000 max (metadata only)" },
    { label: "Declared archive expansion", value: "128 MiB max" },
  ],
} as const;
