/**
 * What one invoice line created on the server, kept for as long as the invoice
 * is being built so the line can still be edited before it is saved.
 *
 * Both ways of adding a line create rows the moment the item is added — the
 * onboarding wizard creates the whole product, "Add stock" creates a package
 * and / or a batch under a product that already existed — so a correction is
 * always a PUT against something that exists. What may be corrected is exactly
 * what this flow created, which is what `scope` and `packagingCreated` record.
 */

import type { ProductFormSnapshot } from "./productUpdatePayload";

export type EditableScope =
  /** The product itself was created here: every detail is still the user's. */
  | "product"
  /**
   * Stock was booked against a product that already existed. Its name, brand,
   * GST, HSN and category belong to the product master and are edited from
   * Product Management — only the package / batch created here can change.
   */
  | "stock"
  /**
   * Stock was booked against a package and batch that both already existed, so
   * this flow created nothing: the batch is shared with earlier purchases and
   * the stock on hand. What is still this invoice's own is how much of it is
   * being bought — purchase quantity and free goods — and nothing else. An edit
   * at this scope sends no PUT at all; it only re-costs the line.
   */
  | "quantities";

export interface OnboardedLine {
  productId: string;
  packagingId: string;
  batchId: string;
  /** Fixed at creation; a product cannot be moved to another category. */
  productCategoryId: number;
  scope: EditableScope;
  /**
   * False when the batch was added to a package the product already had, so
   * the package's own fields are not this line's to change — editing them
   * would rewrite a package other batches and purchases share.
   */
  packagingCreated: boolean;
  /**
   * False when the batch already existed, which is what pins the scope to
   * quantities: its number, dates, prices and rack are shared with everything
   * already booked against it.
   */
  batchCreated: boolean;
  /**
   * The step forms' readings the rows were created from: what the edit opens
   * on, and what the new reading is diffed against. `productData` is absent
   * for a "stock" line — there was no Product Details step to read.
   */
  snapshot: ProductFormSnapshot;
}

/**
 * Lines are keyed by the rows they point at rather than by position, so
 * removing an earlier line doesn't hand the wrong product's snapshot to the
 * next edit.
 */
export const lineKey = (productId: string, batchId: string) =>
  `${productId}::${batchId}`;
