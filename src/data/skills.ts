/**
 * Shared types + category labels only.
 * Catalog content always comes from Neon — never seed/fake rows.
 */

export type ScanStatus = "passed" | "failed" | "pending" | "flagged" | "error";

export type Skill = {
  slug: string;
  name: string;
  description: string;
  category: string;
  tags: string[];
  author: {
    username: string;
    avatarUrl: string;
  };
  repo: string;
  commitSha: string;
  status: ScanStatus;
  riskScore: number;
  upvoteCount: number;
  downloadCount: number;
  createdAt: string;
  findingsSummary?: string;
  counts?: {
    critical: number;
    high: number;
    medium: number;
    low: number;
    total: number;
  };
};

export const CATEGORIES = [
  "Security",
  "Productivity",
  "Code Review",
  "Data",
  "DevOps",
  "Documentation",
] as const;
