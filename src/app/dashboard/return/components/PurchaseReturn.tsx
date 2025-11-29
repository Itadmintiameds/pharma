"use client";

import Button from "@/app/components/common/Button";
import ItemDropdown, { OptionType } from "@/app/components/common/ItemDropdown";
import Modal from "@/app/components/common/Modal";
import {
  handleNumericChange,
  restrictInvalidNumberKeys,
} from "@/app/components/common/RestrictedVal";
import Table from "@/app/components/common/Table";
import { getPurchase } from "@/app/services/PurchaseEntryService";
import { createPurchaseReturn } from "@/app/services/PurchaseReturnService";
import { getSupplierById } from "@/app/services/SupplierService";
import { PurchaseEntryData } from "@/app/types/PurchaseEntry";
import {
  PurchaseReturnData,
  PurchaseReturnItem,
} from "@/app/types/PurchaseReturnData";
import { ClipboardList } from "lucide-react";
import React, { useEffect, useRef, useState } from "react";
import { toast } from "react-toastify";
import AsyncSelect from "react-select/async";
import { getPharmacy } from "@/app/services/PharmacyService";
import { PharmacyData } from "@/app/types/PharmacyData";
import { purchaseReturnSchema } from "@/app/schema/PurchaseReturnSchema";
import { ZodError, ZodIssue } from "zod";

// ADDED imports for react-select + dropdown styles
import Select, { components, SingleValue } from "react-select";
import { dropdown } from "@/app/components/common/Dropdown";

// ADDED delete icon import as requested
import { MdDelete } from "react-icons/md";
import AddItemRow1 from "@/app/components/common/AddItemRow1";

interface PurchaseReturnProps {
  setShowPurchaseReturn: (value: boolean) => void;
}
const PurchaseReturn: React.FC<PurchaseReturnProps> = ({
  setShowPurchaseReturn,
}) => {
  const handlePurchaseReturnList = () => {
    setShowPurchaseReturn(false);
  };

  const [modalConfirmCallback, setModalConfirmCallback] = useState<
    () => Promise<void> | void
  >(() => { });
  const [showModal, setShowModal] = useState(false);
  const [modalMessage, setModalMessage] = useState("");
  const [modalSecondaryMessage, setModalSecondaryMessage] = useState("");
  const [modalBgClass, setModalBgClass] = useState("");
  const [, setPharmacies] = useState<PharmacyData[]>([]);

  interface ModalOptions {
    message: string;
    secondaryMessage?: string;
    bgClassName?: string;
    onConfirmCallback: () => Promise<void> | void;
  }

  const [formData, setFormData] = useState<PurchaseReturnData>({
    returnId: "",
    pharmacyId: "",
    pharmacyName: "",
    supplierId: "",
    supplierName: "",
    returnDate: new Date(),
    totalAmount: 0,
    totalGst: 0,
    returnAmount: 0,
    purchaseBillNo: "",
    grnno: "",
    purchaseReturnItemDtos: [
      {
        itemId: "",
        itemName: "",
        batchNo: "",
        returnQuantity: 0,
        availableQuantity: 0,
        gstPercentage: 0,
        purchasePrice: 0,
        returnType: "Store Credit Returns",
        discrepancyIn: "",
        discrepancy: "",
        invId: "",
      },
    ],
  });

  // Return type options (matches your options)
  type ReturnOption = { value: string; label: string };
  const returnOptions: ReturnOption[] = [
    { value: "Exchange product", label: "Exchange product" },
    { value: "Refund", label: "Refund" },
    { value: "Store Credit Returns", label: "Store Credit Returns" },
  ];

  const handleDeleteRow = (index: number) => {
    if (formData.purchaseReturnItemDtos.length === 1) {
      toast.error("Cannot delete the last row", {
        position: "top-right",
        autoClose: 3000,
      });
      return;
    }

    handleShowModal({
      message:
        "Are you sure you want to delete this item? This action cannot be undone",
      secondaryMessage: "Confirm Deletion",
      bgClassName: "bg-darkRed",
      onConfirmCallback: () => {
        setFormData((prev) => ({
          ...prev,
          purchaseReturnItemDtos: prev.purchaseReturnItemDtos.filter(
            (_, i) => i !== index
          ),
        }));
      },
    });
  };

  const columns = (rowIndex: number) => [
    {
      header: "Discrepancy In",
      accessor: (item: PurchaseReturnItem) => (
        <select
          name={`discrepancyIn-${rowIndex}`}
          value={item.discrepancyIn || ""}
          onChange={handleInputChange}
          className="w-40 h-10 px-2 py-1 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-0 focus:border-purple-900"
        >
          <option value="">Select</option>
          <option value="Item Name">Item Name</option>
          <option value="Batch">Batch</option>
          <option value="Quantity">Quantity</option>
          <option value="Expiry Date">Expiry Date</option>
          <option value="Price">Price</option>
        </select>
      ),
    },
    {
      header: "Discrepancy Details",
      accessor: (item: PurchaseReturnItem) => (
        <input
          type="text"
          name={`discrepancy-${rowIndex}`}
          value={item.discrepancy}
          onChange={handleInputChange}
          className="w-72 h-10 px-2 py-1 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-0 focus:border-purple-900"
        />
      ),
    },
    {
      header: "Action",
      accessor: () => (
        // REPLACED 3-dots menu with direct delete icon as requested.
        <div className="relative">
          <MdDelete
            size={18}
            className="cursor-pointer"
            style={{ color: "#FF0000" }}
            onClick={() => handleDeleteRow(rowIndex)}
            aria-label="Delete row"
            title="Delete"
          />
        </div>
      ),
    },
  ];

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    const parts = name.split("-");

    if (parts.length === 2) {
      const field = parts[0] as keyof PurchaseReturnItem;
      const idx = Number(parts[1]);

      let showToast = false; // flag for toast message

      setFormData((prev) => {
        const updatedItems = [...prev.purchaseReturnItemDtos];
        const currentItem = updatedItems[idx];

        // 🔍 Validation for returnQuantity > availableQuantity
        if (field === "returnQuantity") {
          const newQty = Number(value) || 0;
          const available = currentItem.availableQuantity ?? 0;

          if (newQty > available) {
            showToast = true; // set flag
            return prev; // ❌ skip state update
          }
        }

        // ✅ Normal update
        updatedItems[idx] = {
          ...currentItem,
          [field]:
            field === "returnQuantity" ||
              field === "purchasePrice" ||
              field === "gstPercentage"
              ? Number(value)
              : value,
        };

        let totalAmount = 0;
        let totalGst = 0;

        updatedItems.forEach((item) => {
          const qty = Number(item.returnQuantity) || 0;
          const price = Number(item.purchasePrice) || 0;
          const gst = Number(item.gstPercentage) || 0;
          const itemTotal = qty * price;
          const itemGstAmount = (itemTotal * gst) / 100;

          totalAmount += itemTotal;
          totalGst += itemGstAmount;
        });

        const grandTotal = totalAmount + totalGst;

        return {
          ...prev,
          purchaseReturnItemDtos: updatedItems,
          totalAmount: parseFloat(totalAmount.toFixed(2)),
          totalGst: parseFloat(totalGst.toFixed(2)),
          returnAmount: parseFloat(grandTotal.toFixed(2)),
        };
      });

      // ✅ trigger toast AFTER state update
      if (showToast) {
        toast.error("Return quantity cannot exceed available quantity!");
      }
    } else {
      const field = name as keyof PurchaseReturnData;
      const newValue = field === "returnDate" ? new Date(value) : value;

      setFormData((prev) => ({
        ...prev,
        [field]: newValue,
      }));
    }
  };

  const handleShowModal = (options: ModalOptions) => {
    setModalMessage(options.message);
    setModalSecondaryMessage(options.secondaryMessage || "");
    setModalBgClass(options.bgClassName || "");
    setModalConfirmCallback(() => options.onConfirmCallback);
    setShowModal(true);
  };

  const handleModalCancel = () => {
    setShowModal(false);
  };

  const handleModalConfirm = async () => {
    await modalConfirmCallback();
    setShowModal(false);
  };

  const addPurchaseReturn = () => {
    try {
      purchaseReturnSchema.parse({
        purchaseReturnItemDtos: formData.purchaseReturnItemDtos,
      });
    } catch (err) {
      if (err instanceof ZodError) {
        err.errors.forEach((e: ZodIssue) => {
          toast.error(e.message, {
            position: "top-right",
            autoClose: 2000,
            pauseOnHover: false,
          });
        });
      }
      return;
    }

    const firstItem = formData.purchaseReturnItemDtos[0] || {};

    console.log(
      "🔍 FINAL CHECK - All items with invId:",
      formData.purchaseReturnItemDtos.map((item) => ({
        itemName: item.itemName,
        invId: item.invId,
        purchaseBillNo: item.purchaseBillNo,
      }))
    );

    const purchaseReturnData: PurchaseReturnData = {
      returnId: formData.returnId,
      pharmacyId: formData.pharmacyId,
      pharmacyName: formData.pharmacyName,
      supplierId: firstItem.supplierId || "",
      supplierName:
        (firstItem.supplierId &&
          firstItem.purchaseBillOptions?.find(
            (opt) => opt.supplierId === firstItem.supplierId
          )?.supplierName) ||
        "",
      returnDate: new Date(formData.returnDate),
      totalAmount: formData.totalAmount,
      totalGst: formData.totalGst,
      returnAmount: formData.returnAmount,
      purchaseBillNo: firstItem.purchaseBillNo || "",
      grnno: formData.grnno,
      purchaseReturnItemDtos: formData.purchaseReturnItemDtos.map((item) => ({
        itemId: item.itemId,
        itemName: item.itemName,
        batchNo: item.batchNo,
        returnQuantity: item.returnQuantity,
        availableQuantity: item.availableQuantity,
        purchasePrice: item.purchasePrice,
        returnType: item.returnType,
        discrepancyIn: item.discrepancyIn,
        discrepancy: item.discrepancy,
        invId: item.invId,
      })),
    };

    handleShowModal({
      message: "Are you sure you want to confirm the Return?",
      secondaryMessage: "Confirm Purchase Return",
      bgClassName: "bg-darkPurple",
      onConfirmCallback: async () => {
        try {
          await createPurchaseReturn(purchaseReturnData);

          setFormData({
            returnId: "",
            pharmacyId: "",
            pharmacyName: "",
            supplierId: "",
            supplierName: "",
            returnDate: new Date(),
            totalAmount: 0,
            totalGst: 0,
            returnAmount: 0,
            purchaseBillNo: "",
            grnno: "",
            purchaseReturnItemDtos: [],
          });

          window.location.reload();
        } catch (error) {
          console.error("Failed to submit purchase return:", error);
          toast.error("Failed to submit purchase return. Please try again.");
        }
      },
    });
  };

  const handleItemDropdownChange = async (
    selected: OptionType | null,
    idx: number
  ) => {
    if (!selected) return;

    try {
      const purchaseResult = await getPurchase();
      if (purchaseResult.status !== "success") {
        throw new Error("Failed to fetch purchase data");
      }

      const allBills: PurchaseEntryData[] = purchaseResult.data;

      const matchingBills = allBills.filter((bill) =>
        bill.stockItemDtos.some(
          (item) =>
            item.itemId === selected.itemId && item.batchNo === selected.batchNo
        )
      );

      const uniqueSupplierIds = [
        ...new Set(
          matchingBills.map((bill) => bill.supplierId).filter(Boolean)
        ),
      ];

      const supplierMap: Record<string, string> = {};

      await Promise.all(
        uniqueSupplierIds.map(async (supplierId) => {
          try {
            const supplierData = await getSupplierById(supplierId);
            supplierMap[supplierId] =
              supplierData?.supplierName ?? "Unknown Supplier";
          } catch (err) {
            console.error(`Error fetching supplier ${supplierId}:`, err);
            supplierMap[supplierId] = "Unknown Supplier";
          }
        })
      );

      const billNumbers = matchingBills.map((bill) => {
        const supplierName = bill.supplierId
          ? supplierMap[bill.supplierId]
          : "Unknown Supplier";

        // Try multiple possible field names for invoice ID
        const billInvId = bill.invId;

        return {
          label: `${bill.purchaseBillNo} - ${supplierName}`,
          value: bill.purchaseBillNo,
          supplierId: bill.supplierId,
          supplierName,
          billOnlyLabel: bill.purchaseBillNo,
          invId: billInvId,
        };
      });

      let purchasePrice = 0;
      let gstPercentage = 0;
      for (const bill of matchingBills) {
        const matchedItem = bill.stockItemDtos.find(
          (item) =>
            item.itemId === selected.itemId && item.batchNo === selected.batchNo
        );
        if (matchedItem?.purchasePrice) {
          purchasePrice = matchedItem.purchasePrice;
          gstPercentage = matchedItem.gstPercentage ?? 0;
          break;
        }
      }

      // Get the first matching bill's invId as default
      const firstBill = matchingBills.length > 0 ? matchingBills[0] : null;
      const firstBillInvId = firstBill ? firstBill.invId : "";

      setFormData((prev) => {
        const updatedItems = [...prev.purchaseReturnItemDtos];

        // <--- FIX: use updatedItems consistently (was using `updated` causing the error)
        updatedItems[idx] = {
          ...updatedItems[idx],
          itemId: selected.itemId ?? "",
          itemName: selected.label,
          batchNo: selected.batchNo ?? "",
          selectedItem: selected,
          purchaseBillNo: "",
          purchaseBillOptions: billNumbers,
          purchasePrice,
          gstPercentage,
          availableQuantity: selected?.packageQty ?? 0,
          invId: firstBillInvId,
        };

        return {
          ...prev,
          purchaseReturnItemDtos: updatedItems,
        };
      });
    } catch (error) {
      console.error("Error loading bill data:", error);
    }
  };

  const addNewRow = () => {
    setFormData((prev) => {
      const newItem: PurchaseReturnItem = {
        itemId: "",
        itemName: "",
        batchNo: "",
        selectedItem: null,
        purchaseBillNo: "",
        supplierId: "",
        purchaseBillOptions: [],
        purchasePrice: 0,
        availableQuantity: 0,
        returnType: "",
        returnQuantity: 0,
        discrepancy: "",
        discrepancyIn: "",
        invId: "",
      };

      return {
        ...prev,
        purchaseReturnItemDtos: [...prev.purchaseReturnItemDtos, newItem],
      };
    });
  };

  const hasSetPharmacy = useRef(false);

  useEffect(() => {
    const fetchPharmacies = async () => {
      try {
        const data = await getPharmacy();
        setPharmacies(data.data);

        if (!hasSetPharmacy.current && data.data.length > 0) {
          hasSetPharmacy.current = true;
          setFormData((prev) => ({
            ...prev,
            pharmacyId: data.data[0].pharmacyId,
          }));
        }
      } catch (error) {
        console.error(error);
      }
    };

    fetchPharmacies();
  }, []);

  return (
    <>
      {showModal && (
        <Modal
          message={modalMessage}
          secondaryMessage={modalSecondaryMessage}
          bgClassName={modalBgClass}
          onConfirm={handleModalConfirm}
          onCancel={handleModalCancel}
        />
      )}
      <main className="space-y-6">
        <div className="flex justify-between">
          <div className="justify-start text-darkPurple text-3xl font-medium leading-10 ">
            Add Return Items
          </div>

          <div>
            <Button
              onClick={() => handlePurchaseReturnList()}
              label="Purchase Return List"
              value=""
              className="w-48 bg-darkPurple text-white h-11"
              icon={<ClipboardList size={15} />}
            ></Button>
          </div>
        </div>

        {formData.purchaseReturnItemDtos.map((row, idx) => (
          <div
            key={idx}
            className="border border-gray-300 w-full rounded-lg px-5 pt-5 pb-1 flex flex-col gap-6 lg:grid lg:grid-cols-2 lg:gap-8"
          >
            {/* Left Column */}
            <div className="w-full min-w-0 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
                <div className="relative w-full">
                  <ItemDropdown
                    selectedOption={row.selectedItem || null}
                    onChange={(selected) => {
                      handleItemDropdownChange(selected, idx);
                      console.log("Selected Bill:", selected);
                    }}
                  />
                </div>

                <div className="relative w-full">
                  <label
                    htmlFor={`batchNo-${idx}`}
                    className="absolute left-3 top-0 -translate-y-1/2 bg-white px-1 text-gray-500 text-xs transition-all"
                  >
                    Batch Number
                  </label>
                  <input
                    id={`batchNo-${idx}`}
                    name={`batchNo-${idx}`}
                    type="text"
                    value={row.batchNo}
                    readOnly
                    className="peer w-full px-3 py-3 border border-gray-400 rounded-md bg-transparent text-black outline-none focus:border-purple-900 focus:ring-0"
                  />
                </div>

                <div className="relative w-full">
                  <label
                    htmlFor={`purchaseBillNo-${idx}`}
                    className="absolute left-3 top-0 -translate-y-1/2 bg-white px-1 text-gray-500 text-xs transition-all z-10"
                  >
                    Invoice Number
                  </label>

                  <div className="peer w-full px-3 py-[6px] border border-gray-400 rounded-md bg-transparent text-black outline-none focus-within:border-purple-900 focus-within:ring-0">
                    <AsyncSelect
                      cacheOptions
                      defaultOptions={row.purchaseBillOptions}
                      value={
                        row.purchaseBillOptions?.find(
                          (opt) => opt.value === row.purchaseBillNo
                        ) || null
                      }
                      getOptionLabel={(option) =>
                        option.billOnlyLabel || option.label
                      }
                      formatOptionLabel={(option, { context }) =>
                        context === "menu"
                          ? option.label
                          : option.billOnlyLabel || option.label
                      }
                      loadOptions={(inputValue, callback) => {
                        const filtered =
                          row.purchaseBillOptions?.filter((option) =>
                            option.label
                              .toLowerCase()
                              .includes(inputValue.toLowerCase())
                          ) || [];
                        callback(filtered);
                      }}
                      onChange={(selected) => {
                        const billNo = selected?.value || "";
                        const supplierId = selected?.supplierId || "";
                        const invId = selected?.invId || "";

                        setFormData((prev) => {
                          const updated = [...prev.purchaseReturnItemDtos];
                          updated[idx] = {
                            ...updated[idx],
                            purchaseBillNo: billNo,
                            supplierId,
                            invId,
                          };
                          return { ...prev, purchaseReturnItemDtos: updated };
                        });
                      }}
                      placeholder="Select Bill No"
                      isClearable
                      styles={{
                        control: (base) => ({
                          ...base,
                          minHeight: "30px",
                          border: "none",
                          boxShadow: "none",
                          backgroundColor: "transparent",
                        }),
                        valueContainer: (base) => ({
                          ...base,
                          padding: 0,
                        }),
                        indicatorsContainer: (base) => ({
                          ...base,
                          padding: 0,
                        }),
                        menu: (base) => ({
                          ...base,
                          zIndex: 9999,
                          minWidth: "100%",
                          width: "auto",
                          overflowX: "hidden",
                        }),
                        menuList: (base) => ({
                          ...base,
                          padding: 0,
                          overflowX: "hidden",
                        }),
                        option: (base, state) => ({
                          ...base,
                          backgroundColor:
                            state.isSelected || state.isFocused
                              ? "#4B0082"
                              : "white",
                          color:
                            state.isSelected || state.isFocused
                              ? "white"
                              : "#111827",
                          cursor: "pointer",
                          whiteSpace: "nowrap",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          maxWidth: "100%",
                          padding: "8px 12px",
                          borderRadius: "0.375rem",
                          "&:active": {
                            backgroundColor: "#4B0082",
                            color: "white",
                          },
                        }),
                      }}
                    />
                  </div>
                </div>

                <div className="relative w-full">
                  <label
                    htmlFor={`supplierName-${idx}`}
                    className="absolute left-3 top-0 -translate-y-1/2 bg-white px-1 text-gray-500 text-xs transition-all"
                  >
                    Supplier Name
                  </label>
                  <input
                    id={`supplierName-${idx}`}
                    name={`supplierName-${idx}`}
                    type="text"
                    value={
                      row.supplierId
                        ? row.purchaseBillOptions?.find(
                          (opt) => opt.supplierId === row.supplierId
                        )?.supplierName || ""
                        : ""
                    }
                    readOnly
                    className="peer w-full px-3 py-3 border border-gray-400 rounded-md bg-transparent text-black outline-none focus:border-purple-900 focus:ring-0"
                  />
                </div>

                <div className="relative w-full min-w-0">
                  {/* REPLACED native select with react-select using dropdown() */}
                  <div className="relative">
                    <Select<ReturnOption>
                      id={`returnType-${idx}`}
                      options={returnOptions}
                      value={
                        returnOptions.find((opt) => opt.value === row.returnType) ??
                        null
                      }
                      onChange={(
                        option: SingleValue<ReturnOption | null>
                      ) => {
                        const selected = option as ReturnOption | null;
                        setFormData((prev) => {
                          const updated = [...prev.purchaseReturnItemDtos];
                          updated[idx] = {
                            ...updated[idx],
                            returnType: selected?.value ?? "",
                          };
                          return { ...prev, purchaseReturnItemDtos: updated };
                        });
                      }}
                      placeholder="Select Return Type"
                      className="w-full"
                      classNamePrefix="react-select"
                      styles={dropdown()}
                      components={{
                        SingleValue: (props) => (
                          <components.SingleValue {...props}>
                            {props.data.label}
                          </components.SingleValue>
                        ),
                      }}
                      isClearable
                    />

                    <label
                      htmlFor={`returnType-${idx}`}
                      className="absolute left-2 top-0 -translate-y-1/2 bg-white px-1 text-gray-500 text-xs transition-all"
                    >
                      Return Type
                    </label>
                  </div>
                </div>

                <div className="relative w-full">
                  <label
                    htmlFor={`returnQuantity-${idx}`}
                    className="absolute left-3 top-0 -translate-y-1/2 bg-white px-1 text-gray-500 text-xs transition-all"
                  >
                    Return Quantity
                  </label>
                  <input
                    id={`returnQuantity-${idx}`}
                    name={`returnQuantity-${idx}`}
                    type="number"
                    value={
                      row.returnQuantity === 0 ? "" : row.returnQuantity ?? ""
                    }
                    onKeyDown={restrictInvalidNumberKeys}
                    onChange={handleNumericChange(handleInputChange)}
                    className="peer w-full px-3 py-3 border border-gray-400 rounded-md bg-transparent text-black outline-none focus:border-purple-900 focus:ring-0"
                  />{" "}
                  <span className="text-xs text-gray-500 mt-1">
                    Available Quantity: {row.availableQuantity ?? 0}
                  </span>
                </div>
              </div>
            </div>

            <input
              type="hidden"
              name="pharmacyId"
              value={formData.pharmacyId}
            />

            {/* Right Column */}
            <div className="w-full min-w-0 overflow-x-auto">
              <Table
                data={[row]}
                columns={columns(idx)}
                noDataMessage="No purchase items found"
              />
            </div>
          </div>
        ))}

        <div>
          <AddItemRow1 onClick={addNewRow} />
        </div>

        <div className="border h-full w-lg border-Gray rounded-xl p-6 space-y-6 ml-auto font-normal text-sm">
          {[
            {
              label: "SUB TOTAL",
              value: formData.totalAmount?.toFixed(2) ?? "0.00",
            },
            {
              label: "GST TOTAL",
              value: formData.totalGst?.toFixed(2) ?? "0.00",
            },
            {
              label: "GRAND TOTAL",
              value: formData.returnAmount?.toFixed(2) ?? "0.00",
              isTotal: true,
            },
          ].map(({ label, value, isTotal }, index) => (
            <div
              key={index}
              className={`flex justify-between ${isTotal
                ? "font-semibold text-base bg-gray1 h-8 p-1 items-center rounded-lg"
                : ""
                }`}
            >
              <div>{label}</div>
              <div>₹{value}</div>
            </div>
          ))}
        </div>

        <div className="flex justify-end">
          <Button
            onClick={addPurchaseReturn}
            label="Confirm"
            value=""
            className="w-28 bg-darkPurple text-white h-11"
          ></Button>
        </div>
      </main>
    </>
  );
};

export default PurchaseReturn;
