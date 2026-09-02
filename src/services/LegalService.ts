import { TermsDocument } from "@/types/LegalData";
import api from "@/utils/api";

/**
 * Metadata for the Terms & Conditions / Privacy Policy currently in force.
 *
 * Public — this is called from the registration page, before the user has an
 * account. See the interceptor note in `utils/api.ts` about not bouncing an
 * anonymous caller to /login.
 */
export const getCurrentTerms = async (): Promise<TermsDocument> => {
  const response = await api.get<TermsDocument>("/terms/current");
  return response.data;
};

/**
 * Same-origin URL for the document body, converted to HTML.
 *
 * Keyed on contentHash rather than the S3 URL: the hash is what actually
 * identifies the text, so a given URL is immutable and cacheable forever, and
 * a new document version produces a new URL that misses every cache.
 */
export const termsHtmlUrl = (doc: TermsDocument): string =>
  `/api/legal/document?url=${encodeURIComponent(doc.documentUrl)}&hash=${encodeURIComponent(doc.contentHash)}`;
