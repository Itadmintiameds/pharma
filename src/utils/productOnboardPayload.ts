/**
 * Maps the per-category Product Details form state onto the category-specific
 * `productAttribute*` array expected by POST /product/onboard.
 *
 * The forms hold every dropdown selection as a string (or string[] for multi
 * selects), so everything gets coerced to the id / number / boolean / enum
 * shape the backend wants here rather than in the component.
 */

// Dropdown ids arrive as strings; drop blanks and non-positive values.
const toId = (value: unknown): number | null => {
  const num = Number(value);
  return Number.isFinite(num) && num > 0 ? num : null;
};

// Single-select dropdowns feed backend fields that expect a list of ids.
const toIdList = (value: unknown): number[] => {
  const raw = Array.isArray(value) ? value : [value];
  return raw
    .map(toId)
    .filter((id): id is number => id !== null);
};

const toNumber = (value: unknown): number => {
  const num = Number(value);
  return Number.isFinite(num) ? num : 0;
};

// "Yes" / "No" dropdowns map onto backend booleans.
const toBoolean = (value: unknown): boolean => {
  const normalized = String(value ?? "").trim().toLowerCase();
  return normalized === "yes" || normalized === "true";
};

// "Unisex" -> "UNISEX", "Non-Sterile" -> "NON_STERILE"
const toEnum = (value: unknown): string =>
  String(value ?? "")
    .trim()
    .toUpperCase()
    .replace(/[\s-]+/g, "_");

const STERILITY: Record<string, string> = {
  Sterile: "STERILE",
  "Non-Sterile": "NON_STERILE",
};

const USAGE_TYPE: Record<string, string> = {
  Disposable: "DISPOSAL",
  Reusable: "NON_DISPOSAL",
};

export const PRODUCT_CATEGORY_IDS = {
  DRUG: 1,
  SUPPLEMENT: 2,
  FOOD_INFANT: 3,
  COSMETIC: 4,
  CONSUMABLE: 5,
  NON_CONSUMABLE: 6,
} as const;

const buildDrugAttributes = (data: any) => ({
  productAttributeDrugs: [
    {
      drugSchedule: data?.drugSchedule || "",
      // A molecule can only appear once per product, so de-dupe by moleculeId.
      productMolecules: Array.from(
        new Map(
          (data?.molecules || [])
            .map((mol: any) => ({
              moleculeId: toId(mol.name),
              moleculeStrength: mol.strength || "",
            }))
            .filter((mol: any) => mol.moleculeId !== null)
            .map((mol: any) => [mol.moleculeId, mol])
        ).values()
      ),
    },
  ],
});

const buildSupplementAttributes = (data: any) => ({
  productAttributeSupplements: [
    {
      therapeuticCategoryId: toId(data?.therapeuticCategory),
      therapeuticSubcategoryId: toId(data?.therapeuticSubcategory),
      flavourId: toId(data?.flavor),
      dosageFormId: toId(data?.dosageForm),
      // Backend takes a single age group here, unlike the other categories.
      ageGroupId: toIdList(data?.ageGroup)[0] ?? null,
      strengthComposition: data?.strength || "",
      netQuantity: toNumber(data?.netQuantity),
      netQuantityUnitId: toId(data?.netQuantityUnit),
      gender: data?.gender ? toEnum(data.gender) : "UNISEX",
      manufacturerName: data?.manufacturerName || "",
      fssaiLicenseNumber: data?.fssaiLicense || "",
    },
  ],
});

const buildFoodInfantAttributes = (data: any) => ({
  productAttributeFoodInfants: [
    {
      productTypeId: toId(data?.productCategory),
      productSubTypeId: toId(data?.productSubCategory),
      productFormId: toId(data?.productForm),
      variantName: data?.variantName || "",
      ageGroupIds: toIdList(data?.ageGroup),
      netQuantity: toNumber(data?.netQuantity),
      netQuantityUnitId: toId(data?.netQuantityUnit),
      manufacturerName: data?.manufacturerName || "",
    },
  ],
});

const buildCosmeticAttributes = (data: any) => ({
  productAttributeCosmetics: [
    {
      productTypeId: toId(data?.productType),
      productSubTypeId: toId(data?.productSubType),
      productFormId: toId(data?.productForm),
      variantName: data?.variant || "",
      intendedUseAreaIds: toIdList(data?.intendedUseArea),
      skinTypeIds: toIdList(data?.skinType),
      hairTypeIds: toIdList(data?.hairType),
      ageGroupIds: toIdList(data?.ageGroup),
      gender: toEnum(data?.gender),
      fragrance: data?.fragrance || "",
      netQuantity: toNumber(data?.netQuantity),
      netQuantityUnitId: toId(data?.netQuantityUnit),
      manufacturerName: data?.manufacturerName || "",
    },
  ],
});

const buildConsumableAttributes = (data: any) => ({
  productAttributeConsumableMedicals: [
    {
      deviceCategoryId: toId(data?.deviceCategory),
      deviceSubCategoryId: toId(data?.deviceSubCategory),
      materialTypeIds: toIdList(data?.materialType),
      dimensionSize: data?.sizeDimensionGauge || "",
      sterileOrNonSterile: STERILITY[data?.sterile] || toEnum(data?.sterile),
      disposalOrNonDisposal: USAGE_TYPE[data?.disposable] || toEnum(data?.disposable),
      purpose: data?.intendedUse || "",
      manufacturerName: data?.manufacturerName || "",
      manufacturerLicenseNumber: data?.manufacturerLicenseNumber || "",
      isISOCertified: toBoolean(data?.isIsoCertified),
    },
  ],
});

const buildNonConsumableAttributes = (data: any) => ({
  productAttributeNonConsumableMedicals: [
    {
      deviceCategoryId: toId(data?.deviceCategory),
      deviceSubCategoryId: toId(data?.deviceSubCategory),
      modelName: data?.modelName || "",
      deviceClassification: data?.deviceClassification || "",
      purpose: data?.intendedUse || "",
      dimensionSize: data?.technicalDimensions || "",
      materialTypeIds: toIdList(data?.materialBuildType),
      powerSourceId: toId(data?.powerSource),
      // The form collects a plain month count; the backend field is a label.
      warrantyPeriod: data?.warrantyPeriod ? `${data.warrantyPeriod} Months` : "",
      serviceAvailability: toBoolean(data?.amcServiceAvailability),
      manufacturerName: data?.manufacturerName || "",
      countryId: toId(data?.countryOfOrigin),
    },
  ],
});

/**
 * Returns the `productAttribute*` fragment for the given category, or an empty
 * object for an unrecognised category.
 */
export const buildProductAttributes = (
  productCategoryId: number,
  productData: any
): Record<string, unknown> => {
  switch (productCategoryId) {
    case PRODUCT_CATEGORY_IDS.DRUG:
      return buildDrugAttributes(productData);
    case PRODUCT_CATEGORY_IDS.SUPPLEMENT:
      return buildSupplementAttributes(productData);
    case PRODUCT_CATEGORY_IDS.FOOD_INFANT:
      return buildFoodInfantAttributes(productData);
    case PRODUCT_CATEGORY_IDS.COSMETIC:
      return buildCosmeticAttributes(productData);
    case PRODUCT_CATEGORY_IDS.CONSUMABLE:
      return buildConsumableAttributes(productData);
    case PRODUCT_CATEGORY_IDS.NON_CONSUMABLE:
      return buildNonConsumableAttributes(productData);
    default:
      return {};
  }
};
