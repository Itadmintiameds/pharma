import React, { useEffect, useMemo, useState } from "react";
import InputField from "@/app/components/common/InputField";
import Button from "@/app/components/common/Button";
import SelectField from "@/app/components/common/SelectField";
import { supplierPaymentSchema } from "@/app/schema/SupplierPaymentSchema";
import { SupplierPaymentData } from "@/app/types/SupplierPaymentData";
import { createSypplierPayment } from "@/app/services/SupplierPaymentService";
import { toast } from "react-toastify";

type BillInfo = {
  billNo: string;
  amount: number;
  invId?: string;
};

interface SupplierPaymentProps {
  supplierName: string;
  supplierId: string;
  bills: BillInfo[];
  onSuccess: () => void;
  creditNoteAmount?: number;
}

const SupplierPayment: React.FC<SupplierPaymentProps> = ({
  supplierName,
  supplierId,
  bills,
  onSuccess,
  creditNoteAmount = 0,
}) => {
  const totalAmount = bills.reduce((sum, b) => sum + (b.amount || 0), 0);
  const [useCreditNote, setUseCreditNote] = useState<boolean>(false);

  // Auto-calculate payable amount based on total and credit note selection
  useEffect(() => {
    const payable = Math.max(
      totalAmount - (useCreditNote ? creditNoteAmount || 0 : 0),
      0
    );
    setEnteredTotalAmount(payable ? payable.toString() : "0");
  }, [totalAmount, useCreditNote, creditNoteAmount]);

  type OptionType = { label: string; value: string };
  const [paymentMode, setPaymentMode] = useState<OptionType | null>(null);
  const [referenceNo, setReferenceNo] = useState<string>("");
  const [enteredTotalAmount, setEnteredTotalAmount] = useState<string>("");
  const [remark, setRemark] = useState<string>("");
  const [showBills, setShowBills] = useState<boolean>(true);
  const [errors, setErrors] = useState<{
    paymentMode?: string;
    referenceNo?: string;
    amountPayable?: string;
  }>({});
  const [, setLoading] = useState(false);

  // Get reference label based on payment mode
  const getReferenceLabel = () => {
    switch (paymentMode?.value) {
      case "Cash":
        return "Voucher No";
      case "UPI":
        return "UTR No";
      case "Card":
        return "Card No";
      case "Cheque":
        return "Cheque No";
      case "IMPS":
      case "NEFT":
      case "RTGS":
        return "Transaction ID";
      default:
        return "Reference No";
    }
  };

  // Check if reference number is required based on payment mode
  const isReferenceRequired = () => {
    return paymentMode?.value !== "Cash";
  };

  const paymentModeOptions: OptionType[] = useMemo(() => {
    const options: OptionType[] = [
      { label: "Cash", value: "Cash" },
      { label: "UPI", value: "UPI" },
      { label: "Card", value: "Card" },
      { label: "NEFT", value: "NEFT" },
      { label: "RTGS", value: "RTGS" },
      { label: "IMPS", value: "IMPS" },
      { label: "Cheque", value: "Cheque" },
    ];
    return options.sort((a, b) => a.label.localeCompare(b.label));
  }, []);

  const loadPaymentModeOptions = (
    inputValue: string,
    callback: (options: OptionType[]) => void
  ) => {
    const filtered = paymentModeOptions.filter((opt) =>
      opt.label.toLowerCase().includes(inputValue.toLowerCase())
    );
    callback(filtered);
  };

  const handleSave = async () => {
    // For Cash payments, skip reference number validation if empty
    if (paymentMode?.value === "Cash" && !referenceNo.trim()) {
      // Skip reference number validation for Cash when empty
      const validationWithoutReference = supplierPaymentSchema.omit({ referenceNo: true }).safeParse({
        paymentMode: paymentMode?.value ?? "",
        amountPayable: enteredTotalAmount,
      });

      if (!validationWithoutReference.success) {
        const fieldErrors: {
          paymentMode?: string;
          referenceNo?: string;
          amountPayable?: string;
        } = {};
        for (const issue of validationWithoutReference.error.issues) {
          const key = issue.path?.[0] as
            | "paymentMode"
            | "referenceNo"
            | "amountPayable"
            | undefined;
          if (key) {
            fieldErrors[key] = issue.message;
          }
        }
        setErrors(fieldErrors);
        return;
      }
    } else {
      // For all other cases, validate normally
      const validation = supplierPaymentSchema.safeParse({
        paymentMode: paymentMode?.value ?? "",
        referenceNo: referenceNo,
        amountPayable: enteredTotalAmount,
      });

      if (!validation.success) {
        const fieldErrors: {
          paymentMode?: string;
          referenceNo?: string;
          amountPayable?: string;
        } = {};
        for (const issue of validation.error.issues) {
          const key = issue.path?.[0] as
            | "paymentMode"
            | "referenceNo"
            | "amountPayable"
            | undefined;
          if (key) {
            fieldErrors[key] = issue.message;
          }
        }
        setErrors(fieldErrors);
        return;
      }
    }

    setErrors({});
    setLoading(true);

    try {
      const payload: SupplierPaymentData = {
        paymentId: "",
        supplierId,
        paymentDate: new Date(),
        paymentMode: paymentMode?.value ?? "",
        // For Cash payments, allow empty reference number
        referenceNo: paymentMode?.value === "Cash" && !referenceNo.trim() 
          ? "" 
          : referenceNo,
        amountPaid: parseFloat(enteredTotalAmount),
        remark,
        supplierPaymentDetailsDtos: bills.map((b) => ({
          purchaseBillNo: b.billNo,
          clearedAmount: b.amount,
          invId: b.invId,
        })),
      };

      await createSypplierPayment(payload);
      toast.success("Supplier Payment successfully", {
        position: "top-right",
        autoClose: 3000,
      });

      setReferenceNo("");
      setEnteredTotalAmount("");
      setRemark("");
      setPaymentMode(null);

      onSuccess();
      window.location.reload();
    } catch (err: unknown) {
      if (err instanceof Error) {
        console.error("Error saving payment:", err.message);
      } else {
        console.error("Error saving payment:", err);
      }
    }
  };

  return (
    <>
      <main className="space-y-4">
        <div className="flex justify-between">
          <div className="font-normal text-xl flex text-gray">
            <div>Supplier - </div>
            <div className="px-1">{supplierName}</div>
          </div>
          <button
            type="button"
            onClick={() => setShowBills((prev) => !prev)}
            className="font-normal text-base flex text-green cursor-pointer select-none"
            aria-expanded={showBills}
            aria-controls="supplier-bills-table"
          >
            <div>Bills being Paid - </div>
            <div className="px-1 font-bold text-green-900">{bills.length}</div>
          </button>
        </div>

        {creditNoteAmount > 0 && (
          <label className="flex items-center gap-2 text-sm text-red-800">
            <input
              type="checkbox"
              className="w-4 h-4 accent-red-800 cursor-pointer"
              checked={useCreditNote}
              onChange={(e) => setUseCreditNote(e.target.checked)}
            />
            <span>
              Apply Credit Note:{" "}
              <span className="font-semibold">
                ₹{creditNoteAmount.toLocaleString()}
              </span>
            </span>
          </label>
        )}

        {showBills && (
          <div id="supplier-bills-table" className="border border-Gray rounded">
            <div className="grid grid-cols-2 font-medium text-base px-3 py-2 border-b border-Gray">
              <div>Invoice No</div>
              <div className="text-right">Invoice Amount</div>
            </div>
            <div
              className={
                bills.length > 5 ? "max-h-[200px] overflow-y-auto" : ""
              }
            >
              {bills.map((b, idx) => (
                <div
                  key={idx}
                  className="grid grid-cols-2 px-3 py-2 border-b last:border-b-0 border-Gray text-sm"
                >
                  <div>{b.billNo}</div>
                  <div className="text-right">
                    ₹{b.amount?.toLocaleString()}
                  </div>
                </div>
              ))}
            </div>
            <div className="grid grid-cols-2 px-3 py-2 border-t border-Gray font-semibold text-base">
              <div>Total Invoice Amount</div>
              <div className="text-right">₹{totalAmount.toLocaleString()}</div>
            </div>
          </div>
        )}

        <div className="mt-6">
          <div className="relative grid grid-cols-2 gap-4">
            <div className="relative w-full z-50">
              <SelectField
                value={paymentMode}
                onChange={(val) => {
                  setPaymentMode(val);
                  setErrors((e) => ({ ...e, paymentMode: undefined, referenceNo: undefined }));
                }}
                label={
                  <>
                    Payment Mode <span className="text-tertiaryRed">*</span>
                  </>
                }
                loadOptions={loadPaymentModeOptions}
                defaultOptions={paymentModeOptions}
                formatOptionLabel={(data) => data.label}
                isClearable={true}
              />
              {errors.paymentMode && (
                <p className="text-tertiaryRed text-xs mt-1">
                  {errors.paymentMode}
                </p>
              )}
            </div>

            <div className="relative w-full">
              <InputField
                id="referenceNo"
                label={
                  <>
                    {getReferenceLabel()}{" "}
                    {isReferenceRequired() && <span className="text-tertiaryRed">*</span>}
                  </>
                }
                value={referenceNo}
                onChange={(e) => {
                  setReferenceNo(e.target.value);
                  setErrors((er) => ({ ...er, referenceNo: undefined }));
                }}
              />
              {errors.referenceNo && (
                <p className="text-tertiaryRed text-xs mt-1">
                  {errors.referenceNo}
                </p>
              )}
            </div>
          </div>

          <div className="relative mt-4 grid grid-cols-2 gap-4">
            <div className="relative w-full">
              <InputField
                type="number"
                id="amountPaid"
                label={
                  <>
                    Payable Amount <span className="text-tertiaryRed">*</span>
                  </>
                }
                value={enteredTotalAmount}
                readOnly
                disabled
              />
              {errors.amountPayable && (
                <p className="text-tertiaryRed text-xs mt-1">
                  {errors.amountPayable}
                </p>
              )}
            </div>

            <div className="relative w-full">
              <InputField
                id="remark"
                label={<>Remark</>}
                value={remark}
                onChange={(e) => setRemark(e.target.value)}
              />
            </div>
          </div>
        </div>
      </main>
      <div className="flex mt-6">
        <Button
          onClick={handleSave}
          label="Add Payment"
          value=""
          className="w-32 bg-darkPurple text-white h-11"
        ></Button>
      </div>
    </>
  );
};

export default SupplierPayment;