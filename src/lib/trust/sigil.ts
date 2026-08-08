/**
 * Registry-issued sigil: content digest + HMAC attestation.
 *
 * The digest is independently reproducible from /api/cert/:slug.
 * The HMAC proves SkillSigil issued this decision at admission time — it does
 * not prove publisher identity. Publisher signing (Sigstore / Ed25519) is a
 * separate, later claim and must not be implied by this signature.
 */

import {
  issueCertificate,
  type Certificate,
  type CertificateInput,
  verifyCommand,
} from "@/lib/trust/certificate";

export type IssuedSigil = Certificate & {
  signature: string;
  signedAt: string;
  signer: "skillsigil-registry-hmac-v1";
  badgeMarkdown: (origin: string, slug: string) => string;
  verifyCommand: (origin: string, slug: string) => string;
};

async function hmacHex(message: string): Promise<string> {
  const secret =
    process.env.CERT_SIGNING_SECRET ||
    process.env.SCAN_WEBHOOK_SECRET ||
    process.env.SESSION_SECRET;
  if (!secret || secret.length < 16) {
    throw new Error(
      "CERT_SIGNING_SECRET, SCAN_WEBHOOK_SECRET, or SESSION_SECRET required to issue a sigil",
    );
  }
  const raw = new TextEncoder().encode(secret);
  const key = await crypto.subtle.importKey(
    "raw",
    raw as BufferSource,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(message) as BufferSource,
  );
  return [...new Uint8Array(sig)]
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export async function issueSigil(input: CertificateInput): Promise<IssuedSigil> {
  const certificate = await issueCertificate(input);
  const signedAt = new Date().toISOString();
  // Sign the digest URI + admission timestamp so the signature is bound to when
  // the registry admitted the skill, not just to the content hash alone.
  const signature = await hmacHex(`${certificate.digestUri}|${signedAt}`);

  return {
    ...certificate,
    signature,
    signedAt,
    signer: "skillsigil-registry-hmac-v1",
    badgeMarkdown: (origin, slug) =>
      `[![SkillSigil](${origin}/api/badge/${slug})](${origin}/cert/${slug})`,
    verifyCommand: (origin, slug) => verifyCommand(origin, slug),
  };
}

export function badgeSnippet(origin: string, slug: string) {
  return `[![SkillSigil](${origin}/api/badge/${slug})](${origin}/cert/${slug})`;
}
