"use client";

import Image from "next/image";
import { AllocationDraft } from "@/app/dashboard/warehouseDistribution/allocationDraft";

const warehouseTypicalUses = [
  "Daily replenishment",
  "Warehouse stock clearance",
  "New store stocking",
];

const pharmacyTypicalUses = [
  "Emergency transfer",
  "Shortage management",
  "Inventory balancing",
];

const SourceRow = ({ label, value }: { label: string; value: string }) => (
  <div className="flex w-full items-center gap-2">
    <div className="flex shrink-0 items-center justify-center rounded-full bg-secondary-100 p-2">
      <Image
        src="/warehouseDistribution/building-storefront.svg"
        alt=""
        width={16}
        height={15}
      />
    </div>
    <p className="text-label-l3 font-medium text-pneutral-800">{label}</p>
    <span className="flex items-center justify-center gap-1 rounded-full border border-secondary-700 bg-secondary-50 px-3 py-0.5 text-label-l3 font-medium text-secondary-700">
      {value}
    </span>
  </div>
);

type DistributionTypeProps = {
  draft: AllocationDraft
  onChange: (patch: Partial<AllocationDraft>) => void
}

const DistributionType = ({ draft, onChange }: DistributionTypeProps) => {
  const selectedType = draft.distributionMode;

  return (
    <div className="flex w-full flex-col gap-6">
      <div className="flex items-center gap-3 rounded-lg border border-secondary-700 bg-white px-4 py-3">
        <div className="relative flex size-6 shrink-0 items-center justify-center">
          <Image src="/warehouseDistribution/InfoIcon.svg" alt="" fill />
          <span className="relative text-label-l3 font-semibold text-white">
            i
          </span>
        </div>
        <p className="text-p3 font-normal font-noto-sans text-pneutral-800">
          Choose how you want to move the stock. This will determine the next
          steps in the allocation process.
        </p>
      </div>

      <div className="text-h6 font-semibold">
        How do you want to move stock?
      </div>

      <div className="grid w-full grid-cols-1 items-stretch gap-6 sm:grid-cols-2 lg:grid-cols-3">
        <div
          role="radio"
          aria-checked={selectedType === "warehouse"}
          aria-label="Warehouse Distribution"
          tabIndex={0}
          onClick={() =>
            onChange({ distributionMode: "warehouse", sourceId: "", sourceLabel: "" })
          }
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              onChange({ distributionMode: "warehouse", sourceId: "", sourceLabel: "" });
            }
          }}
          className={`flex cursor-pointer flex-col items-center gap-5 self-stretch rounded-2xl border-2 bg-white p-8 ${
            selectedType === "warehouse"
              ? "border-secondary-700 shadow-[0px_9px_28px_8px_rgba(0,0,0,0.05),0px_3px_6px_-4px_rgba(0,0,0,0.12),0px_6px_16px_rgba(0,0,0,0.08)]"
              : "border-pneutral-200"
          }`}
        >
          <div className="flex w-full items-center justify-end">
            <Image
              src={`/warehouseDistribution/${
                selectedType === "warehouse" ? "radio-selected" : "radio-unselected"
              }.svg`}
              alt=""
              width={24}
              height={24}
            />
          </div>

          <div className="relative h-29.5 w-57.5 shrink-0">
            <Image
              src="/warehouseDistribution/warehouse-distribution-illustration.svg"
              alt=""
              fill
            />
          </div>

          <div className="flex w-full flex-col items-start gap-2.5 text-center">
            <p className="w-full text-h6 font-semibold text-secondary-700">
              Warehouse Distribution
            </p>
            <p className="w-full text-p3 font-normal text-pneutral-800">
              Transfer stock from the Central Warehouse to a Pharmacy.
            </p>
          </div>

          <p className="w-full text-p3 font-normal text-pneutral-800">
            Suitable when stock is available in the warehouse.
          </p>

          <div className="h-px w-full border-t border-pneutral-100" />

          <SourceRow label="Source:" value="Central Warehouse" />
          <SourceRow label="Destination:" value="Medical Store" />

          <div className="flex w-full flex-col items-start gap-3">
            <p
              className={`w-full text-label-l3 font-semibold ${
                selectedType === "warehouse" ? "text-secondary-700" : "text-pneutral-900"
              }`}
            >
              Typical Uses
            </p>
            <div className="flex w-full flex-col items-start gap-2.5">
              {warehouseTypicalUses.map((useCase) => (
                <div key={useCase} className="flex w-full items-center gap-2.5">
                  <Image
                    src="/warehouseDistribution/check-circle-outline.svg"
                    alt=""
                    width={16}
                    height={16}
                  />
                  <p className="flex-1 text-p3 font-normal text-pneutral-800">
                    {useCase}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div
          role="radio"
          aria-checked={selectedType === "pharmacy"}
          aria-label="Pharmacy Transfer"
          tabIndex={0}
          onClick={() =>
            onChange({ distributionMode: "pharmacy", sourceId: "", sourceLabel: "" })
          }
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              onChange({ distributionMode: "pharmacy", sourceId: "", sourceLabel: "" });
            }
          }}
          className={`flex cursor-pointer flex-col items-center gap-4 self-stretch rounded-2xl border-2 bg-white p-8 ${
            selectedType === "pharmacy"
              ? "border-secondary-700 shadow-[0px_9px_28px_8px_rgba(0,0,0,0.05),0px_3px_6px_-4px_rgba(0,0,0,0.12),0px_6px_16px_rgba(0,0,0,0.08)]"
              : "border-pneutral-200"
          }`}
        >
          <div className="flex w-full items-center justify-end">
            <Image
              src={`/warehouseDistribution/${
                selectedType === "pharmacy" ? "radio-selected" : "radio-unselected"
              }.svg`}
              alt=""
              width={24}
              height={24}
            />
          </div>

          <div className="relative h-29.5 w-57.5 shrink-0">
            <Image
              src="/warehouseDistribution/pharmacy-transfer-illustration.svg"
              alt=""
              fill
            />
          </div>

          <div className="flex w-full flex-col items-start gap-2.5 text-center">
            <p className="w-full text-h6 font-semibold text-success-800">
              Pharmacy Transfer
            </p>
            <p className="w-full text-p3 font-normal text-pneutral-800">
              Transfer stock from one Pharmacy to another Pharmacy.
            </p>
          </div>

          <div className="flex w-full items-center justify-center rounded-lg bg-secondary-50 p-2">
            <p className="flex-1 text-p3 font-normal text-pneutral-800">
              Suitable when Warehouse stock is unavailable or nearby pharmacy
              has sufficient inventory.
            </p>
          </div>

          <div className="h-px w-full border-t border-pneutral-100" />

          <SourceRow label="Source:" value="Another Pharmacy" />
          <SourceRow label="Destination:" value="Medical Store" />

          <div className="flex w-full flex-col items-start gap-3">
            <p
              className={`w-full text-label-l3 font-semibold ${
                selectedType === "pharmacy" ? "text-secondary-700" : "text-pneutral-900"
              }`}
            >
              Typical Uses
            </p>
            <div className="flex w-full flex-col items-start gap-2.5">
              {pharmacyTypicalUses.map((useCase) => (
                <div key={useCase} className="flex w-full items-center gap-2.5">
                  <Image
                    src="/warehouseDistribution/check-circle-outline.svg"
                    alt=""
                    width={16}
                    height={16}
                  />
                  <p className="flex-1 text-p3 font-normal text-pneutral-800">
                    {useCase}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-pneutral-200 bg-white p-8 h-[340px]">
          <div className="flex w-full flex-col items-start gap-6">
            <div className="flex w-full flex-col items-start gap-4">
              <p className="w-full text-label-l5 font-semibold text-pneutral-900">
                Need Help?
              </p>

              <div className="flex w-full flex-col items-start gap-2">
                <div className="flex w-full items-center gap-3">
                  <div className="flex shrink-0 items-center justify-center rounded-full bg-secondary-100 p-2">
                    <Image
                      src="/warehouseDistribution/home-outline.svg"
                      alt=""
                      width={21}
                      height={20}
                    />
                  </div>
                  <p className="flex-1 text-label-l4 font-medium text-secondary-700">
                    Warehouse Distribution
                  </p>
                </div>
                <p className="w-full text-p3 font-normal text-pneutral-800">
                  Stock moves from Central Warehouse to a pharmacy.
                </p>
              </div>
            </div>

            <div className="h-px w-full border-t border-pneutral-100" />

            <div className="flex w-full flex-col items-start gap-2">
              <div className="flex w-full items-center gap-3">
                <div className="flex shrink-0 items-center justify-center rounded-full bg-secondary-100 p-2">
                  <Image
                    src="/warehouseDistribution/clipboard-list.svg"
                    alt=""
                    width={18}
                    height={21}
                  />
                </div>
                <p className="flex-1 text-label-l4 font-medium text-success-800">
                  Pharmacy Transfer
                </p>
              </div>
              <p className="w-full text-p3 font-normal text-pneutral-800">
                Stock moves between pharmacies after approval by Warehouse
                Admin.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DistributionType;
