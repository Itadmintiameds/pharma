import React from 'react'
import { Check } from 'lucide-react'

/** Figma node 3543:32566 / 3543:32800 ("SPI Header Row") — the same 3-step
 * indicator repeats on every step of the Add Purchase Return wizard, with
 * only the title, subtitle and current step changing. */
const STEP_LABELS = ['Select Invoice', 'Return Items', 'Review & Confirm']

type StepStatus = 'complete' | 'active' | 'pending'

interface WizardHeaderProps {
  title: string
  subtitle: string
  /** 1-based index of the step currently shown. */
  currentStep: 1 | 2 | 3
}

const WizardHeader = ({ title, subtitle, currentStep }: WizardHeaderProps) => {
  return (
    <div className="flex flex-col gap-xlg lg:flex-row lg:items-start lg:justify-between">
      <div className="flex flex-1 flex-col gap-1">
        <p className="text-h5 font-semibold text-pneutral-900">{title}</p>
        <p className="text-label-l4 font-regular text-pneutral-500">{subtitle}</p>
      </div>

      <div className="flex w-full items-center justify-center gap-2 lg:w-141.5 lg:shrink-0">
        {STEP_LABELS.map((label, index) => {
          const stepNumber = index + 1
          const status: StepStatus =
            stepNumber < currentStep ? 'complete' : stepNumber === currentStep ? 'active' : 'pending'

          return (
            <React.Fragment key={label}>
              <div className="flex flex-col items-center gap-1.5">
                <div
                  className={`flex size-9 shrink-0 items-center justify-center rounded-full border-2 text-label-l3 font-regular ${
                    status === 'complete'
                      ? 'border-success-800 bg-success-800 text-base-white'
                      : status === 'active'
                        ? 'border-secondary-700 bg-secondary-700 text-base-white'
                        : 'border-secondary-700 bg-transparent text-secondary-700'
                  }`}
                >
                  {status === 'complete' ? <Check size={18} /> : stepNumber}
                </div>
                <p className="max-w-24 text-center text-label-l3 font-regular text-pneutral-900">
                  {label}
                </p>
              </div>

              {stepNumber < STEP_LABELS.length && (
                <div className="h-0.5 min-w-6 flex-1 bg-secondary-700" />
              )}
            </React.Fragment>
          )
        })}
      </div>
    </div>
  )
}

export default WizardHeader
