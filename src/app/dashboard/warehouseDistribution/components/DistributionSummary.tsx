import Image from "next/image";

interface ProductDispatchRow {
  product: string;
  genericName?: string;
  batchNo: string;
  purchaseUnit: string;
  /** Base unit the dispatchQty is stored in (e.g. Tablet). */
  smallestUnit?: string;
  /** Divisor from base units back to the purchase unit (1 when they're the same). */
  unitContains?: number;
  dispatchQty: number;
}

// dispatchQty is stored in base units. When the purchase unit differs (contains > 1)
// show both the purchase-unit qty and its base equivalent, e.g. "10 Strip = 100 Tablet";
// otherwise just the qty with its unit, e.g. "5 Bottle".
const formatDispatchQty = (base: number, row: ProductDispatchRow): string => {
  const contains = row.unitContains || 1;
  const baseLabel = row.smallestUnit || row.purchaseUnit || "";
  const withUnit = (qty: number, unit: string) => (unit ? `${qty} ${unit}` : String(qty));
  if (contains > 1) {
    const purchaseQty = Number((base / contains).toFixed(2));
    return `${withUnit(purchaseQty, row.purchaseUnit)} = ${withUnit(base, baseLabel)}`;
  }
  return withUnit(base, baseLabel);
};

const defaultProducts: ProductDispatchRow[] = [
  {
    product: "Dolo 650 Tablet",
    genericName: "Paracetamol 650 mg",
    batchNo: "B24001",
    purchaseUnit: "Strip",
    dispatchQty: 20,
  },
  {
    product: "Crocin Syrup",
    genericName: "Paracetamol 250 mg/5 ml",
    batchNo: "C12001",
    purchaseUnit: "Bottle",
    dispatchQty: 15,
  },
];

interface TimelineStepData {
  icon: string;
  label: string;
  description: string;
  timestamp?: string;
  active?: boolean;
}

const defaultTimelineSteps: TimelineStepData[] = [
  {
    icon: "/warehouseDistribution/document-text-mini-white.svg",
    label: "Draft",
    timestamp: "05-Aug-2026 10:30 AM",
    description: "By Admin User",
    active: true,
  },
  {
    icon: "/warehouseDistribution/truck-outline-gray.svg",
    label: "Pending Receipt",
    description: "Waiting for pharmacy to acknowledge receipt",
  },
  {
    icon: "/warehouseDistribution/check-circle-outline-gray.svg",
    label: "Received",
    description: "Stock received and available at pharmacy",
  },
];

interface DistributionSummaryProps {
  distributionNo?: string;
  status?: string;
  sourceType?: string;
  sourceNo?: string;
  distributionDate?: string;
  sourceWarehouse?: string;
  destinationPharmacy?: string;
  reference?: string;
  remarks?: string;
  onEditDetails?: () => void;
  products?: ProductDispatchRow[];
  timelineSteps?: TimelineStepData[];
  onBack?: () => void;
  onDispatchProducts?: () => void;
  /** True while the dispatch API call is in flight. */
  isDispatching?: boolean;
}

const StatusPill = ({ label }: { label: string }) => (
  <div className="flex w-fit shrink-0 items-center justify-center gap-1 rounded-full border border-danger-600 bg-danger-50 px-3 py-0.5">
    <span className="size-3.5 shrink-0 rounded-full bg-danger-400" />
    <p className="whitespace-nowrap text-label-l3 font-medium text-danger-600">
      {label}
    </p>
  </div>
);

const Divider = () => (
  <div className="hidden h-9 w-px shrink-0 bg-pneutral-200 sm:block" />
);

const SummaryField = ({
  label,
  className = "",
  children,
}: {
  label: string;
  className?: string;
  children: React.ReactNode;
}) => (
  <div className={`flex flex-col items-start gap-1 ${className}`}>
    <p className="whitespace-nowrap text-label-l2 font-normal text-pneutral-500">
      {label}
    </p>
    {children}
  </div>
);

const LocationCard = ({
  icon,
  label,
  value,
}: {
  icon: string;
  label: string;
  value: string;
}) => (
  <div className="flex flex-col gap-2">
    <p className="whitespace-nowrap text-label-l2 font-normal text-pneutral-500">
      {label}
    </p>
    <div className="flex items-center gap-2.5">
      <div className="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-secondary-50">
        <Image src={icon} alt="" width={20} height={20} />
      </div>
      <p className="whitespace-nowrap text-label-l4 font-semibold text-pneutral-900">
        {value}
      </p>
    </div>
  </div>
);

const RouteConnector = () => (
  <div className="hidden shrink-0 items-center gap-1.5 sm:flex">
    <div className="h-0.5 w-15 shrink-0 bg-pneutral-200" />
    <Image
      src="/warehouseDistribution/truck-outline.svg"
      alt=""
      width={22}
      height={22}
    />
  </div>
);

const DistributionInformation = ({
  sourceWarehouse,
  destinationPharmacy,
  reference,
  remarks,
  onEditDetails,
}: {
  sourceWarehouse: string;
  destinationPharmacy: string;
  reference: string;
  remarks: string;
  onEditDetails?: () => void;
}) => (
  <div className="flex w-full flex-col gap-5 rounded-xl bg-white p-6 shadow-[0px_1px_1px_rgba(0,0,0,0.16),0px_3px_3px_rgba(0,0,0,0.12),0px_5px_6px_rgba(0,0,0,0.09)]">
    <div className="flex w-full items-center justify-between gap-2.5">
      <p className="whitespace-nowrap text-label-l5 font-semibold text-secondary-700">
        Distribution Information
      </p>

    </div>

    <div className="flex w-full flex-col gap-5 sm:flex-row sm:items-center sm:gap-10">
      <LocationCard
        icon="/warehouseDistribution/warehouse-outline.svg"
        label="Source Warehouse"
        value={sourceWarehouse}
      />

      <RouteConnector />

      <LocationCard
        icon="/warehouseDistribution/pharmacy-outline.svg"
        label="Destination Pharmacy"
        value={destinationPharmacy}
      />
    </div>

    <div className="h-px w-full shrink-0 bg-pneutral-200" />

    <div className="flex w-full flex-col gap-4 sm:flex-row sm:gap-15">
      <div className="flex min-w-0 flex-col gap-1.5 sm:flex-1">
        <p className="whitespace-nowrap text-label-l2 font-normal text-pneutral-500">
          Reference
        </p>
        <p className="text-label-l4 font-semibold text-pneutral-900">
          {reference}
        </p>
      </div>

      <div className="flex min-w-0 flex-col gap-1.5 sm:flex-1">
        <p className="whitespace-nowrap text-label-l2 font-normal text-pneutral-500">
          Remarks
        </p>
        <p className="text-label-l4 font-semibold text-pneutral-900">
          {remarks}
        </p>
      </div>
    </div>
  </div>
);

const StatTile = ({
  icon,
  label,
  value,
  valueClassName,
}: {
  icon: string;
  label: string;
  value: string;
  valueClassName: string;
}) => (
  <div className="flex flex-1 items-center gap-3.5 rounded-lg bg-secondary-50 px-4.5 py-4">
    <div className="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-white">
      <Image src={icon} alt="" width={20} height={20} />
    </div>
    <div className="flex flex-col gap-1">
      <p className="whitespace-nowrap text-label-l4 font-normal text-pneutral-900">
        {label}
      </p>
      <p className={`whitespace-nowrap font-semibold text-secondary-700 ${valueClassName}`}>
        {value}
      </p>
    </div>
  </div>
);

const ProductsToDispatch = ({ products }: { products: ProductDispatchRow[] }) => {
  const totalProducts = products.length;
  const totalQuantity = products.reduce((sum, row) => sum + row.dispatchQty, 0);

  return (
    <div className="flex w-full flex-col gap-5 rounded-xl bg-white p-6 shadow-[0px_1px_1px_rgba(0,0,0,0.16),0px_3px_3px_rgba(0,0,0,0.12),0px_5px_6px_rgba(0,0,0,0.09)]">
      <p className="whitespace-nowrap text-label-l5 font-semibold text-secondary-700">
        Products to Dispatch ({totalProducts})
      </p>

      <div className="w-full overflow-x-auto rounded-lg border border-pneutral-200">
        <div className="min-w-165">
          <div className="flex w-full items-center gap-2 bg-pneutral-50 px-3.5 py-2.5">
            <p className="w-12 shrink-0 text-p3 font-semibold text-pneutral-500">Sl No.</p>
            <p className="w-42.5 shrink-0 text-p3 font-semibold text-pneutral-500">
              Product
            </p>
            <p className="w-25 shrink-0 text-p3 font-semibold text-pneutral-500">
              Batch No.
            </p>
            <p className="w-25 shrink-0 text-p3 font-semibold text-pneutral-500">
              Purchase Unit
            </p>
            <div className="flex-1" />
            <p className="w-45 shrink-0 text-right text-p3 font-semibold text-pneutral-500">
              Dispatch Qty (Purchase Unit)
            </p>
          </div>

          {products.map((row, index) => (
            <div
              key={`${row.product}-${row.batchNo}-${index}`}
              className="flex w-full items-center gap-2 border-t border-pneutral-200 px-3.5 py-2.5"
            >
              <p className="w-12 shrink-0 text-p3 font-normal text-pneutral-900">
                {index + 1}
              </p>
              <div className="flex w-42.5 shrink-0 flex-col gap-0.5">
                <p className="text-p3 font-semibold text-pneutral-900">
                  {row.product}
                </p>
                {row.genericName && row.genericName !== row.product && (
                  <p className="text-p3 font-normal text-pneutral-500">
                    {row.genericName}
                  </p>
                )}
              </div>
              <p className="w-25 shrink-0 text-p3 font-normal text-pneutral-900">
                {row.batchNo}
              </p>
              <p className="w-25 shrink-0 text-p3 font-normal text-pneutral-900">
                {row.purchaseUnit}
              </p>
              <div className="flex-1" />
              <p className="w-45 shrink-0 text-right text-p3 font-semibold text-pneutral-900">
                {formatDispatchQty(row.dispatchQty, row)}
              </p>
            </div>
          ))}
        </div>
      </div>

      <div className="grid w-full grid-cols-1 gap-4 sm:grid-cols-2">
        <StatTile
          icon="/warehouseDistribution/cube-mini.svg"
          label="Total Products"
          value={String(totalProducts)}
          valueClassName="text-p3"
        />
        <StatTile
          icon="/warehouseDistribution/document-text-mini.svg"
          label="Total Quantity"
          value={`${totalQuantity} Units`}
          valueClassName="text-label-l4"
        />
      </div>
    </div>
  );
};

const DistributionTimelineStep = ({ step }: { step: TimelineStepData }) => (
  <div className="flex shrink-0 flex-col items-center gap-2">
    <div
      className={`flex size-11 shrink-0 items-center justify-center rounded-2xl ${
        step.active ? "bg-secondary-700" : "border-2 border-pneutral-200 bg-white"
      }`}
    >
      <Image src={step.icon} alt="" width={20} height={20} />
    </div>

    <p
      className={`whitespace-nowrap text-center text-label-l4 font-semibold ${
        step.active ? "text-secondary-700" : "text-pneutral-900"
      }`}
    >
      {step.label}
    </p>

    {step.timestamp && (
      <p className="whitespace-nowrap text-center text-label-l2 font-normal text-pneutral-500">
        {step.timestamp}
      </p>
    )}

    <p className="w-40 text-center text-label-l2 font-normal text-pneutral-900">
      {step.description}
    </p>
  </div>
);

const DistributionTimeline = ({ steps }: { steps: TimelineStepData[] }) => (
  <div className="flex w-full flex-col gap-6 rounded-xl bg-white p-6 shadow-[0px_1px_1px_rgba(0,0,0,0.16),0px_3px_3px_rgba(0,0,0,0.12),0px_5px_6px_rgba(0,0,0,0.09)]">
    <p className="whitespace-nowrap text-label-l5 font-semibold text-secondary-700">
      Distribution Timeline
    </p>

    <div className="flex w-full flex-col items-center gap-6 sm:flex-row sm:items-start sm:justify-between sm:gap-0">
      {steps.map((step, index) => (
        <div key={step.label} className="contents">
          <DistributionTimelineStep step={step} />
          {index < steps.length - 1 && (
            <div className="hidden w-15 shrink-0 border-t-2 border-dashed border-pneutral-500 sm:mt-5.5 sm:block" />
          )}
        </div>
      ))}
    </div>
  </div>
);

const DistributionFooter = ({
  onBack,
  onDispatchProducts,
  isDispatching,
}: {
  onBack?: () => void;
  onDispatchProducts?: () => void;
  isDispatching?: boolean;
}) => (
  <div className="flex w-full flex-col gap-3 border-t border-pneutral-200  py-4 sm:flex-row sm:items-center sm:justify-between">
    <button
      type="button"
      onClick={onBack}
      className="flex h-12 items-center justify-center gap-2 rounded-lg border-2 border-secondary-700 px-4 sm:w-auto"
    >
      <span className="whitespace-pre w-[100px] text-label-l4 font-medium text-secondary-700">
        {`←  Back`}
      </span>
    </button>

    {onDispatchProducts && (
      <button
        type="button"
        onClick={onDispatchProducts}
        disabled={isDispatching}
        className="flex h-12 w-full items-center justify-center gap-2 rounded-lg bg-primary-800 px-4 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
      >
        <Image
          src="/warehouseDistribution/truck-outline-white.svg"
          alt=""
          width={20}
          height={20}
        />
        <span className="whitespace-nowrap text-label-l4 font-medium text-pneutral-50">
          {isDispatching ? "Dispatching..." : "Dispatch Products"}
        </span>
      </button>
    )}
  </div>
);

const DistributionSummary = ({
  distributionNo = "WD000245",
  status = "Draft",
  sourceType = "Stock Allocation",
  sourceNo = "ALO000124",
  distributionDate = "05-Aug-2026",
  sourceWarehouse = "Central Warehouse",
  destinationPharmacy = "Rajajinagar Medical Store",
  reference = "Phone Request",
  remarks = "Monthly replenishment requested by store.",
  onEditDetails,
  products = defaultProducts,
  timelineSteps = defaultTimelineSteps,
  onBack,
  onDispatchProducts,
  isDispatching,
}: DistributionSummaryProps) => {
  return (
    <>
      <div className="text-h5 font-semibold text-pneutral-900">
        Warehouse Distribution
      </div>

      <div className="flex w-full flex-col gap-4 rounded-xl bg-white px-6 py-4.5 shadow-[0px_1px_2px_-2px_rgba(0,0,0,0.16),0px_3px_6px_0px_rgba(0,0,0,0.12),0px_5px_12px_4px_rgba(0,0,0,0.09)] sm:flex-row sm:items-center sm:gap-6">

        <SummaryField label="Generated From" className="min-w-0 sm:flex-1">
          <div className="flex flex-col">
            <p className="text-label-l4 font-semibold text-pneutral-900">
              {sourceType}
            </p>
            <p className="text-label-l4 font-semibold text-secondary-700">
              {sourceNo}
            </p>
          </div>
        </SummaryField>

        <Divider />

        <SummaryField label="Distribution Date" className="min-w-0 sm:flex-1">
          <p className="whitespace-nowrap text-label-l4 font-semibold text-pneutral-900">
            {distributionDate}
          </p>
        </SummaryField>
      </div>

      <DistributionInformation
        sourceWarehouse={sourceWarehouse}
        destinationPharmacy={destinationPharmacy}
        reference={reference}
        remarks={remarks}
        onEditDetails={onEditDetails}
      />

      <ProductsToDispatch products={products} />

      <DistributionTimeline steps={timelineSteps} />

      <DistributionFooter
        onBack={onBack}
        onDispatchProducts={onDispatchProducts}
        isDispatching={isDispatching}
      />
    </>
  );
};

export default DistributionSummary;
