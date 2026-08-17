'use client'

import { useState, type ReactNode } from 'react'
import Image from 'next/image'

const STEP_DEFS = [
  { icon: 'number-one', iconWidth: 4, iconHeight: 13, title: 'Allocation Mode' },
  { icon: 'number-two', iconWidth: 11, iconHeight: 17, title: 'Distribution Type' },
  { icon: 'number-three', iconWidth: 9, iconHeight: 13, title: 'Allocation Details' },
  { icon: 'number-four', iconWidth: 9, iconHeight: 13, title: 'Products' },
  { icon: 'number-five', iconWidth: 9, iconHeight: 13, title: 'Review' },
] as const

type AllocationWizardLayoutProps = {
  onCancel?: () => void
  onConfirm?: () => void
  children: (step: number, goToStep: (step: number) => void) => ReactNode
}

const AllocationWizardLayout = ({ onCancel, onConfirm, children }: AllocationWizardLayoutProps) => {
  const [currentStep, setCurrentStep] = useState(1)

  return (
    <div className="flex flex-col gap-8">
      <div className="flex w-full flex-col items-start gap-1.5">
        <h1 className="w-full text-h4 font-semibold text-pneutral-900">
          Create Stock Allocation
        </h1>
        <p className="w-full text-p3 font-normal text-pneutral-700">
          Choose how you want to create this stock allocation.
        </p>
      </div>

      <div className="flex w-full items-center">
        {STEP_DEFS.map((step, index) => {
          const stepNumber = index + 1
          const isActive = stepNumber === currentStep
          const isCompleted = stepNumber < currentStep
          const isLastStep = stepNumber === STEP_DEFS.length

          return (
            <div key={step.title} className="flex flex-1 items-center last:flex-initial">
              <div className="flex shrink-0 flex-col items-center gap-1.5">
                <div
                  className={`flex size-9 shrink-0 items-center justify-center rounded-full border-2 ${
                    isCompleted
                      ? 'border-success-800 bg-success-800'
                      : isActive
                        ? 'border-secondary-700 bg-secondary-700'
                        : 'border-secondary-700'
                  }`}
                >
                  {isCompleted ? (
                    <Image
                      src="/warehouseDistribution/step-check.svg"
                      alt=""
                      width={13}
                      height={11}
                    />
                  ) : (
                    <Image
                      src={`/warehouseDistribution/${step.icon}${isActive ? '-active' : ''}.svg`}
                      alt=""
                      width={step.iconWidth}
                      height={step.iconHeight}
                    />
                  )}
                </div>
                <p
                  className={`text-label-l3 font-normal whitespace-nowrap ${
                    isActive || isLastStep ? 'text-secondary-700' : 'text-pneutral-900'
                  }`}
                >
                  Step {stepNumber}
                </p>
                <p className="text-label-l3 font-normal whitespace-nowrap text-pneutral-500">
                  {step.title}
                </p>
              </div>
              {stepNumber < STEP_DEFS.length && (
                <div className="h-0.5 w-full flex-1 bg-secondary-700" />
              )}
            </div>
          )
        })}
      </div>

      {children(currentStep, setCurrentStep)}

      <div className="flex w-full items-center justify-between">
        <button
          type="button"
          onClick={currentStep === 1 ? onCancel : () => setCurrentStep((step) => Math.max(step - 1, 1))}
          className="flex h-12 w-35.25 items-center justify-center rounded-lg border-2 border-pneutral-900 bg-white px-4"
        >
          <span className="text-label-l4 font-medium text-pneutral-900">
            {currentStep === 1 ? 'Cancel' : 'Back'}
          </span>
        </button>

        <button
          type="button"
          onClick={
            currentStep === STEP_DEFS.length
              ? onConfirm
              : () => setCurrentStep((step) => Math.min(step + 1, STEP_DEFS.length))
          }
          className={`flex h-12 items-center justify-center gap-2 rounded-lg bg-primary-800 px-4 ${
            currentStep === STEP_DEFS.length ? '' : 'w-35.25'
          }`}
        >
          <span className="text-label-l4 font-medium text-pneutral-50">
            {currentStep === STEP_DEFS.length ? 'Confirm Allocation' : 'Continue'}
          </span>
          <Image
            src={`/warehouseDistribution/${
              currentStep === STEP_DEFS.length ? 'check-circle-outline-white' : 'arrow-forward'
            }.svg`}
            alt=""
            width={14}
            height={14}
          />
        </button>
      </div>
    </div>
  )
}

export default AllocationWizardLayout
