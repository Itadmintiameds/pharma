/**
 * Builds the body for PUT /product/{productId} from the two wizard snapshots:
 * the form state as it was when the product was onboarded, and the form state
 * after the user edited it.
 *
 * Two rules shape the body, and both come from how the backend applies it:
 *
 *  - Only changed values are sent. Anything left out keeps the value it has,
 *    so an untouched field is simply absent rather than re-sent.
 *  - A packaging or batch entry always carries its own identifier. Without
 *    `packagingId` / `batchId` the backend reads the entry as a brand new
 *    package or batch and creates a second one beside the original, which is
 *    exactly what this flow must not do — the purchase line already points at
 *    the ids the onboard call returned.
 *
 * The field mapping mirrors the /product/onboard payload built in AddProducts,
 * so the same form value lands on the same API field either way. The purchase
 * line's own numbers — purchase quantity and free goods — are deliberately not
 * part of this: they belong to the invoice being built, not to the product
 * master, and the purchase is created from the store afterwards.
 */

import { buildProductAttributes } from "./productOnboardPayload";

/** One step form's `getFormData()` reading: field name to entered value. */
type FormData = Record<string, unknown> | undefined;

/** The three step forms' `getFormData()` results, as collected on submit. */
export interface ProductFormSnapshot {
  productData: FormData;
  packagingData: FormData;
  batchData: FormData;
}

/** Identifiers the onboard response handed back for the created rows. */
export interface ProductUpdateIds {
  packagingId?: string;
  batchId?: string;
}

/** Form values are all strings (or string lists), so text and numbers coerce. */
const text = (value: unknown): string =>
  value === null || value === undefined ? "" : String(value);

const num = (value: unknown): number => Number(value || 0);

type FieldMap = Record<string, (data: FormData) => unknown>;

const PRODUCT_FIELDS: FieldMap = {
  productName: (d) => text(d?.productName),
  brandName: (d) => text(d?.brandName),
  gstPercentage: (d) => num(d?.gst),
  hsnNo: (d) => text(d?.hsnCode),
};

const PACKAGING_FIELDS: FieldMap = {
  purchaseSmallestUnitId: (d) => num(d?.purchaseSmallestUnitId),
  purchaseUnitContains: (d) => num(d?.eachStripContains),
};

const BATCH_FIELDS: FieldMap = {
  batchNumber: (d) => text(d?.batchNumber),
  manufacturingDate: (d) => text(d?.manufacturingDate),
  expiryDate: (d) => text(d?.expiryDate),
  purchaseUnit: (d) => text(d?.purchaseUnit),
  purchasePrice: (d) => num(d?.purchasePricePerBox),
  mrp: (d) => num(d?.mrpPerBox),
  sellingPrice: (d) => num(d?.sellingPricePerBox),
  purchasePricePerUnit: (d) => num(d?.purchasePricePerSmallestUnit),
  mrpPerUnit: (d) => num(d?.mrpPerSmallestUnit),
  sellingPricePerUnit: (d) => num(d?.sellingPricePerSmallestUnit),
  rackLocation: (d) => text(d?.rackLocation),
};

/**
 * Values here are scalars, id lists and (for drugs) a list of molecule objects,
 * so a structural comparison is enough — and it treats a reordered list as a
 * change, which is the safe way round: sending a field that did not really move
 * costs nothing, dropping one that did would silently lose the edit.
 */
const isSame = (a: unknown, b: unknown): boolean =>
  JSON.stringify(a ?? null) === JSON.stringify(b ?? null);

/** The subset of `after` that differs from `before`, per the field map. */
const changedFields = (
  fields: FieldMap,
  before: FormData,
  after: FormData
): Record<string, unknown> => {
  const changes: Record<string, unknown> = {};
  Object.entries(fields).forEach(([apiField, read]) => {
    const next = read(after);
    if (!isSame(read(before), next)) changes[apiField] = next;
  });
  return changes;
};

/** The single attribute object a category's block wraps, or {} if absent. */
const attributeEntry = (
  block: Record<string, unknown>,
  wrapperKey: string
): Record<string, unknown> => {
  const entries = block[wrapperKey];
  return Array.isArray(entries) && entries.length > 0
    ? (entries[0] as Record<string, unknown>)
    : {};
};

/**
 * The category-specific attribute block, diffed key by key.
 *
 * buildProductAttributes returns the whole block for a category — e.g.
 * `{ productAttributeSupplements: [ { ...every field } ] }` — so the block is
 * built from both snapshots and only the keys that moved are kept. The wrapper
 * key is whatever the category uses, and the block is dropped entirely when
 * nothing inside it changed.
 */
const changedAttributes = (
  productCategoryId: number,
  before: FormData,
  after: FormData
): Record<string, unknown> => {
  const beforeBlock = buildProductAttributes(productCategoryId, before);
  const afterBlock = buildProductAttributes(productCategoryId, after);

  const [wrapperKey] = Object.keys(afterBlock);
  if (!wrapperKey) return {};

  const beforeAttrs = attributeEntry(beforeBlock, wrapperKey);
  const afterAttrs = attributeEntry(afterBlock, wrapperKey);

  const changes: Record<string, unknown> = {};
  Object.entries(afterAttrs).forEach(([key, value]) => {
    if (!isSame(beforeAttrs[key], value)) changes[key] = value;
  });

  return Object.keys(changes).length > 0 ? { [wrapperKey]: [changes] } : {};
};

export interface ProductUpdatePayload {
  /** The body to PUT. Carries no changes when `hasChanges` is false. */
  payload: Record<string, unknown>;
  /** False when the user opened the wizard and changed nothing. */
  hasChanges: boolean;
}

export const buildProductUpdatePayload = (
  productCategoryId: number,
  ids: ProductUpdateIds,
  before: ProductFormSnapshot,
  after: ProductFormSnapshot
): ProductUpdatePayload => {
  const product = changedFields(PRODUCT_FIELDS, before.productData, after.productData);
  const packaging = changedFields(PACKAGING_FIELDS, before.packagingData, after.packagingData);
  const batch = changedFields(BATCH_FIELDS, before.batchData, after.batchData);
  const attributes = changedAttributes(
    productCategoryId,
    before.productData,
    after.productData
  );

  const payload: Record<string, unknown> = {
    // Always sent: it is what tells the backend which attribute block the body
    // carries, and it cannot be edited from here anyway (changing category
    // restarts the wizard on a blank form).
    productCategoryId,
    ...product,
    ...attributes,
  };

  // Without the id the entry would be created rather than updated, so a group
  // with no id is left out even when its fields changed — there is nothing to
  // address the edit to.
  if (Object.keys(packaging).length > 0 && ids.packagingId) {
    payload.packagingDetails = [{ packagingId: ids.packagingId, ...packaging }];
  }

  if (Object.keys(batch).length > 0 && ids.batchId) {
    payload.batchDetails = [{ batchId: ids.batchId, ...batch }];
  }

  const hasChanges = Object.keys(payload).some((key) => key !== "productCategoryId");

  return { payload, hasChanges };
};
