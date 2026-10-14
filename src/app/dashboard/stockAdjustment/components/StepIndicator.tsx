import React from "react";
import { Check } from "lucide-react";

const STEP_LABELS = ["Create Adjustment", "Review & Confirm"];

/** Figma "Step Indicator" — the 2-step tracker at the right of the create and
 *  review headers; only the current step changes between them. */
const StepIndicator = ({ currentStep }: { currentStep: 1 | 2 }) => (
  <div className="flex w-full items-center gap-xsm lg:w-115 lg:shrink-0">
    {STEP_LABELS.map((label, index) => {
      const stepNumber = index + 1;
      const status =
        stepNumber < currentStep ? "complete" : stepNumber === currentStep ? "active" : "pending";

      return (
        <React.Fragment key={label}>
          <div className="flex flex-col items-center gap-1.5">
            <div
              className={`flex size-9 shrink-0 items-center justify-center rounded-full border-2 text-label-l3 font-regular ${
                status === "complete"
                  ? "border-success-800 bg-success-800 text-white"
                  : status === "active"
                    ? "border-secondary-700 bg-secondary-700 text-white"
                    : "border-secondary-700 bg-transparent text-secondary-700"
              }`}
            >
              {status === "complete" ? <Check size={18} /> : stepNumber}
            </div>
            <p className="whitespace-nowrap text-center text-label-l3 font-regular text-pneutral-900">
              {label}
            </p>
          </div>

          {stepNumber < STEP_LABELS.length && (
            <div className="h-0.5 min-w-6 flex-1 bg-secondary-700" />
          )}
        </React.Fragment>
      );
    })}
  </div>
);

export default StepIndicator;
