"use client";

import Image from "next/image";
import Button from "@/app/components/common/Button";

/** The two ways a stock return can start — Figma node 3658:42456 ("Options Row"). */
export type StockReturnSource = "PHARMACY_INVENTORY" | "DAMAGED_INTER_STORE";

interface StockReturnTypeProps {
  onSelect: (source: StockReturnSource) => void;
  onBack: () => void;
}

interface ReturnOption {
  source: StockReturnSource;
  icon: string;
  title: string;
  description: string;
  bullets?: string[];
  note?: string;
}

const RETURN_OPTIONS: ReturnOption[] = [
  {
    source: "PHARMACY_INVENTORY",
    icon: "/StockReturn/CubeIcon.svg",
    title: "Return from Pharmacy/Store Inventory",
    description:
      "Use this option for stock physically available in the current Pharmacy/Store inventory that needs to be returned to the Central Warehouse.",
    bullets: [
      "Damaged stock",
      "Near-expiry stock",
      "Excess stock",
      "Slow/non-moving stock",
      "Product recall/withdrawal",
    ],
  },
  {
    source: "DAMAGED_INTER_STORE",
    icon: "/StockReturn/WarningIcon.svg",
    title: "Return Damaged Stock from Inter-Store Transfer",
    description:
      "Use this option for stock physically received through an Inter-Store Transfer and already recorded as Damaged during receipt.",
    note: "Not Received Qty shall not be considered for return.",
  },
];

const OptionCard = ({
  option,
  onSelect,
}: {
  option: ReturnOption;
  onSelect: (source: StockReturnSource) => void;
}) => (
  <div className="flex flex-1 flex-col gap-md rounded-2xl bg-base-white p-md shadow-[0px_0px_12px_4px_#c0c1be33,-4px_-4px_12px_0px_#d5d5d433,4px_4px_12px_-2px_#d5d5d433]">
    <div className="flex size-14 shrink-0 items-center justify-center rounded-full bg-primary-100">
      <Image src={option.icon} alt="" width={28} height={28} />
    </div>

    <p className="text-label-l5 font-semibold text-pneutral-900">{option.title}</p>

    <p className="text-label-l4 font-regular text-pneutral-500">{option.description}</p>

    {option.bullets && (
      <div className="flex flex-col gap-1 text-p3 font-regular text-pneutral-500">
        {option.bullets.map((bullet) => (
          <p key={bullet}>• {bullet}</p>
        ))}
      </div>
    )}

    {/* Pushes the note and button to the bottom, so both cards' buttons line
        up whatever the length of the copy above them. */}
    <div className="flex flex-1 flex-col justify-end gap-md">
      {option.note && (
        <div className="flex items-start gap-sm rounded-lg bg-primary-100 p-sm">
          <Image
            src="/StockReturn/WarningSmallIcon.svg"
            alt=""
            width={20}
            height={20}
            className="shrink-0"
          />
          <p className="flex-1 text-p3 font-regular text-secondary-700">{option.note}</p>
        </div>
      )}

      <Button
        type="button"
        variant="primary"
        fullWidth
        onClick={() => onSelect(option.source)}
        className="gap-2 px-4 font-medium! text-pneutral-50"
      >
        Select and Continue
        <Image src="/StockReturn/ArrowsRightLeftIcon.svg" alt="" width={20} height={20} />
      </Button>
    </div>
  </div>
);

const StockReturnType = ({ onSelect, onBack }: StockReturnTypeProps) => (
  <div className="flex min-h-full flex-col gap-4">
    <div className="flex flex-col gap-2">
      <p className="text-h5 font-semibold text-pneutral-900">Create Stock Return</p>
      <p className="text-label-l4 font-regular text-pneutral-500">
        Select the type of stock you want to return to Central Warehouse.
      </p>
    </div>

    <div className="flex w-full flex-col items-stretch gap-4 md:flex-row">
      {RETURN_OPTIONS.map((option) => (
        <OptionCard key={option.source} option={option} onSelect={onSelect} />
      ))}
    </div>

    <div className="mt-auto flex pt-4">
      <Button
        type="button"
        variant="outline"
        onClick={onBack}
        className="w-full! gap-2 border-secondary-700! px-4 font-medium! text-secondary-700! sm:w-67.5!"
      >
        <Image src="/StockReturn/ArrowLeftIcon.svg" alt="" width={20} height={20} />
        Back to Stock Return List
      </Button>
    </div>
  </div>
);

export default StockReturnType;
