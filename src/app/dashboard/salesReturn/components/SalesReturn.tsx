"use client";
import React, { useState, useEffect, useRef, useCallback } from "react";
import { BillingData, BillingItemData } from "@/app/types/BillingData";
import {
  SalesReturnData,
  SalesReturnItemData,
} from "@/app/types/SalesReturnData";
import { PatientData } from "@/app/types/PatientData";
import { getBillingById } from "@/app/services/BillingService";
import { getPatientById, getPatient } from "@/app/services/PatientService";
import { createSalesReturn } from "@/app/services/SalesReturnService";
import Button from "@/app/components/common/Button";
import Table from "@/app/components/common/Table";
import PaginationTable from "@/app/components/common/PaginationTable";
import { toast } from "react-toastify";
import Modal from "@/app/components/common/Modal";
import Select, { SelectInstance } from "react-select";
import { getItemById } from "@/app/services/ItemService";
import { ClipboardList } from "lucide-react";
import { useRouter } from "next/navigation";
import Loader from "@/app/components/common/Loader";
import InputField from "@/app/components/common/InputField";

interface SalesReturnProps {
  setShowCreateReturn: (value: boolean) => void;
  onSuccess: () => void;
  bills: Array<{ billId: string; billNumber: string }>;
}

interface OptionType {
  label: string;
  value: string;
}

interface MyButtonProps {
  onClick: () => void;
  label: string;
  className?: string;
  disabled?: boolean;
}

interface MobileBillItem extends SalesReturnItemData {
  sourceBillId: string;
  sourceBillNumber: string;
  billingDate: Date;
  paymentStatus: string;
}

interface PatientOption {
  label: string;
  value: string;
  phone: string;
  firstName: string;
  lastName: string;
  patientId: string;
}

const MyButton: React.FC<MyButtonProps> = ({
  disabled,
  onClick,
  label,
  className = "",
  ...props
}) => (
  <div className={disabled ? "opacity-50 cursor-not-allowed" : ""}>
    <Button
      onClick={disabled ? undefined : onClick}
      label={label}
      className={className}
      {...props}
    />
  </div>
);

const SalesReturn: React.FC<SalesReturnProps> = ({
  setShowCreateReturn,
  onSuccess,
  bills: initialBills,
}) => {
  const router = useRouter();
  const [searchMethod, setSearchMethod] = useState<'billNumber' | 'mobileNumber'>('billNumber');
  const [selectedBill, setSelectedBill] = useState<OptionType | null>(null);
  const [mobileNumber, setMobileNumber] = useState<string>('');
  const [allBills, setAllBills] = useState<BillingData[]>([]);
  const [allPatients, setAllPatients] = useState<PatientData[]>([]);
  const [originalBill, setOriginalBill] = useState<BillingData | null>(null);
  const [patientData, setPatientData] = useState<PatientData | null>(null);
  const [returnItem, setReturnItem] = useState<SalesReturnItemData[]>([]);
  const [mobileBillItems, setMobileBillItems] = useState<MobileBillItem[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showMobileLoader, setShowMobileLoader] = useState(false);
  const [searching, setSearching] = useState(false);
  const [inputValue, setInputValue] = useState("");
  const selectRef = useRef<SelectInstance<OptionType>>(null);
  const [modalMessage, setModalMessage] = useState("");
  const [modalSecondaryMesaage, setModalSecondaryMessage] = useState("");
  const [modalBgClass, setModalBgClass] = useState("");
  const [modalCancelCallback, setModalCancelCallback] = useState<() => void>(() => { });
  const [modalConfirmCallback, setModalConfirmCallback] = useState<() => Promise<void> | void>(() => { });
  const [mobileOptions, setMobileOptions] = useState<PatientOption[]>([]);
  const [selectedPatient, setSelectedPatient] = useState<PatientOption | null>(null);
  const [returnReason, setReturnReason] = useState<string>("");

  // Function to check if a bill is within the last 30 days
  const isBillWithinLast30Days = (billDate: Date): boolean => {
    const today = new Date();
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(today.getDate() - 30);
    
    // Reset hours to compare only dates
    today.setHours(0, 0, 0, 0);
    thirtyDaysAgo.setHours(0, 0, 0, 0);
    
    return billDate >= thirtyDaysAgo && billDate <= today;
  };

  useEffect(() => {
    const fetchAllBills = async () => {
      try {
        setSearching(true);
        const billsWithDetails = await Promise.all(
          initialBills.map(async (bill) => {
            try {
              const billDetails = await getBillingById(bill.billId);
              return billDetails;
            } catch (error) {
              console.error(`Failed to fetch details for bill ${bill.billId}:`, error);
              return null;
            }
          })
        );

        const validBills = billsWithDetails.filter(bill => bill !== null) as BillingData[];
        setAllBills(validBills);
      } catch (error) {
        console.error("Failed to fetch bill details:", error);
        toast.error("Failed to load bill data");
      } finally {
        setSearching(false);
      }
    };

    fetchAllBills();
  }, [initialBills]);

  useEffect(() => {
    const fetchPatients = async () => {
      try {
        const patients = await getPatient();
        setAllPatients(patients);

        const options = patients.map((p: PatientData) => ({
          label: `${p.phone} - ${p.firstName} ${p.lastName}`,
          value: p.patientId,
          phone: p.phone.toString(),
          firstName: p.firstName,
          lastName: p.lastName,
          patientId: p.patientId,
        }));
        setMobileOptions(options);
      } catch (error) {
        console.error("Failed to fetch patients:", error);
        toast.error("Failed to load patient data");
      }
    };

    fetchPatients();
  }, []);

  const handleShowModal = (options: {
    message: string;
    secondaryMessage?: string;
    bgClassName?: string;
    onConfirmCallback: () => Promise<void> | void;
    onCancelCallback?: () => void;
  }) => {
    setModalMessage(options.message);
    setModalSecondaryMessage(options.secondaryMessage || "");
    setModalBgClass(options.bgClassName || "");
    setModalConfirmCallback(() => options.onConfirmCallback);
    setModalCancelCallback(() => options.onCancelCallback || (() => { }));
    setShowModal(true);
  };

  const handleModalConfirm = async () => {
    await modalConfirmCallback();
    setShowModal(false);
  };

  const handleModalCancel = async () => {
    if (modalCancelCallback) {
      modalCancelCallback();
    }
    setShowModal(false);
  };

  useEffect(() => {
    const loadItemsByMobileNumber = async () => {
      if (!mobileNumber || mobileNumber.length !== 10) {
        setMobileBillItems([]);
        setShowMobileLoader(false);
        return;
      }

      try {
        setShowMobileLoader(true);
        setSearching(true);

        // Find patients with this mobile number
        const patientsWithMobile = allPatients.filter(
          patient => patient.phone && patient.phone.toString() === mobileNumber
        );

        if (patientsWithMobile.length === 0) {
          toast.error("No patients found with this mobile number");
          setMobileBillItems([]);
          setShowMobileLoader(false);
          return;
        }

        const patientIds = patientsWithMobile.map(patient => patient.patientId);

        // Filter bills by patient IDs and date range (last 30 days)
        const filteredBills = allBills.filter(bill =>
          bill.patientId && patientIds.includes(bill.patientId) &&
          isBillWithinLast30Days(new Date(bill.billDateTime))
        );

        if (filteredBills.length === 0) {
          toast.info("No bills found for this patient");
          setMobileBillItems([]);
          setShowMobileLoader(false);
          return;
        }

        const allBilledItems: MobileBillItem[] = [];

        for (const bill of filteredBills) {
          const enrichedItems = await Promise.all(
            bill.billItemDtos.map(async (item: BillingItemData) => {
              try {
                const itemDetails = await getItemById(item.itemId);

                // Calculate the billed amount the same way as in bill number search
                const cgstPercentage = item.gstPercentage / 2;
                const sgstPercentage = item.gstPercentage / 2;

                const discountedPrice =
                  item.mrpSalePricePerUnit *
                  (1 - (item.discountPercentage || 0) / 100);
                const originalGross = item.packageQuantity * discountedPrice;
                const cgstAmount = originalGross * (cgstPercentage / 100);
                const sgstAmount = originalGross * (sgstPercentage / 100);
                const originalNet = originalGross + cgstAmount + sgstAmount;

                return {
                  returnItemId: `temp-${Math.random().toString(36).substring(2, 9)}`,
                  billItemId: item.billItemId,
                  itemId: item.itemId,
                  itemName: itemDetails.itemName,
                  batchNo: item.batchNo,
                  expiryDate: item.expiryDate,
                  returnedQuantity: 0,
                  originalPrice: item.mrpSalePricePerUnit,
                  billedAmount: originalNet, // Use the calculated amount instead of item.netTotal
                  gstPercentage: item.gstPercentage,
                  cgstPercentage: cgstPercentage,
                  sgstPercentage: sgstPercentage,
                  discountPercentage: item.discountPercentage,
                  refundAmount: 0,
                  maxQuantity: item.packageQuantity,
                  packageQuantity: item.packageQuantity,
                  returnQuantity: 0,
                  mrpSalePricePerUnit: discountedPrice,
                  netTotal: 0,
                  grossTotal: originalGross,
                  cgstAmount: 0,
                  sgstAmount: 0,
                  sourceBillId: bill.billId,
                  sourceBillNumber: bill.billId1 || `Bill-${bill.billId.substring(0, 8)}`,
                  billingDate: bill.billDateTime,
                  paymentStatus: bill.paymentStatus || "Unknown"
                };
              } catch (err) {
                console.error("Failed to fetch item details:", err);
                // Fallback with same calculation logic
                const cgstPercentage = item.gstPercentage / 2;
                const sgstPercentage = item.gstPercentage / 2;

                const discountedPrice =
                  item.mrpSalePricePerUnit *
                  (1 - (item.discountPercentage || 0) / 100);
                const originalGross = item.packageQuantity * discountedPrice;
                const cgstAmount = originalGross * (cgstPercentage / 100);
                const sgstAmount = originalGross * (sgstPercentage / 100);
                const originalNet = originalGross + cgstAmount + sgstAmount;

                return {
                  returnItemId: `temp-${Math.random().toString(36).substring(2, 9)}`,
                  billItemId: item.billItemId,
                  itemId: item.itemId,
                  itemName: "Unknown Item",
                  batchNo: item.batchNo,
                  expiryDate: item.expiryDate,
                  returnedQuantity: 0,
                  originalPrice: item.mrpSalePricePerUnit,
                  billedAmount: originalNet, // Use the calculated amount
                  gstPercentage: item.gstPercentage,
                  cgstPercentage: cgstPercentage,
                  sgstPercentage: sgstPercentage,
                  discountPercentage: item.discountPercentage,
                  refundAmount: 0,
                  maxQuantity: item.packageQuantity,
                  packageQuantity: item.packageQuantity,
                  returnQuantity: 0,
                  mrpSalePricePerUnit: discountedPrice,
                  netTotal: 0,
                  grossTotal: originalGross,
                  cgstAmount: 0,
                  sgstAmount: 0,
                  sourceBillId: bill.billId,
                  sourceBillNumber: bill.billId1 || `Bill-${bill.billId.substring(0, 8)}`,
                  billingDate: bill.billDateTime,
                  paymentStatus: bill.paymentStatus || "Unknown"
                };
              }
            })
          );

          allBilledItems.push(...enrichedItems);
        }

        setTimeout(() => {
          setMobileBillItems(allBilledItems);
          setShowMobileLoader(false);
        }, 1000);

      } catch (error) {
        toast.error("Failed to fetch billed items by mobile number");
        console.error("Error fetching billed items by mobile:", error);
        setShowMobileLoader(false);
      } finally {
        setSearching(false);
      }
    };

    const debounceTimer = setTimeout(() => {
      loadItemsByMobileNumber();
    }, 500);

    return () => clearTimeout(debounceTimer);
  }, [mobileNumber, allPatients, allBills]);

  const fetchOriginalBill = useCallback(async (billId: string) => {
    try {
      setSearching(true);
      const bill = await getBillingById(billId);

      if (!bill) {
        toast.error("Bill not found");
        return;
      }

      const enrichedItems = await Promise.all(
        bill.billItemDtos.map(async (item: BillingItemData) => {
          try {
            const itemDetails = await getItemById(item.itemId);
            return {
              ...item,
              itemName: itemDetails.itemName,
              gstPercentage: item.gstPercentage || itemDetails.gstPercentage,
              cgstPercentage:
                (item.gstPercentage || itemDetails.gstPercentage) / 2,
              sgstPercentage:
                (item.gstPercentage || itemDetails.gstPercentage) / 2,
            };
          } catch (err) {
            console.error("Failed to fetch item details:", err);
            return {
              ...item,
              itemName: "Unknown Item",
              gstPercentage: item.gstPercentage || 0,
              cgstPercentage: (item.gstPercentage || 0) / 2,
              sgstPercentage: (item.gstPercentage || 0) / 2,
            };
          }
        })
      );

      const updatedBill = {
        ...bill,
        billItemDtos: enrichedItems,
      };

      setOriginalBill(updatedBill);

      if (bill.patientId) {
        try {
          const patient = await getPatientById(bill.patientId);
          setPatientData(patient);
        } catch (patientError) {
          console.warn("Could not fetch patient details", patientError);
        }
      }

      const initialReturnItems = updatedBill.billItemDtos.map(
        (item: BillingItemData) => {
          const cgstPercentage = item.gstPercentage / 2;
          const sgstPercentage = item.gstPercentage / 2;

          const discountedPrice =
            item.mrpSalePricePerUnit *
            (1 - (item.discountPercentage || 0) / 100);
          const originalGross = item.packageQuantity * discountedPrice;
          const cgstAmount = originalGross * (cgstPercentage / 100);
          const sgstAmount = originalGross * (sgstPercentage / 100);
          const originalNet = originalGross + cgstAmount + sgstAmount;

          return {
            returnItemId: `temp-${Math.random().toString(36).substring(2, 9)}`,
            billItemId: item.billItemId,
            itemId: item.itemId,
            itemName: item.itemName,
            batchNo: item.batchNo,
            expiryDate: item.expiryDate,
            returnedQuantity: 0,
            originalPrice: item.mrpSalePricePerUnit,
            billedAmount: originalNet,
            gstPercentage: item.gstPercentage,
            cgstPercentage,
            sgstPercentage,
            discountPercentage: item.discountPercentage,
            refundAmount: 0,
            maxQuantity: item.packageQuantity,
            packageQuantity: item.packageQuantity,
            returnQuantity: 0,
            mrpSalePricePerUnit: discountedPrice,
            netTotal: 0,
            grossTotal: item.grossTotal,
            cgstAmount: 0,
            sgstAmount: 0,
          };
        }
      );

      setReturnItem(initialReturnItems);
    } catch (error) {
      toast.error("Failed to fetch bill details");
      console.error("Error fetching bill details:", error);
    } finally {
      setSearching(false);
    }
  }, []);

  const handleMobileItemClick = useCallback(async (item: MobileBillItem) => {
    setSearchMethod('billNumber');
    setSelectedBill({
      label: item.sourceBillNumber,
      value: item.sourceBillId,
    });

    try {
      await fetchOriginalBill(item.sourceBillId);
    } catch (error) {
      console.error("Error loading bill details:", error);
    }
  }, [fetchOriginalBill]);

  const handleBillNumberClick = useCallback(async (billId: string, billNumber: string) => {
    setSearchMethod('billNumber');
    setSelectedBill({
      label: billNumber,
      value: billId,
    });

    try {
      await fetchOriginalBill(billId);
    } catch (error) {
      console.error("Error loading bill details:", error);
    }
  }, [fetchOriginalBill]);

  useEffect(() => {
    if (selectedBill?.value && searchMethod === 'billNumber') {
      fetchOriginalBill(selectedBill.value);
    } else {
      setOriginalBill(null);
      setPatientData(null);
      setReturnItem([]);
    }
  }, [selectedBill?.value, searchMethod, fetchOriginalBill]);

  const handleInputChange = (newValue: string) => {
    setInputValue(newValue);
  };

  const handleBillChange = (selected: OptionType | null) => {
    setSelectedBill(selected);
    if (!selected) {
      setInputValue("");
    }
  };

  const handleReturnItemChange = (
    index: number,
    field: keyof SalesReturnItemData,
    value: string | number
  ) => {
    const updatedItems = [...returnItem];
    const item = { ...updatedItems[index], [field]: value };

    if (field === "returnedQuantity" || field === "returnQuantity") {
      const quantity = Number(value);
      const discountedPrice = item.mrpSalePricePerUnit;
      const grossAmount = quantity * discountedPrice;

      const cgstAmount = grossAmount * ((item.cgstPercentage || 0) / 100);
      const sgstAmount = grossAmount * ((item.sgstPercentage || 0) / 100);
      const netAmount = grossAmount + cgstAmount + sgstAmount;

      item.refundAmount = netAmount;
      item.grossAmount = grossAmount;
      item.netTotal = netAmount;
      item.returnQuantity = quantity;
      item.cgstAmount = cgstAmount;
      item.sgstAmount = sgstAmount;
    }

    updatedItems[index] = item;
    setReturnItem(updatedItems);
  };

  const calculateTotals = () => {
    return returnItem.reduce(
      (acc, item) => {
        return {
          subTotal: acc.subTotal + (item.grossAmount || 0),
          totalCgst: acc.totalCgst + (item.cgstAmount || 0),
          totalSgst: acc.totalSgst + (item.sgstAmount || 0),
          grandTotal: acc.grandTotal + (item.netTotal || 0),
        };
      },
      { subTotal: 0, totalCgst: 0, totalSgst: 0, grandTotal: 0 }
    );
  };

  const validateForm = () => {
    if (!originalBill) {
      toast.error("Please select a valid bill first");
      return false;
    }

    const hasReturnItem = returnItem.some((item) => item.returnQuantity > 0);

    if (!hasReturnItem) {
      toast.error("Please specify return quantities for at least one item");
      return false;
    }

    if (returnReason && returnReason.length > 0) {
    if (returnReason.length < 3) {
      toast.error("Return reason must be at least 3 characters if provided");
      return false;
    }

    if (returnReason.length > 200) {
      toast.error("Reason for return cannot exceed 200 characters");
      return false;
    }
    }
    return true;
  };

  const handleSubmit = async () => {
    if (!validateForm() || !originalBill) return;

    const totals = calculateTotals();

    const salesReturnData: SalesReturnData = {
      originalBillId: originalBill.billId,
      billId1: originalBill.billId1 || "",
      patientId: originalBill.patientId,
      patientName: originalBill.patientName || "",
      billReturnDateTime: new Date(),
      subTotal: totals.subTotal,
      totalCgst: totals.totalCgst,
      totalSgst: totals.totalSgst,
      grandTotal: totals.grandTotal,
      totalDiscount: originalBill.totalDiscount,
      pharmacyId: originalBill.pharmacyId,
      returnReason: returnReason,
      billReturnItemDtos: returnItem
        .filter((item) => (item.returnedQuantity || 0) > 0)
        .map((item) => ({
          itemId: item.itemId,
          batchNo: item.batchNo,
          expiryDate: item.expiryDate,
          packageQuantity: item.packageQuantity,
          returnQuantity: item.returnQuantity || item.returnedQuantity || 0,
          mrpSalePricePerUnit: item.mrpSalePricePerUnit,
          gstPercentage:
            item.gstPercentage || item.cgstPercentage + item.sgstPercentage,
          cgstPercentage: item.cgstPercentage,
          sgstPercentage: item.sgstPercentage,
          discountPercentage: item.discountPercentage || 0,
          netTotal: item.netTotal || 0,
          grossTotal: item.grossTotal || 0,
          cgstAmount: item.cgstAmount || 0,
          sgstAmount: item.sgstAmount || 0,
        })),
    };

    try {
      setLoading(true);
      const result = await createSalesReturn(salesReturnData);
      if (result) {
        toast.success("Return created successfully");
        onSuccess();
        setShowCreateReturn(false);
        router.push("/dashboard/salesReturn");
      }
    } catch (error: unknown) {
      console.error("Error creating return:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to create return"
      );
    } finally {
      setLoading(false);
    }
  };

  const returnColumns = [
    {
      header: "Item Name",
      accessor: (row: SalesReturnItemData) => row.itemName,
    },
    {
      header: "Batch No.",
      accessor: (row: SalesReturnItemData) => row.batchNo,
    },
    {
      header: "Expiry Date",
      accessor: (row: SalesReturnItemData) =>
        row.expiryDate
          ? new Date(row.expiryDate).toLocaleDateString("en-GB")
          : "N/A",
    },
    {
      header: "Billed Qty.",
      accessor: (row: SalesReturnItemData) => row.packageQuantity,
    },
    {
      header: "Return Qty.",
      accessor: (row: SalesReturnItemData, index: number) => (
        <input
          type="number"
          min="0"
          max={row.packageQuantity ?? undefined}
          value={row.returnedQuantity}
          onChange={(e) =>
            handleReturnItemChange(
              index,
              "returnedQuantity",
              Math.min(Number(e.target.value), row.packageQuantity ?? Infinity)
            )
          }
          className="w-20 border border-gray-300 rounded px-2 py-1"
        />
      ),
    },
    {
      header: "Billed Amount",
      accessor: (row: SalesReturnItemData) =>
        row.billedAmount?.toFixed(2) || "0.00",
    },
    {
      header: "Refund Amount",
      accessor: (row: SalesReturnItemData) =>
        `${row.netTotal?.toFixed(2) || "0.00"}`,
    },
  ];

  // New columns for mobile number search table
  const mobileSearchColumns = [
    {
      header: "Bill No.",
      accessor: (row: MobileBillItem) => (
        <button
          onClick={() => handleBillNumberClick(row.sourceBillId, row.sourceBillNumber)}
          className="text-darkPurple underline text-left cursor-pointer hover:text-darkPurple"
        >
          {row.sourceBillNumber}
        </button>
      ),
    },
    {
      header: "Bill Date",
      accessor: (row: MobileBillItem) =>
        row.billingDate
          ? new Date(row.billingDate).toLocaleDateString("en-GB")
          : "N/A",
    },
    {
      header: "Payment Status",
      accessor: (row: MobileBillItem) => formatPaymentStatus(row.paymentStatus),
    },
    {
      header: "Item Name",
      accessor: (row: MobileBillItem) => (
        <button
          onClick={() => handleMobileItemClick(row)}
          className="text-darkPurple underline text-left cursor-pointer hover:text-darkPurple"
        >
          {row.itemName}
        </button>
      ),
    },
    {
      header: "Batch No.",
      accessor: (row: MobileBillItem) => row.batchNo,
    },
    {
      header: "Expiry Date",
      accessor: (row: MobileBillItem) =>
        row.expiryDate
          ? new Date(row.expiryDate).toLocaleDateString("en-GB")
          : "N/A",
    },
    {
      header: "Billed Quantity",
      accessor: (row: MobileBillItem) => row.packageQuantity,
    },
    {
      header: "Billed Amount",
      accessor: (row: MobileBillItem) =>
        row.billedAmount?.toFixed(2) || "0.00",
    },
  ];

  const formatPaymentStatus = (status: string) => {
    return status
      ? status.charAt(0).toUpperCase() + status.slice(1).toLowerCase()
      : "N/A";
  };

  const handleManualBillEntry = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      const matchedBill = initialBills.find(
        (bill) => bill.billNumber.toLowerCase() === inputValue.toLowerCase()
      );
      if (matchedBill) {
        setSelectedBill({
          label: matchedBill.billNumber,
          value: matchedBill.billId,
        });
      } else {
        toast.error("No matching bill found");
        setSelectedBill(null);
      }
    }
  };

  const formatPatientType = (type: string) => {
    return type === "IP"
      ? "In-Patient"
      : type === "OP"
        ? "Out-Patient"
        : type || "N/A";
  };

  return (
    <main className="space-y-6 p-4">
      {showModal && (
        <Modal
          message={modalMessage}
          secondaryMessage={modalSecondaryMesaage}
          bgClassName={modalBgClass}
          onConfirm={handleModalConfirm}
          onCancel={handleModalCancel}
        />
      )}
      <div className="flex justify-between items-center">
        <h1 className="justify-start text-darkPurple text-3xl font-medium leading-10">
          Sales Return
        </h1>
        <div>
          <Button
            onClick={() => setShowCreateReturn(false)}
            label="Sales Return List"
            value=""
            className="w-48 bg-darkPurple text-white h-11"
            icon={<ClipboardList size={15} />}
          />
        </div>
      </div>

      {/* Search Method Selection */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">Search By</label>
          <div className="flex space-x-4">
            <label className="inline-flex items-center">
              <input
                type="radio"
                value="billNumber"
                checked={searchMethod === 'billNumber'}
                onChange={(e) => {
                  setSearchMethod(e.target.value as 'billNumber' | 'mobileNumber');
                  setSelectedBill(null);
                  setMobileNumber('');
                  setMobileBillItems([]);
                  setReturnItem([]);
                }}
                className="form-radio cursor-pointer accent-[var(--DARK-PURPLE)]"
              />
              <span className="ml-2">Bill Number</span>
            </label>
            <label className="inline-flex items-center">
              <input
                type="radio"
                value="mobileNumber"
                checked={searchMethod === 'mobileNumber'}
                onChange={(e) => {
                  setSearchMethod(e.target.value as 'billNumber' | 'mobileNumber');
                  setSelectedBill(null);
                  setInputValue('');
                  setReturnItem([]);
                }}
                className="form-radio cursor-pointer accent-[var(--DARK-PURPLE)]"
              />
              <span className="ml-2">Mobile Number</span>
            </label>
          </div>
        </div>

        {searchMethod === 'billNumber' ? (
          <div className="flex w-[351.67px] h-[96px] py-6 flex-col justify-center items-start relative">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Bill Number *
            </label>
            <Select
              ref={selectRef}
              options={initialBills.map((bill) => ({
                label: bill.billNumber,
                value: bill.billId,
              }))}
              value={selectedBill}
              onChange={handleBillChange}
              onInputChange={handleInputChange}
              inputValue={inputValue}
              className="w-full"
              placeholder="Enter Bill Number"
              isLoading={searching}
              isClearable={true}
              onKeyDown={handleManualBillEntry}
              filterOption={(option, rawInput) => {
                return option.label
                  .toLowerCase()
                  .includes(rawInput.toLowerCase());
              }}
              styles={{
                control: (base, state) => ({
                  ...base,
                  borderColor: state.isFocused ? "#442060" : base.borderColor,
                  boxShadow: state.isFocused
                    ? "0 0 0 1px #421D5E"
                    : base.boxShadow,
                  "&:hover": {
                    borderColor: state.isFocused ? "#442060" : base.borderColor,
                  },
                }),
                option: (base, state) => ({
                  ...base,
                  backgroundColor: state.isSelected
                    ? "#442060"
                    : state.isFocused
                      ? "#F3E8FF"
                      : base.backgroundColor,
                  color: state.isSelected ? "white" : base.color,
                  "&:active": {
                    backgroundColor: "#E1C4F8",
                  },
                }),
                menu: (base) => ({
                  ...base,
                  zIndex: 9999,
                }),
                clearIndicator: (base) => ({
                  ...base,
                  color: '#442060',
                  ':hover': {
                    color: '#6D28D9',
                  },
                }),
              }}
              theme={(theme) => ({
                ...theme,
                colors: {
                  ...theme.colors,
                  primary: "#442060",
                  primary25: "#F3E8FF",
                  primary50: "#E1C4F8",
                },
              })}
            />
          </div>
        ) : (
          <div className="space-y-4 w-full">
            <div className="flex flex-col md:flex-row gap-6 w-full items-start">
              <div className="w-[351.67px] h-[96px] py-6 flex flex-col justify-center items-start relative">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Mobile Number *
                </label>
                <div className="relative w-full">
                  <Select
                    value={selectedPatient}
                    onChange={(selected) => {
                      setSelectedPatient(selected);
                      if (selected) {
                        setMobileNumber(selected.phone);
                      } else {
                        setMobileNumber('');
                        setMobileBillItems([]);
                      }
                    }}
                    options={mobileOptions}
                    className="w-full"
                    classNamePrefix="select"
                    placeholder="Select or type mobile number"
                    isClearable={true}
                    noOptionsMessage={() => <div className="p-3">No options</div>}
                    filterOption={(option, inputValue) => {
                      if (!inputValue) return true;
                      return option.label.toLowerCase().includes(inputValue.toLowerCase()) ||
                        option.data.phone.includes(inputValue);
                    }}
                    styles={{
                      control: (base, state) => ({
                        ...base,
                        borderColor: state.isFocused ? "#442060" : base.borderColor,
                        boxShadow: state.isFocused
                          ? "0 0 0 1px #421D5E"
                          : base.boxShadow,
                        "&:hover": {
                          borderColor: state.isFocused ? "#442060" : base.borderColor,
                        },
                        height: '49px',
                      }),
                      option: (base, state) => ({
                        ...base,
                        backgroundColor: state.isSelected
                          ? "#442060"
                          : state.isFocused
                            ? "#F3E8FF"
                            : base.backgroundColor,
                        color: state.isSelected ? "white" : base.color,
                        "&:active": {
                          backgroundColor: "#E1C4F8",
                        },
                      }),
                      menu: (base) => ({
                        ...base,
                        zIndex: 100,
                      }),
                      clearIndicator: (base) => ({
                        ...base,
                        color: '#442060',
                        ':hover': {
                          color: '#6D28D9',
                        },
                      }),
                    }}
                    theme={(theme) => ({
                      ...theme,
                      colors: {
                        ...theme.colors,
                        primary: "#442060",
                        primary25: "#F3E8FF",
                        primary50: "#E1C4F8",
                      },
                    })}
                  />
                </div>
              </div>
            </div>

            {/* Loader */}
            {showMobileLoader && (
              <div className="flex justify-center items-center h-64">
                <Loader type="spinner" size="md" text="Loading..." fullScreen={false} />
              </div>
            )}

            {/* Mobile Number Search Results Table */}
            {!showMobileLoader && mobileNumber && mobileBillItems.length > 0 && (
              <PaginationTable
                data={mobileBillItems}
                columns={mobileSearchColumns}
                noDataMessage="No bills found for this mobile number"
              />

            )}

            {/* No Bills Found Message */}
            {!showMobileLoader && mobileNumber && mobileBillItems.length === 0 && (
              <div className="bg-white rounded-lg shadow p-6 w-full text-center">
                <p className="text-gray-500 text-lg">No bills found for this patient</p>
              </div>
            )}
          </div>
        )}
      </div>

      {searchMethod === 'billNumber' && originalBill && (
        <>
          <div className="bg-white rounded-lg p-6 w-full border border-gray-200">
            <div className="flex items-center mb-6">
              <h2 className="text-xl font-bold text-gray-800">Patient Details</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {/* Patient Name */}
              <div className="relative">
                <InputField
                  id="patientName"
                  label="Patient Name"
                  type="text"
                  value={
                    patientData?.firstName
                      ? `${patientData.firstName} ${patientData.lastName || ""}`.trim()
                      : originalBill.patientName || "--"
                  }
                  readOnly={true}
                />
              </div>

              {/* Bill Date */}
              <div className="relative">
                <InputField
                  id="billDate"
                  label="Bill Date"
                  type="text"
                  value={
                    originalBill?.billDateTime
                      ? new Date(originalBill.billDateTime).toLocaleDateString("en-GB", {
                        day: "2-digit",
                        month: "2-digit",
                        year: "numeric",
                      })
                      : "--"
                  }
                  readOnly={true}
                />
              </div>

              {/* Mobile Number */}
              <div className="relative">
                <InputField
                  id="mobileNumber"
                  label="Mobile Number"
                  type="text"
                  value={
                    patientData?.phone != null
                      ? String(patientData.phone)
                      : originalBill?.phone != null
                        ? String(originalBill.phone)
                        : "--"
                  }
                  readOnly={true}
                />
              </div>

              {/* Patient ID */}
              <div className="relative">
                <InputField
                  id="patientId"
                  label="Patient ID"
                  type="text"
                  value={patientData?.patientId1 || originalBill?.patientId1 || "--"}
                  readOnly={true}
                />
              </div>

              {/* Patient Type */}
              <div className="relative">
                <InputField
                  id="patientType"
                  label="Patient Type"
                  type="text"
                  value={formatPatientType(originalBill.patientType) || "--"}
                  readOnly={true}
                />
              </div>

              {/* Payment Status */}
              <div className="relative">
                <InputField
                  id="paymentStatus"
                  label="Payment Status"
                  type="text"
                  value={formatPaymentStatus(originalBill.paymentStatus) || "--"}
                  readOnly={true}
                />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6 w-full">
            <h2 className="text-xl font-bold text-gray-800">
              Billed Items
            </h2>
            <Table
              data={returnItem}
              columns={returnColumns}
              noDataMessage="No items available for return"
            />
          </div>






<div className="bg-white rounded-lg shadow p-6 w-full">
  <div className="flex flex-col md:flex-row gap-8">
    {/* Left Section — Return Reason */}
    <div className="flex-1 min-w-0">
      <InputField
        id="returnReason"
        label="Return Reason"
        type="textarea"
        value={returnReason}
        onChange={(e) => setReturnReason(e.target.value)}
        maxLength={200}
      />
      <div className="text-sm text-gray-500 text-right mt-1">
        {returnReason.length}/200 characters
      </div>
    </div>

    {/* Right Section — Totals */}
    <div className="flex-1 min-w-0">
      <div className="flex flex-col space-y-4">
        {/* Subtotal */}
        <div className="flex justify-end gap-x-8">
          <span className="w-48 text-base font-medium text-[#433E3F] text-right">
            Subtotal:
          </span>
          <span className="w-60 text-base text-[#0A0A0B] text-right">
            {calculateTotals().subTotal.toFixed(2)}
          </span>
        </div>

        {/* Total CGST */}
        <div className="flex justify-end gap-x-8">
          <span className="w-48 text-base font-medium text-[#433E3F] text-right">
            Total CGST:
          </span>
          <span className="w-60 text-base text-[#0A0A0B] text-right">
            {calculateTotals().totalCgst.toFixed(2)}
          </span>
        </div>

        {/* Total SGST */}
        <div className="flex justify-end gap-x-8">
          <span className="w-48 text-base font-medium text-[#433E3F] text-right">
            Total SGST:
          </span>
          <span className="w-60 text-base text-[#0A0A0B] text-right">
            {calculateTotals().totalSgst.toFixed(2)}
          </span>
        </div>

        {/* Grand Total */}
        <div className="flex justify-end gap-x-8 bg-[#F3E8FF] rounded-lg p-3">
          <span className="w-48 text-xl font-medium text-[#442060] text-right">
            Grand Total
          </span>
          <span className="w-60 text-xl font-medium text-[#442060] text-right">
            {calculateTotals().grandTotal.toFixed(2)}
          </span>
        </div>
      </div>
    </div>
  </div>
</div>








          <div className="flex justify-end">
            <MyButton
              onClick={() =>
                handleShowModal({
                  message:
                    "Are you sure you want to confirm payment? once confirmed, cannot be edited.",
                  secondaryMessage: "Confirm Payment",
                  bgClassName: "bg-darkPurple",
                  onConfirmCallback: handleSubmit,
                })
              }
              label={loading ? "Processing..." : "Save"}
              disabled={loading}
              className="w-28 bg-darkPurple text-white h-11"
            />
          </div>
        </>
      )}
    </main>
  );
};

export default SalesReturn;
























// original code before changing the feature of mobile number bill search...............

// "use client";
// import React, { useState, useEffect, useRef, useCallback } from "react";
// import { BillingData, BillingItemData } from "@/app/types/BillingData";
// import {
//   SalesReturnData,
//   SalesReturnItemData,
// } from "@/app/types/SalesReturnData";
// import { PatientData } from "@/app/types/PatientData";
// import { getBillingById } from "@/app/services/BillingService";
// import { getPatientById, getPatient } from "@/app/services/PatientService";
// import { createSalesReturn } from "@/app/services/SalesReturnService";
// import Button from "@/app/components/common/Button";
// import Table from "@/app/components/common/Table";
// import { toast } from "react-toastify";
// import Modal from "@/app/components/common/Modal";
// import Select, { SelectInstance } from "react-select";
// import { getItemById } from "@/app/services/ItemService";
// import { ClipboardList, ChevronDown } from "lucide-react";
// import { useRouter } from "next/navigation";
// import Loader from "@/app/components/common/Loader";

// interface SalesReturnProps {
//   setShowCreateReturn: (value: boolean) => void;
//   onSuccess: () => void;
//   bills: Array<{ billId: string; billNumber: string }>;
// }

// interface OptionType {
//   label: string;
//   value: string;
// }

// interface MyButtonProps {
//   onClick: () => void;
//   label: string;
//   className?: string;
//   disabled?: boolean;
// }

// interface MobileBillItem extends SalesReturnItemData {
//   sourceBillId: string;
//   sourceBillNumber: string;
//   billingDate: Date;
// }

// interface PatientOption {
//   label: string;
//   value: string;
//   phone: string;
//   firstName: string;
//   lastName: string;
//   patientId: string;
// }

// const MyButton: React.FC<MyButtonProps> = ({
//   disabled,
//   onClick,
//   label,
//   className = "",
//   ...props
// }) => (
//   <div className={disabled ? "opacity-50 cursor-not-allowed" : ""}>
//     <Button
//       onClick={disabled ? undefined : onClick}
//       label={label}
//       className={className}
//       {...props}
//     />
//   </div>
// );

// const SalesReturn: React.FC<SalesReturnProps> = ({
//   setShowCreateReturn,
//   onSuccess,
//   bills: initialBills,
// }) => {
//   const router = useRouter();
//   const [searchMethod, setSearchMethod] = useState<'billNumber' | 'mobileNumber'>('billNumber');
//   const [selectedBill, setSelectedBill] = useState<OptionType | null>(null);
//   const [mobileNumber, setMobileNumber] = useState<string>('');
//   const [allBills, setAllBills] = useState<BillingData[]>([]);
//   const [allPatients, setAllPatients] = useState<PatientData[]>([]);
//   const [originalBill, setOriginalBill] = useState<BillingData | null>(null);
//   const [patientData, setPatientData] = useState<PatientData | null>(null);
//   const [returnItem, setReturnItem] = useState<SalesReturnItemData[]>([]);
//   const [mobileBillItems, setMobileBillItems] = useState<MobileBillItem[]>([]);
//   const [showModal, setShowModal] = useState(false);
//   const [loading, setLoading] = useState(false);
//   const [showMobileLoader, setShowMobileLoader] = useState(false);
//   const [searching, setSearching] = useState(false);
//   const [inputValue, setInputValue] = useState("");
//   const selectRef = useRef<SelectInstance<OptionType>>(null);
//   const [modalMessage, setModalMessage] = useState("");
//   const [modalSecondaryMesaage, setModalSecondaryMessage] = useState("");
//   const [modalBgClass, setModalBgClass] = useState("");
//   const [modalCancelCallback, setModalCancelCallback] = useState<() => void>(() => { });
//   const [modalConfirmCallback, setModalConfirmCallback] = useState<() => Promise<void> | void>(() => { });
//   const [mobileOptions, setMobileOptions] = useState<PatientOption[]>([]);
//   const [selectedPatient, setSelectedPatient] = useState<PatientOption | null>(null);
//   const [itemSearchText, setItemSearchText] = useState("");
//   const [filteredItems, setFilteredItems] = useState<MobileBillItem[]>([]);
//   const [showItemSuggestions, setShowItemSuggestions] = useState(false);
//   const [showItemSelectionLoader, setShowItemSelectionLoader] = useState(false);

//   useEffect(() => {
//     const fetchAllBills = async () => {
//       try {
//         setSearching(true);
//         const billsWithDetails = await Promise.all(
//           initialBills.map(async (bill) => {
//             try {
//               const billDetails = await getBillingById(bill.billId);
//               return billDetails;
//             } catch (error) {
//               console.error(`Failed to fetch details for bill ${bill.billId}:`, error);
//               return null;
//             }
//           })
//         );

//         const validBills = billsWithDetails.filter(bill => bill !== null) as BillingData[];
//         setAllBills(validBills);
//       } catch (error) {
//         console.error("Failed to fetch bill details:", error);
//         toast.error("Failed to load bill data");
//       } finally {
//         setSearching(false);
//       }
//     };

//     fetchAllBills();
//   }, [initialBills]);


//   useEffect(() => {
//     const fetchPatients = async () => {
//       try {
//         const patients = await getPatient();
//         setAllPatients(patients);

//         const options = patients.map((p: PatientData) => ({
//           label: `${p.phone} - ${p.firstName} ${p.lastName}`,
//           value: p.patientId,
//           phone: p.phone.toString(),
//           firstName: p.firstName,
//           lastName: p.lastName,
//           patientId: p.patientId,
//         }));
//         setMobileOptions(options);
//       } catch (error) {
//         console.error("Failed to fetch patients:", error);
//         toast.error("Failed to load patient data");
//       }
//     };

//     fetchPatients();
//   }, []);

//   useEffect(() => {
//     if (itemSearchText.length > 0) {
//       const filtered = mobileBillItems.filter(item =>
//         item.itemName?.toLowerCase().includes(itemSearchText.toLowerCase()) ||
//         item.batchNo?.toLowerCase().includes(itemSearchText.toLowerCase())
//       );
//       setFilteredItems(filtered);
//       setShowItemSuggestions(true);
//     } else {
//       setFilteredItems([]);
//       setShowItemSuggestions(false);
//     }
//   }, [itemSearchText, mobileBillItems]);

//   const handleShowModal = (options: {
//     message: string;
//     secondaryMessage?: string;
//     bgClassName?: string;
//     onConfirmCallback: () => Promise<void> | void;
//     onCancelCallback?: () => void;
//   }) => {
//     setModalMessage(options.message);
//     setModalSecondaryMessage(options.secondaryMessage || "");
//     setModalBgClass(options.bgClassName || "");
//     setModalConfirmCallback(() => options.onConfirmCallback);
//     setModalCancelCallback(() => options.onCancelCallback || (() => { }));
//     setShowModal(true);
//   };

//   const handleModalConfirm = async () => {
//     await modalConfirmCallback();
//     setShowModal(false);
//   };

//   const handleModalCancel = async () => {
//     if (modalCancelCallback) {
//       modalCancelCallback();
//     }
//     setShowModal(false);
//   };

//   useEffect(() => {
//     const loadItemsByMobileNumber = async () => {
//       if (!mobileNumber || mobileNumber.length !== 10) {
//         setMobileBillItems([]);
//         setShowMobileLoader(false);
//         return;
//       }

//       try {
//         setShowMobileLoader(true);
//         setSearching(true);

//         // Find patients with this mobile number
//         const patientsWithMobile = allPatients.filter(
//           patient => patient.phone && patient.phone.toString() === mobileNumber
//         );

//         if (patientsWithMobile.length === 0) {
//           toast.error("No patients found with this mobile number");
//           setMobileBillItems([]);
//           setShowMobileLoader(false);
//           return;
//         }


//         const patientIds = patientsWithMobile.map(patient => patient.patientId);


//         const filteredBills = allBills.filter(bill =>
//           bill.patientId && patientIds.includes(bill.patientId)
//         );

//         if (filteredBills.length === 0) {
//           toast.info("No bills found for patients with this mobile number");
//           setMobileBillItems([]);
//           setShowMobileLoader(false);
//           return;
//         }


//         const allBilledItems: MobileBillItem[] = [];

//         for (const bill of filteredBills) {
//           const enrichedItems = await Promise.all(
//             bill.billItemDtos.map(async (item: BillingItemData) => {
//               try {
//                 const itemDetails = await getItemById(item.itemId);
//                 return {
//                   returnItemId: `temp-${Math.random().toString(36).substring(2, 9)}`,
//                   billItemId: item.billItemId,
//                   itemId: item.itemId,
//                   itemName: itemDetails.itemName,
//                   batchNo: item.batchNo,
//                   expiryDate: item.expiryDate,
//                   returnedQuantity: 0,
//                   originalPrice: item.mrpSalePricePerUnit,
//                   billedAmount: item.netTotal,
//                   gstPercentage: item.gstPercentage,
//                   cgstPercentage: item.gstPercentage / 2,
//                   sgstPercentage: item.gstPercentage / 2,
//                   discountPercentage: item.discountPercentage,
//                   refundAmount: 0,
//                   maxQuantity: item.packageQuantity,
//                   packageQuantity: item.packageQuantity,
//                   returnQuantity: 0,
//                   mrpSalePricePerUnit: item.mrpSalePricePerUnit,
//                   netTotal: 0,
//                   grossTotal: item.grossTotal,
//                   cgstAmount: 0,
//                   sgstAmount: 0,
//                   sourceBillId: bill.billId,
//                   sourceBillNumber: bill.billId1 || `Bill-${bill.billId.substring(0, 8)}`,
//                   billingDate: bill.billDateTime
//                 };
//               } catch (err) {
//                 console.error("Failed to fetch item details:", err);
//                 return {
//                   returnItemId: `temp-${Math.random().toString(36).substring(2, 9)}`,
//                   billItemId: item.billItemId,
//                   itemId: item.itemId,
//                   itemName: "Unknown Item",
//                   batchNo: item.batchNo,
//                   expiryDate: item.expiryDate,
//                   returnedQuantity: 0,
//                   originalPrice: item.mrpSalePricePerUnit,
//                   billedAmount: item.netTotal,
//                   gstPercentage: item.gstPercentage,
//                   cgstPercentage: item.gstPercentage / 2,
//                   sgstPercentage: item.gstPercentage / 2,
//                   discountPercentage: item.discountPercentage,
//                   refundAmount: 0,
//                   maxQuantity: item.packageQuantity,
//                   packageQuantity: item.packageQuantity,
//                   returnQuantity: 0,
//                   mrpSalePricePerUnit: item.mrpSalePricePerUnit,
//                   netTotal: 0,
//                   grossTotal: item.grossTotal,
//                   cgstAmount: 0,
//                   sgstAmount: 0,
//                   sourceBillId: bill.billId,
//                   sourceBillNumber: bill.billId1 || `Bill-${bill.billId.substring(0, 8)}`,
//                   billingDate: bill.billDateTime
//                 };
//               }
//             })
//           );

//           allBilledItems.push(...enrichedItems);
//         }


//         setTimeout(() => {
//           setMobileBillItems(allBilledItems);
//           setShowMobileLoader(false);
//           toast.success(`Found ${allBilledItems.length} items for this mobile number`);
//         }, 1000);

//       } catch (error) {
//         toast.error("Failed to fetch billed items by mobile number");
//         console.error("Error fetching billed items by mobile:", error);
//         setShowMobileLoader(false);
//       } finally {
//         setSearching(false);
//       }
//     };

//     const debounceTimer = setTimeout(() => {
//       loadItemsByMobileNumber();
//     }, 500);

//     return () => clearTimeout(debounceTimer);
//   }, [mobileNumber, allPatients, allBills]);

//   const fetchOriginalBill = useCallback(async (billId: string) => {
//     try {
//       setSearching(true);
//       const bill = await getBillingById(billId);

//       if (!bill) {
//         toast.error("Bill not found");
//         return;
//       }

//       const enrichedItems = await Promise.all(
//         bill.billItemDtos.map(async (item: BillingItemData) => {
//           try {
//             const itemDetails = await getItemById(item.itemId);
//             return {
//               ...item,
//               itemName: itemDetails.itemName,
//               gstPercentage: item.gstPercentage || itemDetails.gstPercentage,
//               cgstPercentage:
//                 (item.gstPercentage || itemDetails.gstPercentage) / 2,
//               sgstPercentage:
//                 (item.gstPercentage || itemDetails.gstPercentage) / 2,
//             };
//           } catch (err) {
//             console.error("Failed to fetch item details:", err);
//             return {
//               ...item,
//               itemName: "Unknown Item",
//               gstPercentage: item.gstPercentage || 0,
//               cgstPercentage: (item.gstPercentage || 0) / 2,
//               sgstPercentage: (item.gstPercentage || 0) / 2,
//             };
//           }
//         })
//       );

//       const updatedBill = {
//         ...bill,
//         billItemDtos: enrichedItems,
//       };

//       setOriginalBill(updatedBill);

//       if (bill.patientId) {
//         try {
//           const patient = await getPatientById(bill.patientId);
//           setPatientData(patient);
//         } catch (patientError) {
//           console.warn("Could not fetch patient details", patientError);
//         }
//       }

//       const initialReturnItems = updatedBill.billItemDtos.map(
//         (item: BillingItemData) => {
//           const cgstPercentage = item.gstPercentage / 2;
//           const sgstPercentage = item.gstPercentage / 2;

//           const discountedPrice =
//             item.mrpSalePricePerUnit *
//             (1 - (item.discountPercentage || 0) / 100);
//           const originalGross = item.packageQuantity * discountedPrice;
//           const cgstAmount = originalGross * (cgstPercentage / 100);
//           const sgstAmount = originalGross * (sgstPercentage / 100);
//           const originalNet = originalGross + cgstAmount + sgstAmount;

//           return {
//             returnItemId: `temp-${Math.random().toString(36).substring(2, 9)}`,
//             billItemId: item.billItemId,
//             itemId: item.itemId,
//             itemName: item.itemName,
//             batchNo: item.batchNo,
//             expiryDate: item.expiryDate,
//             returnedQuantity: 0,
//             originalPrice: item.mrpSalePricePerUnit,
//             billedAmount: originalNet,
//             gstPercentage: item.gstPercentage,
//             cgstPercentage,
//             sgstPercentage,
//             discountPercentage: item.discountPercentage,
//             refundAmount: 0,
//             maxQuantity: item.packageQuantity,
//             packageQuantity: item.packageQuantity,
//             returnQuantity: 0,
//             mrpSalePricePerUnit: discountedPrice,
//             netTotal: 0,
//             grossTotal: item.grossTotal,
//             cgstAmount: 0,
//             sgstAmount: 0,
//           };
//         }
//       );

//       setReturnItem(initialReturnItems);
//     } catch (error) {
//       toast.error("Failed to fetch bill details");
//       console.error("Error fetching bill details:", error);
//     } finally {
//       setSearching(false);
//     }
//   }, []);


//   const handleMobileItemClick = useCallback(async (item: MobileBillItem) => {
//     setShowItemSelectionLoader(true);
//     setSearchMethod('billNumber');
//     setSelectedBill({
//       label: item.sourceBillNumber,
//       value: item.sourceBillId,
//     });

//     const startTime = Date.now();
//     const minDisplayTime = 1500;

//     try {
//       await fetchOriginalBill(item.sourceBillId);
//     } finally {
//       const elapsedTime = Date.now() - startTime;
//       const remainingTime = Math.max(0, minDisplayTime - elapsedTime);

//       setTimeout(() => {
//         setShowItemSelectionLoader(false);
//       }, remainingTime);
//     }


//     setReturnItem(prev => prev.map(returnItem => {
//       if (returnItem.itemId === item.itemId && returnItem.batchNo === item.batchNo) {
//         return {
//           ...returnItem,
//           returnedQuantity: item.packageQuantity,
//         };
//       }
//       return returnItem;
//     }));
//   }, [fetchOriginalBill]);

//   useEffect(() => {
//     if (selectedBill?.value && searchMethod === 'billNumber') {
//       fetchOriginalBill(selectedBill.value);
//     } else {
//       setOriginalBill(null);
//       setPatientData(null);
//       setReturnItem([]);
//     }
//   }, [selectedBill?.value, searchMethod, fetchOriginalBill]);

//   const handleInputChange = (newValue: string) => {
//     setInputValue(newValue);
//   };

//   const handleBillChange = (selected: OptionType | null) => {
//     setSelectedBill(selected);
//     if (!selected) {
//       setInputValue("");
//     }
//   };

//   const handleReturnItemChange = (
//     index: number,
//     field: keyof SalesReturnItemData,
//     value: string | number
//   ) => {
//     const updatedItems = [...returnItem];
//     const item = { ...updatedItems[index], [field]: value };

//     if (field === "returnedQuantity" || field === "returnQuantity") {
//       const quantity = Number(value);
//       const discountedPrice = item.mrpSalePricePerUnit;
//       const grossAmount = quantity * discountedPrice;

//       const cgstAmount = grossAmount * ((item.cgstPercentage || 0) / 100);
//       const sgstAmount = grossAmount * ((item.sgstPercentage || 0) / 100);
//       const netAmount = grossAmount + cgstAmount + sgstAmount;

//       item.refundAmount = netAmount;
//       item.grossAmount = grossAmount;
//       item.netTotal = netAmount;
//       item.returnQuantity = quantity;
//       item.cgstAmount = cgstAmount;
//       item.sgstAmount = sgstAmount;
//     }

//     updatedItems[index] = item;
//     setReturnItem(updatedItems);
//   };

//   const calculateTotals = () => {
//     return returnItem.reduce(
//       (acc, item) => {
//         return {
//           subTotal: acc.subTotal + (item.grossAmount || 0),
//           totalCgst: acc.totalCgst + (item.cgstAmount || 0),
//           totalSgst: acc.totalSgst + (item.sgstAmount || 0),
//           grandTotal: acc.grandTotal + (item.netTotal || 0),
//         };
//       },
//       { subTotal: 0, totalCgst: 0, totalSgst: 0, grandTotal: 0 }
//     );
//   };

//   const validateForm = () => {
//     if (!originalBill) {
//       toast.error("Please select a valid bill first");
//       return false;
//     }

//     const hasReturnItem = returnItem.some((item) => item.returnQuantity > 0);

//     if (!hasReturnItem) {
//       toast.error("Please specify return quantities for at least one item");
//       return false;
//     }

//     return true;
//   };

//   const handleSubmit = async () => {
//     if (!validateForm() || !originalBill) return;

//     const totals = calculateTotals();

//     const salesReturnData: SalesReturnData = {
//       originalBillId: originalBill.billId,
//       billId1: originalBill.billId1 || "",
//       patientId: originalBill.patientId,
//       patientName: originalBill.patientName || "",
//       billReturnDateTime: new Date(),
//       subTotal: totals.subTotal,
//       totalCgst: totals.totalCgst,
//       totalSgst: totals.totalSgst,
//       grandTotal: totals.grandTotal,
//       totalDiscount: originalBill.totalDiscount,
//       pharmacyId: originalBill.pharmacyId,
//       billReturnItemDtos: returnItem
//         .filter((item) => (item.returnedQuantity || 0) > 0)
//         .map((item) => ({
//           itemId: item.itemId,
//           batchNo: item.batchNo,
//           expiryDate: item.expiryDate,
//           packageQuantity: item.packageQuantity,
//           returnQuantity: item.returnQuantity || item.returnedQuantity || 0,
//           mrpSalePricePerUnit: item.mrpSalePricePerUnit,
//           gstPercentage:
//             item.gstPercentage || item.cgstPercentage + item.sgstPercentage,
//           cgstPercentage: item.cgstPercentage,
//           sgstPercentage: item.sgstPercentage,
//           discountPercentage: item.discountPercentage || 0,
//           netTotal: item.netTotal || 0,
//           grossTotal: item.grossTotal || 0,
//           cgstAmount: item.cgstAmount || 0,
//           sgstAmount: item.sgstAmount || 0,
//         })),
//     };

//     try {
//       setLoading(true);
//       const result = await createSalesReturn(salesReturnData);
//       if (result) {
//         toast.success("Return created successfully");
//         onSuccess();
//         setShowCreateReturn(false);
//         router.push("/dashboard/salesReturn");
//       }
//     } catch (error: unknown) {
//       console.error("Error creating return:", error);
//       toast.error(
//         error instanceof Error ? error.message : "Failed to create return"
//       );
//     } finally {
//       setLoading(false);
//     }
//   };

//   const returnColumns = [
//     {
//       header: "Item Name",
//       accessor: (row: SalesReturnItemData) => row.itemName,
//     },
//     {
//       header: "Batch No.",
//       accessor: (row: SalesReturnItemData) => row.batchNo,
//     },
//     {
//       header: "Expiry Date",
//       accessor: (row: SalesReturnItemData) =>
//         row.expiryDate
//           ? new Date(row.expiryDate).toLocaleDateString("en-GB")
//           : "N/A",
//     },
//     {
//       header: "Billed Qty.",
//       accessor: (row: SalesReturnItemData) => row.packageQuantity,
//     },
//     {
//       header: "Return Qty.",
//       accessor: (row: SalesReturnItemData, index: number) => (
//         <input
//           type="number"
//           min="0"
//           max={row.packageQuantity ?? undefined}
//           value={row.returnedQuantity}
//           onChange={(e) =>
//             handleReturnItemChange(
//               index,
//               "returnedQuantity",
//               Math.min(Number(e.target.value), row.packageQuantity ?? Infinity)
//             )
//           }
//           className="w-20 border border-gray-300 rounded px-2 py-1"
//         />
//       ),
//     },
//     {
//       header: "Billed Amount",
//       accessor: (row: SalesReturnItemData) =>
//         row.billedAmount?.toFixed(2) || "0.00",
//     },
//     {
//       header: "Refund Amount",
//       accessor: (row: SalesReturnItemData) =>
//         `${row.netTotal?.toFixed(2) || "0.00"}`,
//     },
//   ];

//   const formatPaymentStatus = (status: string) => {
//     return status
//       ? status.charAt(0).toUpperCase() + status.slice(1).toLowerCase()
//       : "N/A";
//   };

//   const handleManualBillEntry = (e: React.KeyboardEvent) => {
//     if (e.key === "Enter") {
//       const matchedBill = initialBills.find(
//         (bill) => bill.billNumber.toLowerCase() === inputValue.toLowerCase()
//       );
//       if (matchedBill) {
//         setSelectedBill({
//           label: matchedBill.billNumber,
//           value: matchedBill.billId,
//         });
//       } else {
//         toast.error("No matching bill found");
//         setSelectedBill(null);
//       }
//     }
//   };

//   const formatPatientType = (type: string) => {
//     return type === "IP"
//       ? "In-Patient"
//       : type === "OP"
//         ? "Out-Patient"
//         : type || "N/A";
//   };

//   return (
//     <main className="space-y-6 p-4">
//       {showModal && (
//         <Modal
//           message={modalMessage}
//           secondaryMessage={modalSecondaryMesaage}
//           bgClassName={modalBgClass}
//           onConfirm={handleModalConfirm}
//           onCancel={handleModalCancel}
//         />
//       )}
//       <div className="flex justify-between items-center">
//         <h1 className="justify-start text-darkPurple text-3xl font-medium leading-10">
//           Sales Return
//         </h1>
//         <div>
//           <Button
//             onClick={() => setShowCreateReturn(false)}
//             label="Sales Return List"
//             value=""
//             className="w-48 bg-darkPurple text-white h-11"
//             icon={<ClipboardList size={15} />}
//           />
//         </div>
//       </div>

//       {/* Search Method Selection */}
//       <div className="bg-white rounded-lg shadow p-6">
//         <div className="mb-4">
//           <label className="block text-sm font-medium text-gray-700 mb-2">Search By</label>
//           <div className="flex space-x-4">
//             <label className="inline-flex items-center">
//               <input
//                 type="radio"
//                 value="billNumber"
//                 checked={searchMethod === 'billNumber'}
//                 onChange={(e) => {
//                   setSearchMethod(e.target.value as 'billNumber' | 'mobileNumber');
//                   setSelectedBill(null);
//                   setMobileNumber('');
//                   setMobileBillItems([]);
//                   setReturnItem([]);
//                   setItemSearchText("");
//                   setFilteredItems([]);
//                 }}
//                 className="form-radio cursor-pointer accent-[var(--DARK-PURPLE)]"
//               />
//               <span className="ml-2">Bill Number</span>
//             </label>
//             <label className="inline-flex items-center">
//               <input
//                 type="radio"
//                 value="mobileNumber"
//                 checked={searchMethod === 'mobileNumber'}
//                 onChange={(e) => {
//                   setSearchMethod(e.target.value as 'billNumber' | 'mobileNumber');
//                   setSelectedBill(null);
//                   setInputValue('');
//                   setReturnItem([]);
//                   setItemSearchText("");
//                   setFilteredItems([]);
//                 }}
//                 className="form-radio cursor-pointer accent-[var(--DARK-PURPLE)]"
//               />
//               <span className="ml-2">Mobile Number</span>
//             </label>
//           </div>
//         </div>

//         {searchMethod === 'billNumber' ? (
//           <div className="flex w-[351.67px] h-[96px] py-6 flex-col justify-center items-start relative">
//             <label className="block text-sm font-medium text-gray-700 mb-1">
//               Bill Number *
//             </label>
//             <Select
//               ref={selectRef}
//               options={initialBills.map((bill) => ({
//                 label: bill.billNumber,
//                 value: bill.billId,
//               }))}
//               value={selectedBill}
//               onChange={handleBillChange}
//               onInputChange={handleInputChange}
//               inputValue={inputValue}
//               className="w-full"
//               placeholder="Enter Bill Number"
//               isLoading={searching}
//               isClearable={true}
//               onKeyDown={handleManualBillEntry}
//               filterOption={(option, rawInput) => {
//                 return option.label
//                   .toLowerCase()
//                   .includes(rawInput.toLowerCase());
//               }}
//               styles={{
//                 control: (base, state) => ({
//                   ...base,
//                   borderColor: state.isFocused ? "#442060" : base.borderColor,
//                   boxShadow: state.isFocused
//                     ? "0 0 0 1px #421D5E"
//                     : base.boxShadow,
//                   "&:hover": {
//                     borderColor: state.isFocused ? "#442060" : base.borderColor,
//                   },
//                 }),
//                 option: (base, state) => ({
//                   ...base,
//                   backgroundColor: state.isSelected
//                     ? "#442060"
//                     : state.isFocused
//                       ? "#F3E8FF"
//                       : base.backgroundColor,
//                   color: state.isSelected ? "white" : base.color,
//                   "&:active": {
//                     backgroundColor: "#E1C4F8",
//                   },
//                 }),
//                 menu: (base) => ({
//                   ...base,
//                   zIndex: 9999,
//                 }),
//                 clearIndicator: (base) => ({
//                   ...base,
//                   color: '#442060',
//                   ':hover': {
//                     color: '#6D28D9',
//                   },
//                 }),
//               }}
//               theme={(theme) => ({
//                 ...theme,
//                 colors: {
//                   ...theme.colors,
//                   primary: "#442060",
//                   primary25: "#F3E8FF",
//                   primary50: "#E1C4F8",
//                 },
//               })}
//             />
//           </div>
//         ) : (
//           <div className="space-y-4 w-full">
//             <div className="flex flex-col md:flex-row gap-6 w-full items-start">

//               <div className="w-[351.67px] h-[96px] py-6 flex flex-col justify-center items-start relative">
//                 <label className="block text-sm font-medium text-gray-700 mb-1">
//                   Mobile Number *
//                 </label>
//                 <div className="relative w-full">
//                   <Select
//                     value={selectedPatient}
//                     onChange={(selected) => {
//                       setSelectedPatient(selected);
//                       if (selected) {
//                         setMobileNumber(selected.phone);
//                       } else {
//                         setMobileNumber('');
//                         setMobileBillItems([]);
//                         setItemSearchText('');
//                         setFilteredItems([]);
//                       }
//                     }}
//                     options={mobileOptions}
//                     className="w-full"
//                     classNamePrefix="select"
//                     placeholder="Select or type mobile number"
//                     isClearable={true}
//                     noOptionsMessage={() => <div className="p-3">No options</div>}
//                     filterOption={(option, inputValue) => {
//                       if (!inputValue) return true;
//                       return option.label.toLowerCase().includes(inputValue.toLowerCase()) ||
//                         option.data.phone.includes(inputValue);
//                     }}
//                     styles={{
//                       control: (base, state) => ({
//                         ...base,
//                         borderColor: state.isFocused ? "#442060" : base.borderColor,
//                         boxShadow: state.isFocused
//                           ? "0 0 0 1px #421D5E"
//                           : base.boxShadow,
//                         "&:hover": {
//                           borderColor: state.isFocused ? "#442060" : base.borderColor,
//                         },
//                         height: '49px',
//                       }),
//                       option: (base, state) => ({
//                         ...base,
//                         backgroundColor: state.isSelected
//                           ? "#442060"
//                           : state.isFocused
//                             ? "#F3E8FF"
//                             : base.backgroundColor,
//                         color: state.isSelected ? "white" : base.color,
//                         "&:active": {
//                           backgroundColor: "#E1C4F8",
//                         },
//                       }),
//                       menu: (base) => ({
//                         ...base,
//                         zIndex: 100,
//                       }),
//                       clearIndicator: (base) => ({
//                         ...base,
//                         color: '#442060',
//                         ':hover': {
//                           color: '#6D28D9',
//                         },
//                       }),
//                     }}
//                     theme={(theme) => ({
//                       ...theme,
//                       colors: {
//                         ...theme.colors,
//                         primary: "#442060",
//                         primary25: "#F3E8FF",
//                         primary50: "#E1C4F8",
//                       },
//                     })}
//                   />
//                 </div>
//               </div>
//               {!showMobileLoader && mobileBillItems.length > 0 && (
//                 <div className="w-[351.67px] h-[96px] py-6 flex flex-col justify-center items-start relative">
//                   <label className="block text-sm font-medium text-gray-700 mb-1">
//                     Search Items For This Mobile Number
//                   </label>
//                   <div className="relative w-full">
//                     <input
//                       type="text"
//                       value={itemSearchText}
//                       onChange={(e) => setItemSearchText(e.target.value)}
//                       placeholder="Search items..."
//                       className="w-full p-2 pl-3 pr-10 border border-gray-300 rounded-md h-[49px]"
//                       onFocus={() => setShowItemSuggestions(true)}
//                       onBlur={() => setTimeout(() => setShowItemSuggestions(false), 200)}
//                     />
//                     <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
//                       <ChevronDown className="h-5 w-5 text-gray-400" />
//                     </div>
//                     {showItemSuggestions && (
//                       <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-y-auto">
//                         {itemSearchText.length === 0 ? (
//                           <div className="p-3 text-gray-500">No options</div>
//                         ) : filteredItems.length > 0 ? (
//                           <div className="max-h-35 overflow-y-auto">
//                             {filteredItems.map((item) => (
//                               <div
//                                 key={item.returnItemId}
//                                 className="p-2 bg-white cursor-pointer hover:bg-[#4B0082] group"
//                                 onMouseDown={(e) => {
//                                   e.preventDefault();
//                                   handleMobileItemClick(item);
//                                   setItemSearchText("");
//                                   setShowItemSuggestions(false);
//                                 }}
//                               >
//                                 {/* Row 1: Item Name - Batch No. */}
//                                 <div className="font-bold text-black group-hover:text-white">
//                                   {item.itemName} - {item.batchNo}
//                                 </div>

//                                 {/* Row 2: Qty and Bill Date */}
//                                 <div className="text-sm text-gray-500 mt-1">
//                                   Qty: {item.packageQuantity} | Bill Date:{" "}
//                                   {new Date(item.billingDate).toLocaleDateString()}
//                                 </div>
//                               </div>
//                             ))}
//                           </div>
//                         ) : (
//                           <div className="p-3 text-gray-500">
//                             No items found matching &quot;{itemSearchText}&quot;
//                           </div>
//                         )}
//                       </div>
//                     )}
//                   </div>
//                 </div>
//               )}
//             </div>
//             {/* Loader */}
//             {showMobileLoader && (
//               <div className="flex justify-center items-center h-64">
//                 <Loader type="spinner" size="md" text="Loading..." fullScreen={false} />
//               </div>
//             )}
//           </div>
//         )}
//       </div>

//       {/* Item Selection Loader */}
//       {showItemSelectionLoader && (
//         <div className="fixed inset-0 flex items-center justify-center bg-white bg-opacity-80 z-50">
//           <div className="text-center">
//             <Loader type="spinner" size="md" text="Loading bill details..." fullScreen={false} />
//           </div>
//         </div>
//       )}

//       {searchMethod === 'billNumber' && originalBill && (
//         <>
//           <div className="bg-white rounded-lg p-6 w-full border border-gray-200">
//             <div className="flex items-center mb-6">
//               <h2 className="text-xl font-bold text-gray-800">Patient Details</h2>
//             </div>
//             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
//               <div>
//                 <label className="block text-sm font-medium text-gray-500 mb-1">Patient Name</label>
//                 <div className="text-base text-gray-800 p-3 border border-gray-200 rounded-md bg-gray-50/50">
//                   {patientData?.firstName
//                     ? `${patientData.firstName} ${patientData.lastName || ""}`.trim()
//                     : originalBill.patientName || "--"}
//                 </div>
//               </div>
//               <div>
//                 <label className="block text-sm font-medium text-gray-500 mb-1">Bill Date</label>
//                 <div className="text-base text-gray-800 p-3 border border-gray-200 rounded-md bg-gray-50/50">
//                   {originalBill?.billDateTime
//                     ? new Date(originalBill.billDateTime).toLocaleDateString("en-GB", {
//                       day: "2-digit",
//                       month: "2-digit",
//                       year: "numeric",
//                     })
//                     : "--"}
//                 </div>
//               </div>
//               <div>
//                 <label className="block text-sm font-medium text-gray-500 mb-1">Mobile Number</label>
//                 <div className="text-base text-gray-800 p-3 border border-gray-200 rounded-md bg-gray-50/50">
//                   {patientData?.phone || originalBill.phone || "--"}
//                 </div>
//               </div>
//               <div>
//                 <label className="block text-sm font-medium text-gray-500 mb-1">Patient ID</label>
//                 <div className="text-base text-gray-800 p-3 border border-gray-200 rounded-md bg-gray-50/50 truncate">
//                   {patientData?.patientId1 || originalBill?.patientId1 || "--"}
//                 </div>
//               </div>
//               <div>
//                 <label className="block text-sm font-medium text-gray-500 mb-1">Patient Type</label>
//                 <div className="text-base text-gray-800 p-3 border border-gray-200 rounded-md bg-gray-50/50">
//                   {formatPatientType(originalBill.patientType) || "--"}
//                 </div>
//               </div>
//               <div>
//                 <label className="block text-sm font-medium text-gray-500 mb-1">Payment Status</label>
//                 <div className="text-base p-3 border border-gray-200 rounded-md bg-gray-50/50">
//                   <span className={
//                     originalBill.paymentStatus?.toLowerCase() === "paid"
//                       ? "text-green-600"
//                       : ["pending", "not paid"].includes(
//                         originalBill.paymentStatus?.toLowerCase()
//                       )
//                         ? "text-amber-500"
//                         : "text-gray-800"
//                   }>
//                     {formatPaymentStatus(originalBill.paymentStatus) || "--"}
//                   </span>
//                 </div>
//               </div>
//             </div>
//           </div>

//           <div className="bg-white rounded-lg shadow p-6 w-full">
//             <h2 className="text-xl font-bold text-gray-800">
//               Billed Items
//             </h2>
//             <Table
//               data={returnItem}
//               columns={returnColumns}
//               noDataMessage="No items available for return"
//             />
//           </div>

//           <div className="bg-white rounded-lg shadow p-6 w-full">
//             <div className="flex flex-col space-y-4">
//               <div className="flex justify-between w-full">
//                 <div className="flex items-center flex-1 gap-x-8">
//                   <div className="w-48"></div>
//                   <div className="w-60"></div>
//                 </div>
//                 <div className="flex items-center flex-1 justify-end gap-x-8">
//                   <span className="w-48 text-base font-medium text-[#433E3F]">
//                     Subtotal:
//                   </span>
//                   <span className="w-60 text-base text-[#0A0A0B] text-right">
//                     {calculateTotals().subTotal.toFixed(2)}
//                   </span>
//                 </div>
//               </div>

//               <div className="flex justify-between w-full">
//                 <div className="flex items-center flex-1 gap-x-8">
//                   <div className="w-48"></div>
//                   <div className="w-60"></div>
//                 </div>
//                 <div className="flex items-center flex-1 justify-end gap-x-8">
//                   <span className="w-48 text-base font-medium text-[#433E3F]">
//                     Total CGST:
//                   </span>
//                   <span className="w-60 text-base text-[#0A0A0B] text-right">
//                     {calculateTotals().totalCgst.toFixed(2)}
//                   </span>
//                 </div>
//               </div>

//               <div className="flex justify-between w-full">
//                 <div className="flex items-center flex-1 gap-x-8">
//                   <div className="w-48"></div>
//                   <div className="w-60"></div>
//                 </div>
//                 <div className="flex items-center flex-1 justify-end gap-x-8">
//                   <span className="w-48 text-base font-medium text-[#433E3F]">
//                     Total SGST:
//                   </span>
//                   <span className="w-60 text-base text-[#0A0A0B] text-right">
//                     {calculateTotals().totalSgst.toFixed(2)}
//                   </span>
//                 </div>
//               </div>

//               <div className="flex justify-between w-full">
//                 <div className="flex items-center flex-1 gap-x-8">
//                   <div className="w-48"></div>
//                   <div className="w-60"></div>
//                 </div>
//                 <div className="flex items-center flex-1 justify-end gap-x-8 bg-[#F3E8FF] rounded-lg p-3">
//                   <span className="w-48 text-xl font-medium text-[#442060]">
//                     Grand Total
//                   </span>
//                   <span className="w-60 text-xl font-medium text-[#442060] text-right">
//                     {calculateTotals().grandTotal.toFixed(2)}
//                   </span>
//                 </div>
//               </div>
//             </div>
//           </div>

//           <div className="flex justify-end">
//             <MyButton
//               onClick={() =>
//                 handleShowModal({
//                   message:
//                     "Are you sure you want to confirm payment? once confirmed, cannot be edited.",
//                   secondaryMessage: "Confirm Payment",
//                   bgClassName: "bg-darkPurple",
//                   onConfirmCallback: handleSubmit,
//                 })
//               }
//               label={loading ? "Processing..." : "Save"}
//               disabled={loading}
//               className="w-28 bg-darkPurple text-white h-11"
//             />
//           </div>
//         </>
//       )}
//     </main>
//   );
// };

// export default SalesReturn;