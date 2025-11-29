"use client";
import Button from "@/app/components/common/Button";
import React, { useEffect, useRef, useState } from "react";
import { ClipboardList } from "lucide-react";
import Table from "@/app/components/common/Table";
import {
  PurchaseEntryData,
  PurchaseEntryItem,
} from "@/app/types/PurchaseEntry";
import Drawer from "@/app/components/common/Drawer";
import AddItem from "../../item/components/AddItem";
import AddSupplier from "../../supplier/component/AddSupplier";
import InputField from "@/app/components/common/InputField";
import { ItemData } from "@/app/types/ItemData";
import { getItem, getItemById } from "@/app/services/ItemService";
import {
  getPurchaseOrder,
  getPurchaseOrderById,
} from "@/app/services/PurchaseOrderService";
import { PurchaseOrderData } from "@/app/types/PurchaseOrderData";
import { checkBillNoExists, createPurchase } from "@/app/services/PurchaseEntryService";
import { getPharmacy } from "@/app/services/PharmacyService";
import { getSupplier, getSupplierById } from "@/app/services/SupplierService";
import { toast } from "react-toastify";
import Modal from "@/app/components/common/Modal";
import { BsThreeDotsVertical } from "react-icons/bs";
import {
  handleNumericChange,
  restrictInvalidNumberKeys,
} from "@/app/components/common/RestrictedVal";
import { SupplierData } from "@/app/types/SupplierData";
import AsyncSelect from "react-select/async";
import { customSelectStyles } from "@/app/components/common/DropdownStyle";
import EllipsisTooltip from "@/app/components/common/EllipsisTooltip";
import { components } from "react-select";
import { PharmacyData } from "@/app/types/PharmacyData";
import SelectField from "@/app/components/common/SelectField";
import {
  purchaseEntryItemSchema,
  purchaseEntrySchema,
} from "@/app/schema/PurchaseEntrySchema";
import AddItemRow1 from "@/app/components/common/AddItemRow1";

interface PurchaseEntryProps {
  setShowPurchaseEntry: (value: boolean) => void;
}

type OrderSuggestion = {
  orderId: string;
  orderId1: string;
};

type OptionType = {
  label: string;
  value: string;
};

const PurchaseEntry: React.FC<PurchaseEntryProps> = ({
  setShowPurchaseEntry,
}) => {
  const [modalConfirmCallback, setModalConfirmCallback] = useState<
    () => Promise<void> | void
  >(() => {});
  const [showModal, setShowModal] = useState(false);
  const [modalMessage, setModalMessage] = useState("");
  const [modalSecondaryMessage, setModalSecondaryMessage] = useState("");
  const [modalBgClass, setModalBgClass] = useState("");
  const [, setModalCancelCallback] = useState<() => void>(() => {});
  const [currentItemId, setCurrentItemId] = useState<string | null>(null);
  const [orderSuggestions, setOrderSuggestions] = useState<OrderSuggestion[]>(
    []
  );
  const [filteredSuggestions, setFilteredSuggestions] = useState<
    OrderSuggestion[]
  >([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [pharmacies, setPharmacies] = useState<PharmacyData[]>([]);

  const today = new Date().toISOString().split("T")[0];

  interface ModalOptions {
    message: string;
    secondaryMessage?: string;
    bgClassName?: string;
    onConfirmCallback: () => Promise<void> | void;
    onCancelCallback?: () => void;
  }

  const [suppliers, setSuppliers] = useState<SupplierData[]>([]);

  const [, setShowDrawer] = useState<boolean>(false);
  const [purchaseRows, setPurchaseRows] = useState<PurchaseEntryItem[]>([
    {
      itemId: "",
      batchNo: "",
      packageQuantity: 0,
      expiryDate: "",
      purchasePrice: 0,
      mrpSalePrice: 0,
      cgstPercentage: 0,
      purchasePricePerUnit: 0,
      mrpSalePricePerUnit: 0,
      sgstPercentage: 0,
      gstPercentage: 0,
      cgstAmount: 0,
      sgstAmount: 0,
      gstAmount: 0,
      discount: 0,
      amount: 0,
      pharmacyId: "",
    },
  ]);

  const [formData, setFormData] = useState<PurchaseEntryData>({
    orderId: "",
    orderId1: "",
    purchaseDate: new Date(),
    purchaseBillNo: "",
    creditPeriod: 0,
    paymentDueDate: new Date(),
    supplierId: "",
    invoiceAmount: 0,
    paymentStatus: "",
    goodStatus: "",
    totalAmount: 0,
    totalCgst: 0,
    totalSgst: 0,
    totalDiscount: 0,
    grandTotal: 0,
    stockItemDtos: [],
  });

  const [items, setItems] = useState<ItemData[]>([]);
  const [subTotal, setSubTotal] = useState(0);
  const [totalDiscountPercentage, setTotalDiscountPercent] =
    useState<number>(0);
  const [totalDiscountAmount, setTotalDiscountAmount] = useState<number>(0);

  const [gstTotal, setGstTotal] = useState(0);
  const [grandTotal, setGrandTotal] = useState(0);
  const [showSupplier, setShowSupplier] = useState(false);
  const [showItem, setShowItem] = useState(false);
  const defaultItemOptions = [{ label: "+ Add New Item", value: "newItem" }];
  const defaultSupplierOptions = [
    { label: "+ Add New Supplier", value: "newSupplier" },
  ];
  const fetchSuppliers = async () => {
    try {
      const supplierList = await getSupplier();
      setSuppliers(supplierList);
    } catch (error) {
      console.error("Failed to fetch suppliers:", error);
    }
  };

  useEffect(() => {
    fetchSuppliers();
  }, []);

  const loadSupplierOptions = async (
    inputValue: string,
    callback: (options: OptionType[]) => void
  ) => {
    try {
      if (!inputValue) {
        callback(defaultSupplierOptions);
        return;
      }

      const filtered = suppliers
        .filter((sup) =>
          sup.supplierName.toLowerCase().startsWith(inputValue.toLowerCase())
        )
        .map((sup) => ({
          label: sup.supplierName,
          value: sup.supplierId,
        }));

      callback([...defaultSupplierOptions, ...filtered]);
    } catch (error) {
      console.error("Failed to load supplier options:", error);
      callback(defaultSupplierOptions);
    }
  };

  const fetchItems = async () => {
    try {
      const data = await getItem();
      setItems(data);
    } catch (error) {
      console.error("Failed to fetch items", error);
    }
  };

  useEffect(() => {
    fetchItems();
  }, []);

  useEffect(() => {
    const fetchOrders = async () => {
      const res = await getPurchaseOrder();
      if (res.status === "success") {
        const orderIds = res.data.map((item: PurchaseOrderData) => ({
          orderId: item.orderId,
          orderId1: item.orderId1?.toString() || "",
        }));
        setOrderSuggestions(orderIds);
      }
    };

    fetchOrders();
  }, []);

  const loadItemOptions = async (inputValue: string) => {
    try {
      if (!inputValue.trim()) {
        return defaultItemOptions;
      }

      const allItems = await getItem();

      const filteredItems = allItems.filter((item: { itemName: string }) =>
        item.itemName.toLowerCase().startsWith(inputValue.toLowerCase())
      );

      const mappedItems = filteredItems.map(
        (item: { itemName: string; itemId: string }) => ({
          label: item.itemName,
          value: item.itemId,
        })
      );

      return [...defaultItemOptions, ...mappedItems];
    } catch (error) {
      console.error("Error loading item options:", error);
      return defaultItemOptions;
    }
  };

  const handleRowUpdate = (
    index: number,
    updatedFields: Partial<PurchaseEntryItem>
  ) => {
    setPurchaseRows((prev) =>
      prev.map((item, i) =>
        i === index ? { ...item, ...updatedFields } : item
      )
    );
  };

  const handleItemSelect = async (
    selectedOption: { value: string; label: string } | null,
    index: number
  ) => {
    if (!selectedOption) {
      handleRowUpdate(index, {
        itemId: "",
        itemName: "",
        batchNo: "",
        packageQuantity: 0,
        expiryDate: "",
        purchasePrice: 0,
        mrpSalePrice: 0,
        gstPercentage: 0,
        gstAmount: 0,
        discount: 0,
        amount: 0,
        purchasePricePerUnit: 0,
        mrpSalePricePerUnit: 0,
      });
      return;
    }

    const value = selectedOption.value;

    if (value === "newItem") {
      handleItemDrawer();
      return;
    }

    try {
      const itemDetails = await getItemById(value);

      const updatedRow: Partial<PurchaseEntryItem> = {
        itemId: itemDetails.itemId,
        itemName: itemDetails.itemName,
        // batchNo: itemDetails.batchNo,
        // packageQuantity: itemDetails.packageQuantity,
        // expiryDate: itemDetails.expiryDate,
        purchasePrice: itemDetails.purchasePrice,
        mrpSalePrice: itemDetails.mrpSalePrice,
        purchasePricePerUnit: itemDetails.purchasePricePerUnit,
        mrpSalePricePerUnit: itemDetails.mrpSalePricePerUnit,
        gstPercentage: itemDetails.gstPercentage,
        // gstAmount: itemDetails.gstAmount,
        // discount: itemDetails.discount,
        amount:
          (itemDetails.purchasePrice || 0) *
          (purchaseRows[index]?.packageQuantity || 1),
      };

      handleRowUpdate(index, updatedRow);
    } catch (error) {
      console.error("Error fetching item details:", error);
    }
  };

  const columns: {
    header: string;
    accessor:
      | keyof PurchaseEntryItem
      | ((row: PurchaseEntryItem, index: number) => React.ReactNode);
    className?: string;
  }[] = [
    {
      header: "Item Name",
      accessor: (row: PurchaseEntryItem, index: number) => (
        <AsyncSelect
          cacheOptions
          defaultOptions={defaultItemOptions}
          loadOptions={loadItemOptions}
          isClearable={true}
          value={
            row.itemId
              ? {
                  label:
                    row.itemName ||
                    items.find((i) => i.itemId === row.itemId)?.itemName ||
                    "",
                  value: row.itemId,
                }
              : null
          }
          onChange={(selectedOption) => handleItemSelect(selectedOption, index)}
          placeholder="Select or search item"
          className="text-left w-full"
          classNamePrefix="react-select"
          styles={customSelectStyles<OptionType>()}
          formatOptionLabel={(data, { context }) =>
            context === "menu" ? (
              <div className="flex flex-col font-medium leading-5 w-full">
                <EllipsisTooltip text={data.label} className="w-full" />
              </div>
            ) : (
              <EllipsisTooltip text={data.label} className="w-full" />
            )
          }
          components={{
            SingleValue: (props) => (
              <components.SingleValue {...props}>
                <EllipsisTooltip text={props.data.label} className="w-full" />
              </components.SingleValue>
            ),
          }}
        />
      ),
    },

    {
      header: "Batch No",
      accessor: (row: PurchaseEntryItem, index: number) => (
        <div className="flex items-center gap-x-2">
          <input
            type="text"
            name="batchNo"
            value={row.batchNo}
            onChange={(e) => handleChange(e, index)}
            className="border border-Gray p-2 rounded w-28 text-left outline-none focus:ring-0 focus:outline-none"
          />
        </div>
      ),
      className: "text-left",
    },
    {
      header: "Package Qty",
      accessor: (row: PurchaseEntryItem, index: number) => (
        <div className="flex flex-col items-center gap-x-2">
          <input
            type="number"
            name="packageQuantity"
            value={row.packageQuantity ?? ""}
            onKeyDown={restrictInvalidNumberKeys}
            onChange={handleNumericChange((e) => handleChange(e, index))}
            className="border border-Gray p-2 rounded w-24 text-left outline-none focus:ring-0 focus:outline-none"
          />

          {row.orderedQuantity !== undefined && (
            <span className="text-xs text-gray-500 mt-1">
              Ordered Qty: {row.orderedQuantity}
            </span>
          )}
        </div>
      ),
      className: "text-left",
    },
    {
      header: "Expiry Date",
      accessor: (row: PurchaseEntryItem, index: number) => (
        <div className="flex items-center gap-x-2">
          <input
            type="date"
            name="expiryDate"
            value={row.expiryDate}
            onChange={(e) => handleChange(e, index)}
            onBlur={(e) => checkExpiry(e, index)}
            className="border border-Gray p-2 rounded w-32 text-left outline-none focus:ring-0 focus:outline-none"
          />
        </div>
      ),
      className: "text-left",
    },
    {
      header: "Purchase Price",
      accessor: "purchasePrice",
      className: "text-left",
    },
    { header: "MRP", accessor: "mrpSalePrice", className: "text-left" },
    { header: "GST %", accessor: "gstPercentage", className: "text-left" },
    { header: "GST", accessor: "gstAmount", className: "text-left" },
    // { header: "Discount ", accessor: "discount", className: "text-left" },
    { header: "Amount", accessor: "amount", className: "text-left" },
    {
      header: "Action",
      accessor: (row: PurchaseEntryItem, index: number) => (
        <div className="relative group">
          <button className="p-2 rounded-full hover:bg-gray-200 cursor-pointer">
            <BsThreeDotsVertical size={18} />
          </button>

          <div className="absolute right-0 mt-2 w-32 bg-white shadow-xl rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 z-10">
            <button
              onClick={() => handleItemDrawer(row.itemId)}
              className="block w-full px-4 py-2 text-left text-gray-700 cursor-pointer hover:bg-purple-950 hover:text-white hover:rounded-lg whitespace-nowrap"
            >
              Edit Item Details
            </button>

            <button
              onClick={() => handleDeleteRow(index)}
              className="block w-full px-4 py-2 text-left text-gray-700 cursor-pointer hover:bg-purple-950 hover:text-white hover:rounded-lg"
            >
              Delete
            </button>
          </div>
        </div>
      ),
    },
  ];

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>,
    index: number,
    updatedValues?: Partial<PurchaseEntryItem>
  ) => {
    const { name, value } = e.target;
    const updatedRows = [...purchaseRows];

    let updatedValue: number | string = value;
    if (name === "packageQuantity") {
      updatedValue = Number(value) || 0;
    }

    updatedRows[index] = {
      ...updatedRows[index],
      [name]: updatedValue,
      ...updatedValues,
    };

    if (
      name === "packageQuantity" ||
      updatedValues?.purchasePrice !== undefined
    ) {
      const packageQuantity = updatedRows[index].packageQuantity || 0;
      const purchasePrice = updatedRows[index].purchasePrice || 0;

      const amount = packageQuantity * purchasePrice;
      const gstPercentage = updatedRows[index].gstPercentage || 0;
      const gstAmount = (amount * gstPercentage) / 100;

      const cgstAmount = gstAmount / 2;
      const sgstAmount = gstAmount / 2;

      updatedRows[index] = {
        ...updatedRows[index],
        amount,
        gstAmount,
        cgstAmount,
        sgstAmount,
      };
    }

    setPurchaseRows(updatedRows);
  };

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { id, value } = e.target;
    setFormData((prev) => ({ ...prev, [id]: value }));

    if (id === "orderId") {
      const matches = orderSuggestions.filter((order) =>
        order.orderId1?.toLowerCase().includes(value.toLowerCase())
      );
      setFilteredSuggestions(matches);
      setShowSuggestions(true);
    }
  };

  // const handleSuggestionClick = async (orderId: string, orderId1: string) => {
  //   setFormData((prev) => ({ ...prev, orderId, orderId1 }));
  //   setShowSuggestions(false);

  //   const fakeEvent = {
  //     target: { value: orderId },
  //   } as React.ChangeEvent<HTMLSelectElement>;

  //   await handleOrderSelect(fakeEvent);
  // };

  const addNewRow = () => {
    setPurchaseRows([
      ...purchaseRows,
      {
        itemId: "",
        pharmacyId: "",
        batchNo: "",
        packageQuantity: 0,
        expiryDate: "",
        purchasePrice: 0,
        mrpSalePrice: 0,
        purchasePricePerUnit: 0,
        mrpSalePricePerUnit: 0,
        cgstPercentage: 0,
        sgstPercentage: 0,
        gstPercentage: 0,
        cgstAmount: 0,
        sgstAmount: 0,
        gstAmount: 0,
        discount: 0,
        amount: 0,
      },
    ]);
  };

  const checkExpiry = async (
    e: React.FocusEvent<HTMLInputElement, Element>,
    idx: number
  ) => {
    const enteredDate = new Date(e.target.value);
    const currentDate = new Date();
    const threeMonthsFromNow = new Date();
    threeMonthsFromNow.setMonth(currentDate.getMonth() + 3);

    if (enteredDate < threeMonthsFromNow) {
      const userConfirmed = await new Promise<boolean>((resolve) => {
        handleShowModal({
          message:
            "The expiry date is less than 3 months away. Do you want to proceed?",
          secondaryMessage: "Confirm Expiry Date",
          bgClassName: "bg-darkPurple",
          onConfirmCallback: () => resolve(true),
          onCancelCallback: () => {
            setPurchaseRows((prev) =>
              prev.map((row, i) =>
                i === idx ? { ...row, expiryDate: "" } : row
              )
            );
            resolve(false);
          },
        });
      });

      if (userConfirmed) {
        handleChange(e, idx);
      }
    } else {
      handleChange(e, idx);
    }
  };

  const handlePurchaseList = () => {
    setShowPurchaseEntry(false);
  };

  const handleDeleteRow = (index: number) => {
    if (purchaseRows.length === 1) {
      toast.error("Cannot delete the first row", {
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
        setPurchaseRows(purchaseRows.filter((_, i) => i !== index));
      },
    });
  };

  const handleItemDrawer = (itemId?: string) => {
    if (itemId) {
      setCurrentItemId(itemId);
    }

    setShowSupplier(false);
    setShowItem(true);
    setShowDrawer(true);
  };

  const handleSupplierDrawer = () => {
    setShowItem(false);
    setShowSupplier(true);
    setShowDrawer(true);
  };

  const handleCloseDrawer = async () => {
    setShowDrawer(false);
    setShowItem(false);
    setShowSupplier(false);
    await fetchItems();
    await fetchSuppliers();
  };

  useEffect(() => {
    setFormData((prev) => ({
      ...prev,
      billDate: new Date().toISOString().split("T")[0],
    }));
  }, []);

  useEffect(() => {
    if (formData.creditPeriod && formData.purchaseDate) {
      const purchaseDate = new Date(formData.purchaseDate);
      const creditPeriod = Number(formData.creditPeriod);

      if (!isNaN(creditPeriod) && !isNaN(purchaseDate.getTime())) {
        const paymentDueDate = new Date(purchaseDate);
        paymentDueDate.setDate(paymentDueDate.getDate() + creditPeriod);

        setFormData((prev) => ({
          ...prev,
          paymentDueDate,
        }));
      }
    }
  }, [formData.creditPeriod, formData.purchaseDate]);

  const handleOrderSelect = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedOrderId = e.target.value.trim();

    if (!selectedOrderId) {
      console.warn("Order ID is empty or invalid!");
      return;
    }

    setFormData((prev) => ({ ...prev, orderId: selectedOrderId }));

    try {
      const purchaseOrder = await getPurchaseOrderById(selectedOrderId);

      if (purchaseOrder?.purchaseOrderItemDtos) {
        const pharmacyId = purchaseOrder.pharmacyId || "";
        const supplierId = purchaseOrder.supplierId || "";

        let updatedRows: PurchaseEntryItem[] =
          purchaseOrder.purchaseOrderItemDtos.map(
            (item: PurchaseEntryItem): PurchaseEntryItem => ({
              itemId: item.itemId,
              itemName: item.itemName,
              batchNo: item.batchNo || "",
              orderedQuantity: item.packageQuantity || 0,
              expiryDate: item.expiryDate || "",
              purchasePrice: item.purchasePrice || 0,
              mrpSalePrice: item.mrpSalePrice || 0,
              purchasePricePerUnit: item.purchasePricePerUnit || 0,
              mrpSalePricePerUnit: item.mrpSalePricePerUnit || 0,
              gstPercentage: item.gstPercentage || 0,
              gstAmount: item.gstAmount || 0,
              discount: item.discount || 0,
              amount: item.amount || 0,
              pharmacyId,
            })
          );

        setPurchaseRows(updatedRows);

        updatedRows = await Promise.all(
          updatedRows.map(
            async (row: PurchaseEntryItem): Promise<PurchaseEntryItem> => {
              try {
                const itemDetails = await getItemById(row.itemId.toString());

                return {
                  ...row,
                  itemName: row.itemName,
                  batchNo: row.batchNo,
                  expiryDate: row.expiryDate,
                  packageQuantity: row.packageQuantity,
                  pharmacyId: row.pharmacyId,
                  amount: row.amount,
                  discount: row.discount,
                  gstAmount: row.gstAmount,

                  purchasePrice: itemDetails.purchasePrice ?? row.purchasePrice,
                  mrpSalePrice: itemDetails.mrpSalePrice ?? row.mrpSalePrice,
                  gstPercentage: itemDetails.gstPercentage ?? row.gstPercentage,
                  purchasePricePerUnit:
                    itemDetails.purchasePricePerUnit ??
                    row.purchasePricePerUnit,
                  mrpSalePricePerUnit:
                    itemDetails.mrpSalePricePerUnit ?? row.mrpSalePricePerUnit,
                };
              } catch (error) {
                console.error(
                  "Error fetching item details for itemId:",
                  row.itemId,
                  error
                );
                return row;
              }
            }
          )
        );

        setPurchaseRows(updatedRows);
        if (supplierId) {
          try {
            console.log(
              "Fetching supplier details for supplierId:",
              supplierId
            );

            const supplier = await getSupplierById(supplierId);

            setFormData((prev) => ({
              ...prev,
              supplierId,
              supplierName: supplier?.supplierName || "N/A",
            }));
          } catch (error) {
            console.error(
              "Error fetching supplier details for supplierId:",
              supplierId,
              error
            );
            setFormData((prev) => ({
              ...prev,
              supplierId,
              supplierName: "N/A",
            }));
          }
        }
      } else {
        setPurchaseRows([]);
      }
    } catch (error) {
      console.error("Error fetching purchase order items:", error);
    }
  };

  useEffect(() => {
    const newSubTotal = purchaseRows.reduce(
      (sum, row) => sum + (row.amount || 0),
      0
    );

    const newGstTotal = purchaseRows.reduce(
      (sum, row) => sum + (row.gstAmount || 0),
      0
    );

    const newDiscountAmount = (newSubTotal * totalDiscountPercentage) / 100;
    const discountedSubTotal = newSubTotal - newDiscountAmount;
    const newGrandTotal = discountedSubTotal + newGstTotal;

    setSubTotal(newSubTotal);
    setGstTotal(newGstTotal);
    setTotalDiscountAmount(newDiscountAmount);
    setGrandTotal(Math.round(newGrandTotal));
  }, [purchaseRows, totalDiscountPercentage]);

  const handleShowModal = (options: ModalOptions) => {
    setModalMessage(options.message);
    setModalSecondaryMessage(options.secondaryMessage || "");
    setModalBgClass(options.bgClassName || "");
    setModalConfirmCallback(() => options.onConfirmCallback);
    if (options.onCancelCallback) {
      setModalCancelCallback(() => options.onCancelCallback); // ✅
    }
    setShowModal(true);
  };

  const handleModalCancel = () => {
    setShowModal(false);
  };

  const handleModalConfirm = async () => {
    await modalConfirmCallback();
    setShowModal(false);
  };

  const addPurchase = async () => {
    const roundedGrandTotal = grandTotal;
    if (Number(formData.invoiceAmount) !== roundedGrandTotal) {
    toast.error(
      "Invoice amount must match the grand total before confirming."
    );
    return;
  }

     try {
    const billExists = await checkBillNoExists(
      formData.supplierId,
      formData.purchaseBillNo
    );

    if (billExists) {
      toast.error("This Bill No. already exists for the supplier in the current year.");
      return;
    }
  } catch (error) {
    toast.error("Unable to verify bill number. Please try again.");
    console.error("Bill check failed:", error);
    return;
  }



    const purchaseData: PurchaseEntryData = {
      orderId: formData.orderId,
      purchaseBillNo: formData.purchaseBillNo,
      purchaseDate: new Date(formData.purchaseDate),
      creditPeriod: formData.creditPeriod
        ? Number(formData.creditPeriod)
        : undefined,
      paymentDueDate: formData.paymentDueDate
        ? new Date(formData.paymentDueDate)
        : undefined,
      supplierId: formData.supplierId,
      pharmacyId: formData.pharmacyId,
      invoiceAmount: formData.invoiceAmount
        ? Number(formData.invoiceAmount)
        : undefined,
      totalAmount: subTotal,
      totalCgst: gstTotal,
      totalSgst: gstTotal,
      totalDiscountPercentage: totalDiscountPercentage,
      totalDiscountAmount: totalDiscountAmount,
      grandTotal: roundedGrandTotal,
      stockItemDtos: purchaseRows.map((row) => ({
        itemId: row.itemId,
        batchNo: row.batchNo,
        packageQuantity: row.packageQuantity,
        expiryDate: row.expiryDate,
        purchasePrice: row.purchasePrice,
        mrpSalePrice: row.mrpSalePrice,
        purchasePricePerUnit: row.purchasePricePerUnit,
        mrpSalePricePerUnit: row.mrpSalePricePerUnit,
        gstPercentage: row.gstPercentage,
        gstAmount: row.gstAmount,
        discount: row.discount,
        amount: row.amount,
      })),
      paymentStatus: "",
      goodStatus: "",
    };

    const entryValidation = purchaseEntrySchema.safeParse({
      pharmacyId: String(purchaseData.pharmacyId),
      purchaseBillNo: purchaseData.purchaseBillNo,
      billDate: String(purchaseData.purchaseDate),
      creditPeriod: purchaseData.creditPeriod,
      paymentDueDate: String(purchaseData.paymentDueDate),
      supplierId: String(purchaseData.supplierId),
      invoiceAmount: purchaseData.invoiceAmount ?? 0,
    });

    if (!entryValidation.success) {
      entryValidation.error.errors.forEach((err) => toast.error(err.message));
      return;
    }

    for (const row of purchaseData.stockItemDtos) {
      const itemValidation = purchaseEntryItemSchema.safeParse({
        itemId: String(row.itemId),
        batchNo: row.batchNo,
        packageQuantity: row.packageQuantity,
        expiryDate: row.expiryDate,
      });

      if (!itemValidation.success) {
        itemValidation.error.errors.forEach((err) => toast.error(err.message));
        return;
      }
    }

    handleShowModal({
      message:
        "Are you sure you want to confirm the entry? Once confirmed cannot be edited",
      secondaryMessage: "Confirm Entry Completion",
      bgClassName: "bg-darkPurple",
      onConfirmCallback: async () => {
        try {
          await createPurchase(purchaseData);

          setFormData({
            orderId: "",
            purchaseDate: new Date(),
            purchaseBillNo: "",
            creditPeriod: 0,
            paymentDueDate: new Date(),
            supplierId: "",
            invoiceAmount: 0,
            paymentStatus: "",
            goodStatus: "",
            totalAmount: 0,
            totalCgst: 0,
            totalSgst: 0,
            totalDiscount: 0,
            grandTotal: 0,
            stockItemDtos: [],
          });

          setPurchaseRows([]);
          window.location.reload();
        } catch (error) {
          console.error("Error adding purchase:", error);
          toast.error("Failed to add purchase. Please try again.");
        }
      },
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
      {(showItem || showSupplier) && (
        <div
          className="fixed inset-0 z-40 backdrop-blur-sm bg-black/20"
          onClick={handleCloseDrawer}
        />
      )}

      {showItem && (
        <Drawer setShowDrawer={handleCloseDrawer} title={"Add New Item"}>
          <AddItem
            setShowDrawer={handleCloseDrawer}
            itemId={currentItemId}
            onSuccess={(updatedItem) => {
              if (!updatedItem?.itemId) return;

              const rowIndex = purchaseRows.findIndex(
                (row) => row.itemId === updatedItem.itemId
              );

              if (rowIndex !== -1) {
                handleRowUpdate(rowIndex, {
                  itemName: updatedItem.itemName,
                  purchasePrice: updatedItem.purchasePrice,
                  mrpSalePrice: updatedItem.mrpSalePrice,
                  gstPercentage: updatedItem.gstPercentage,
                  purchasePricePerUnit: updatedItem.purchasePricePerUnit,
                });
              }
            }}
          />
        </Drawer>
      )}

      {showSupplier && (
        <Drawer setShowDrawer={handleCloseDrawer} title={"Add New Supplier"}>
          <AddSupplier setShowDrawer={handleCloseDrawer} />
        </Drawer>
      )}

      <main className="space-y-6">
        <div className="flex justify-between">
          <div className="justify-start text-darkPurple text-3xl font-medium leading-10 ">
            Purchase Entry
          </div>

          <div>
            <Button
              onClick={() => handlePurchaseList()}
              label="Purchase List"
              value=""
              className="w-48 bg-darkPurple text-white h-11"
              icon={<ClipboardList size={15} />}
            ></Button>
          </div>
        </div>

        <div className="border border-Gray max-full h-full rounded-lg p-5">
          <div className="justify-start text-black text-lg font-normal leading-7">
            Basic Details
          </div>

          <div className="relative mt-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {[
              { id: "orderId", label: "Order ID" },
              { id: "pharmacyName", label: "Pharmacy" },
              { id: "purchaseBillNo", label: "Invoice Number" },
              { id: "billDate", label: "Invoice Date", type: "date" },
            ].map(({ id, label, type }) => (
              <div key={id} className="relative w-full">
                {id === "orderId" ? (
                  //     <div className="relative">
                  //       <input
                  //         type="text"
                  //         id="orderId"
                  //         value={formData.orderId1 || ""}
                  //         onChange={handleInputChange}
                  //         onBlur={() =>
                  //           setTimeout(() => setShowSuggestions(false), 200)
                  //         }
                  //         onFocus={() => {
                  //           if (formData.orderId) {
                  //             setFilteredSuggestions(
                  //               orderSuggestions.filter((order) =>
                  //                 order.orderId1
                  //                   .toLowerCase()
                  //                   .includes(formData.orderId!.toLowerCase())
                  //               )
                  //             );
                  //             setShowSuggestions(true);
                  //           }
                  //         }}
                  //         required
                  //         placeholder=" "
                  //         className="peer w-full px-3 py-3 border border-gray-400 rounded-md bg-transparent text-black outline-none focus:border-purple-900 focus:ring-0"
                  //         data-has-value={formData.orderId1 ? "true" : "false"}
                  //       />
                  //       <label
                  //         htmlFor="orderId"
                  //         className="absolute left-3 top-0 -translate-y-1/2 bg-white px-1 text-gray-500 text-xs transition-all
                  // peer-placeholder-shown:top-0 peer-placeholder-shown:-translate-y-1/2 peer-placeholder-shown:text-xs
                  // peer-focus:top-0 peer-focus:-translate-y-1/2 peer-focus:text-xs peer-focus:text-purple-950 peer-focus:px-1
                  // peer-[data-has-value=true]:top-0 peer-[data-has-value=true]:-translate-y-1/2 peer-[data-has-value=true]:text-xs"
                  //       >
                  //         {label}
                  //       </label>

                  //       {showSuggestions && filteredSuggestions.length > 0 && (
                  //         <ul className="absolute top-full left-0 z-50 w-full bg-white border border-gray-300 rounded-md shadow max-h-40 overflow-y-auto">
                  //           {filteredSuggestions.map((suggestion, index) => (
                  //             <li
                  //               key={index}
                  //               className="px-3 py-2 hover:bg-gray-100 cursor-pointer"
                  //               onClick={() =>
                  //                 handleSuggestionClick(
                  //                   suggestion.orderId,
                  //                   suggestion.orderId1
                  //                 )
                  //               }
                  //             >
                  //               {suggestion.orderId1}
                  //             </li>
                  //           ))}
                  //         </ul>
                  //       )}
                  //     </div>

                  <div className="relative">
                    <input
                      type="text"
                      id="orderId"
                      value={formData.orderId1 || ""}
                      onChange={(e) => {
                        const value = e.target.value;
                        setFormData((prev) => ({ ...prev, orderId1: value }));

                        // live filter
                        const matches = orderSuggestions.filter((order) =>
                          order.orderId1
                            ?.toLowerCase()
                            .includes(value.toLowerCase())
                        );
                        setFilteredSuggestions(matches);
                        setShowSuggestions(true);
                      }}
                      onBlur={async () => {
                        setTimeout(() => setShowSuggestions(false), 200);

                        // when user leaves field, check if typed value matches any suggestion
                        const matched = orderSuggestions.find(
                          (o) =>
                            o.orderId1.toLowerCase() ===
                            formData.orderId1?.toLowerCase()
                        );

                        if (matched) {
                          // sync both IDs and fetch
                          setFormData((prev) => ({
                            ...prev,
                            orderId: matched.orderId,
                            orderId1: matched.orderId1,
                          }));

                          // fake event to reuse existing fetch logic
                          const fakeEvent = {
                            target: { value: matched.orderId },
                          } as React.ChangeEvent<HTMLSelectElement>;

                          await handleOrderSelect(fakeEvent);
                        }
                      }}
                      onKeyDown={async (e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          const matched = orderSuggestions.find(
                            (o) =>
                              o.orderId1.toLowerCase() ===
                              formData.orderId1?.toLowerCase()
                          );
                          if (matched) {
                            setFormData((prev) => ({
                              ...prev,
                              orderId: matched.orderId,
                              orderId1: matched.orderId1,
                            }));

                            const fakeEvent = {
                              target: { value: matched.orderId },
                            } as React.ChangeEvent<HTMLSelectElement>;

                            await handleOrderSelect(fakeEvent);
                          }
                        }
                      }}
                      required
                      placeholder=" "
                      className="peer w-full px-3 py-3 border border-gray-400 rounded-md bg-transparent text-black outline-none focus:border-purple-900 focus:ring-0"
                      data-has-value={formData.orderId1 ? "true" : "false"}
                    />
                    <label
                      htmlFor="orderId"
                      className="absolute left-3 top-0 -translate-y-1/2 bg-white px-1 text-gray-500 text-xs transition-all 
        peer-placeholder-shown:top-0 peer-placeholder-shown:-translate-y-1/2 peer-placeholder-shown:text-xs 
        peer-focus:top-0 peer-focus:-translate-y-1/2 peer-focus:text-xs peer-focus:text-purple-950 peer-focus:px-1
        peer-[data-has-value=true]:top-0 peer-[data-has-value=true]:-translate-y-1/2 peer-[data-has-value=true]:text-xs"
                    >
                      {label}
                    </label>

                    {showSuggestions && filteredSuggestions.length > 0 && (
                      <ul className="absolute top-full left-0 z-50 w-full bg-white border border-gray-300 rounded-md shadow max-h-40 overflow-y-auto">
                        {filteredSuggestions.map((suggestion, index) => (
                          <li
                            key={index}
                            className="px-3 py-2 hover:bg-gray-100 cursor-pointer"
                            onClick={async () => {
                              // update form data
                              setFormData((prev) => ({
                                ...prev,
                                orderId: suggestion.orderId,
                                orderId1: suggestion.orderId1,
                              }));
                              setShowSuggestions(false);

                              // reuse fetch logic
                              const fakeEvent = {
                                target: { value: suggestion.orderId },
                              } as React.ChangeEvent<HTMLSelectElement>;
                              await handleOrderSelect(fakeEvent);
                            }}
                          >
                            {suggestion.orderId1}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                ) : id === "pharmacyName" ? (
                  <>
                    <label
                      htmlFor={id}
                      className="absolute left-3 top-0 -translate-y-1/2 bg-white px-1 text-gray-500 text-xs transition-all"
                    >
                      {label}
                    </label>
                    <input
                      id={id}
                      type="text"
                      readOnly
                      value={
                        pharmacies.find(
                          (ph) =>
                            String(ph.pharmacyId) ===
                            String(formData.pharmacyId)
                        )?.name || ""
                      }
                      className="w-full h-[49px] px-3 py-3 border border-gray-400 rounded-md text-black outline-none"
                    />
                  </>
                ) : (
                  <InputField
                    id={id}
                    label={label}
                    type={type}
                    max={id === "billDate" ? today : undefined}
                    value={
                      formData[id as keyof PurchaseEntryData]?.toString() ?? ""
                    }
                    onChange={handleInputChange}
                  />
                )}
              </div>
            ))}
          </div>

          <div className="relative mt-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {[
              { id: "creditPeriod", label: "Credit Period", type: "number" },
              { id: "paymentDueDate", label: "Payment Due Date", type: "date" },
              { id: "supplierId", label: "Supplier", type: "text" },
              { id: "invoiceAmount", label: "Invoice Amount", type: "number" },
            ].map(({ id, label, type }) => (
              <div key={id} className="relative w-full">
                {id === "supplierId" ? (
                  <div className="relative">
                    <label
                      htmlFor={id}
                      className="absolute left-3 top-0 -translate-y-1/2 bg-white px-1 text-gray-500 text-xs transition-all"
                    >
                      {label}
                    </label>
                    <SelectField
                      value={
                        formData.supplierId && formData.supplierName
                          ? {
                              label: formData.supplierName,
                              value: formData.supplierId,
                            }
                          : null
                      }
                      onChange={(selected) => {
                        if (selected?.value === "newSupplier") {
                          handleSupplierDrawer();
                          return;
                        }
                        setFormData((prev) => ({
                          ...prev,
                          supplierId: selected?.value || "",
                          supplierName: selected?.label || "",
                        }));
                      }}
                      label="Supplier"
                      loadOptions={loadSupplierOptions}
                      defaultOptions={defaultSupplierOptions}
                      formatOptionLabel={(data) => data.label}
                    />
                  </div>
                ) : (
                  <div>
                    <InputField
                      id={id}
                      label={label}
                      type={type}
                      value={
                        id === "paymentDueDate" && formData.paymentDueDate
                          ? new Date(formData.paymentDueDate)
                              .toISOString()
                              .split("T")[0]
                          : formData[id as keyof PurchaseEntryData] === 0
                          ? ""
                          : formData[
                              id as keyof PurchaseEntryData
                            ]?.toString() ?? ""
                      }
                      onChange={
                        id === "paymentDueDate"
                          ? () => {}
                          : id === "creditPeriod" || id === "invoiceAmount"
                          ? handleNumericChange(handleInputChange)
                          : handleInputChange
                      }
                      readOnly={id === "paymentDueDate"}
                      onKeyDown={
                        id === "creditPeriod" || id === "invoiceAmount"
                          ? restrictInvalidNumberKeys
                          : undefined
                      }
                    />
                    {id === "creditPeriod" && (
                      <p className="mt-1 px-2 text-xs text-gray-400">
                        Max 45 days allowed
                      </p>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        <Table
          data={purchaseRows}
          columns={columns}
          noDataMessage="No purchase items found"
        />

        <div>
          <AddItemRow1 onClick={addNewRow} />
        </div>

        <div className="border h-full w-lg border-Gray rounded-xl p-6 space-y-4 ml-auto font-normal text-sm">
          <div className="flex justify-between">
            <div>SUB TOTAL</div>
            <div>₹{subTotal.toFixed(2)}</div>
          </div>

          <div className="flex justify-between">
            <div>GST TOTAL</div>
            <div>₹{gstTotal.toFixed(2)}</div>
          </div>

          <div className="flex justify-between items-center">
            <div>DISCOUNT %</div>
            <div>
              <input
                type="number"
                min={0}
                max={100}
                value={totalDiscountPercentage}
                onChange={(e) =>
                  setTotalDiscountPercent(Number(e.target.value))
                }
                className="w-16 border border-gray-300 rounded p-1 text-right outline-none focus:ring-0"
              />
            </div>
          </div>

          <div className="flex justify-between">
            <div>DISCOUNT</div>
            <div>₹{totalDiscountAmount.toFixed(2)}</div>
          </div>

          <div className="flex justify-between font-semibold text-base bg-gray1 h-8 p-1 items-center rounded-lg">
            <div>GRAND TOTAL</div>
            <div>₹{grandTotal.toFixed(2)}</div>
          </div>
        </div>

        <div className="flex justify-end">
          <Button
            onClick={addPurchase}
            label="Save"
            value=""
            className="w-28 bg-darkPurple text-white h-11"
          ></Button>
        </div>
      </main>
    </>
  );
};

export default PurchaseEntry;