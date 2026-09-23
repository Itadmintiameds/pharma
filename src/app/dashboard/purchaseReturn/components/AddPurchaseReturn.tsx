import React from 'react'
import { ArrowLeft } from 'lucide-react'

interface AddPurchaseReturnProps {
  onClose?: () => void
}

const AddPurchaseReturn = ({ onClose }: AddPurchaseReturnProps) => {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={onClose}
          className="flex items-center gap-2 text-label-l4 font-medium text-pneutral-700 hover:text-pneutral-900"
        >
          <ArrowLeft size={20} />
          Back to Purchase Returns
        </button>
      </div>
      <div>AddPurchaseReturn</div>
    </div>
  )
}

export default AddPurchaseReturn