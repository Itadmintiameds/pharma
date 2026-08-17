'use client'

import { useState } from 'react'
import AllocationWizardLayout from './components/AllocationWizardLayout'
import CreateAllocation from './components/CreateAllocation'
import DistributionType from './components/DistributionType'
import AllocationDetails from './components/AllocationDetails'
import AddProducts from './components/AddProducts'
import ReviewConfirm from './components/ReviewConfirm'
import DistributionSummary from './components/DistributionSummary'
import DispatchProducts from './components/StockMovementDetails'

type View = 'list' | 'wizard' | 'summary' | 'dispatch'

const page = () => {
  const [view, setView] = useState<View>('list')

  if (view === 'wizard') {
    return (
      <AllocationWizardLayout
        onCancel={() => setView('list')}
        onConfirm={() => setView('summary')}
      >
        {(step, goToStep) => {
          if (step === 1) return <CreateAllocation />
          if (step === 2) return <DistributionType />
          if (step === 3) return <AllocationDetails />
          if (step === 4) return <AddProducts />
          if (step === 5) return <ReviewConfirm onEditAllocationDetails={() => goToStep(3)} />

          return (
            <div className="flex w-full items-center justify-center rounded-2xl border border-pneutral-200 bg-white p-8 text-p3 text-pneutral-500">
              Step {step} content coming soon.
            </div>
          )
        }}
      </AllocationWizardLayout>
    )
  }

  if (view === 'summary') {
    return (
      <div className="flex w-full flex-col items-start gap-4">
        <DistributionSummary
          onBack={() => setView('list')}
          onDispatchProducts={() => setView('dispatch')}
        />
      </div>
    )
  }

  if (view === 'dispatch') {
    return <DispatchProducts />
  }

  return (
    <div className="flex w-full items-center justify-between">
      <h1 className="text-h4 font-semibold text-pneutral-900">
        Warehouse Distribution List
      </h1>

      <button
        type="button"
        onClick={() => setView('wizard')}
        className="flex h-12 items-center justify-center rounded-lg bg-secondary-700 px-5"
      >
        <span className="text-label-l5 font-medium text-pneutral-50">
          Create Allocation
        </span>
      </button>
    </div>
  )
}

export default page
