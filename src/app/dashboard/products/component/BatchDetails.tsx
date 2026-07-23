import Input from '@/app/components/common/Input'

const CalendarIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-pneutral-500">
    <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
    <line x1="16" y1="2" x2="16" y2="6" />
    <line x1="8" y1="2" x2="8" y2="6" />
    <line x1="3" y1="10" x2="21" y2="10" />
  </svg>
)

const BatchDetails = () => {
  return (
    <div className="flex h-full min-h-0 w-full flex-col gap-sm">
      <div className="flex min-h-0 w-full flex-1 flex-col">
        <div className="flex w-full flex-1 flex-col gap-xlg overflow-y-auto rounded-[12px] border border-pneutral-100 bg-base-white p-[14px] shadow-sm">
          <h3 className="shrink-0 text-h6 font-semibo ld text-pneutral-900">
            Batch Details
          </h3>

          <div className="grid grid-cols-2 items-start gap-x-xlg gap-y-sm">
            <Input label="Batch Number" required placeholder="Enter Batch Number" />

            <Input
              label="Manufacturing Date"
              type="date"
              required
              placeholder="Enter Manufacturing Date"
              leftIcon={<CalendarIcon />}
            />

            <Input
              label="Expiry Date"
              type="date"
              required
              placeholder="Enter Expiry Date"
              leftIcon={<CalendarIcon />}
            />

            <Input label="Purchase Unit" required placeholder="0" />
            <Input label="Purchase Quantity" required placeholder="0" />
            <Input label="Free Unit" required placeholder="0" />
            <Input label="Free Quantity" required placeholder="0" />

            <Input label="Purchase Price (per Box)" required placeholder="₹ 0.00" />
            <Input label="MRP (per Box)" required placeholder="₹ 0.00" />
            <Input label="Selling Price (per Box)" required placeholder="₹ 0.00" />

            <Input label="Purchase Price (per Smallest Unit)" required placeholder="₹ 0.00" />
            <Input label="MRP (per Smallest Unit)" required placeholder="₹ 0.00" />
            <Input label="Selling Price (per Smallest Unit)" required placeholder="₹ 0.00" />

            <Input label="Rack / Location" required placeholder="Enter Rack / Location" />
          </div>
        </div>
      </div>
    </div>
  )
}

export default BatchDetails