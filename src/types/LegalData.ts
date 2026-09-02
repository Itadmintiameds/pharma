/** The currently effective Terms & Conditions / Privacy Policy document. */
export interface TermsDocument {
  id: number;
  title: string;
  version: string;
  /** ISO timestamp, e.g. "2026-09-02T00:00:00". */
  effectiveFrom: string;
  /** Public S3 URL of the source file. */
  documentUrl: string;
  /** SHA-256 of the file's bytes. Identifies the exact text a user accepted. */
  contentHash: string;
  contentType: string;
  fileName: string;
  fileSize: number;
}

/** What the user actually agreed to, for the registration payload. */
export interface AcceptedTerms {
  termsId: number;
  termsVersion: string;
  termsContentHash: string;
}
