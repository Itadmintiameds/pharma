"use client";

import Button from "@/app/components/common/Button";
import Drawer from "@/app/components/common/Drawer";
import InputField from "@/app/components/common/InputField";
import Table from "@/app/components/common/Table";
import { getItem, getItemById } from "@/app/services/ItemService";
import { getSupplier } from "@/app/services/SupplierService";
import { getVariantById } from "@/app/services/VariantService";
import { ItemData } from "@/app/types/ItemData";
import {
  PurchaseOrderData,
  PurchaseOrderItem,
} from "@/app/types/PurchaseOrderData";
import { SupplierData } from "@/app/types/SupplierData";
import { ClipboardList } from "lucide-react";
import React, { useEffect, useState } from "react";
import AddItem from "../../item/components/AddItem";
import AddSupplier from "../../supplier/component/AddSupplier";
import {
  createPurchaseOrder,
  getPurchaseOrderById,
  purchaseOrderDelete,
} from "@/app/services/PurchaseOrderService";
import { PharmacyData } from "@/app/types/PharmacyData";
import { getPharmacy } from "@/app/services/PharmacyService";
import Modal from "@/app/components/common/Modal";
import { toast } from "react-toastify";
import { UnitData } from "@/app/types/VariantData";
import { BsThreeDotsVertical } from "react-icons/bs";
import {
  handleNumericChange,
  restrictInvalidNumberKeys,
} from "@/app/components/common/RestrictedVal";
import AsyncSelect from "react-select/async";
import { customSelectStyles } from "@/app/components/common/DropdownStyle";
import EllipsisTooltip from "@/app/components/common/EllipsisTooltip";
import { components } from "react-select";
import SelectField from "@/app/components/common/SelectField";
import AddItemRow1 from "@/app/components/common/AddItemRow1";

interface PurchaseOrderProps {
  setShowPurchasOrder: (value: boolean) => void;
  orderIdNew?: string | null;
}

type OptionType = {
  label: string;
  value: string;
};

const PurchaseOrder: React.FC<PurchaseOrderProps> = ({
  setShowPurchasOrder,
  orderIdNew,
}) => {
  const [, setItems] = useState<ItemData[]>([]);
  const [suppliers, setSuppliers] = useState<SupplierData[]>([]);
  const [pharmacies, setPharmacies] = useState<PharmacyData[]>([]);

  const [, setShowDrawer] = useState<boolean>(false);
  const [showSupplier, setShowSupplier] = useState(false);
  const [showItem, setShowItem] = useState(false);
  const [currentItemId, setCurrentItemId] = useState<string | null>(null);


  const [modalConfirmCallback, setModalConfirmCallback] = useState<
    () => Promise<void> | void
  >(() => { });
  const [showModal, setShowModal] = useState(false);
  const [modalMessage, setModalMessage] = useState("");
  const [modalSecondaryMessage, setModalSecondaryMessage] = useState("");
  const [modalBgClass, setModalBgClass] = useState("");

  const defaultItemOptions = [{ label: "+ Add New Item", value: "newItem" }];
  const defaultSupplierOptions = [
    { label: "+ Add New Supplier", value: "newSupplier" },
  ];


  interface ModalOptions {
    message: string;
    secondaryMessage?: string;
    bgClassName?: string;
    onConfirmCallback: () => Promise<void> | void;
  }

  const [formData, setFormData] = useState<PurchaseOrderData>({
    orderId: "",
    orderId1: "",
    pharmacyId: 0,
    supplierId: "",
    supplierName: "",
    orderedDate: new Date(),
    intendedDeliveryDate: new Date(),
    totalAmount: 0,
    totalGst: 0,
    grandTotal: 0,
    purchaseOrderItemDtos: [],
  });

  const [orderItemRows, setorderItemRows] = useState<PurchaseOrderItem[]>([
    {
      itemId: "",
      itemName: "",
      packageQuantity: 0,
      manufacturer: "",
      unitTypeId: "",
      variantTypeId: "",
      variantName: "",
      unitName: "",
      gstPercentage: 0,
      gstAmount: 0,
      amount: 0,
      purchasePrice: 0,
    },
  ]);

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
    updatedFields: Partial<PurchaseOrderItem>
  ) => {
    setorderItemRows((prev) =>
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
        manufacturer: "",
        variantName: "",
        unitName: "",
        purchasePrice: 0,
        amount: 0,
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

      const updatedRow: Partial<PurchaseOrderItem> = {
        itemId: itemDetails.itemId,
        itemName: itemDetails.itemName,
        manufacturer: itemDetails.manufacturer,
        variantName: itemDetails.variantName,
        unitName: itemDetails.unitName,
        purchasePrice: itemDetails.purchasePrice,
        amount:
          (itemDetails.purchasePrice || 0) *
          (orderItemRows[index]?.packageQuantity || 1),
      };

      handleRowUpdate(index, updatedRow);
    } catch (error) {
      console.error("Error fetching item details:", error);
    }
  };

  const columns: {
    header: string;
    accessor:
    | keyof PurchaseOrderItem
    | ((row: PurchaseOrderItem, index: number) => React.ReactNode);
    className?: string;
  }[] = [
      {
        header: "Item Name",
        accessor: (row: PurchaseOrderItem, index: number) => (
          <AsyncSelect
            cacheOptions
            defaultOptions={defaultItemOptions}
            loadOptions={loadItemOptions}
            isClearable={true}
            value={
              row.itemId
                ? {
                  label: row.itemName || "",
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
        header: "Order Qty",
        accessor: (row: PurchaseOrderItem, index: number) => (
          <input
            type="number"
            name="packageQuantity"
            value={row.packageQuantity === 0 ? "" : row.packageQuantity}
            onKeyDown={restrictInvalidNumberKeys}
            onChange={handleNumericChange((e) => handleChange(e, index))}
            className="border border-gray-300 p-2 rounded w-24 text-left outline-none focus:ring-0 focus:outline-none"
          />
        ),
        className: "text-left",
      },

      {
        header: "Manufacturer",
        accessor: "manufacturer",
        className: "text-left",
      },

      {
        header: "Variant Type",
        accessor: "variantName",
        className: "text-left",
      },
      { header: "Unit Type", accessor: "unitName", className: "text-left" },
      {
        header: "Purchase Price",
        accessor: "purchasePrice",
        className: "text-left",
      },

      { header: "Estimated Amount", accessor: "amount", className: "text-left" },
      {
        header: "Action",
        accessor: (row: PurchaseOrderItem, index) => (
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

  const handleChange = async (
    e: React.ChangeEvent<HTMLSelectElement | HTMLInputElement>,
    index: number
  ) => {
    const { name, value } = e.target;

    if (name === "itemId") {
      try {
        const selectedItem = await getItemById(value);
        const variantDetails = await getVariantById(selectedItem.variantId);

        const matchedUnit = variantDetails?.unitDtos?.find(
          (unit: UnitData) => unit.unitId === selectedItem.unitId
        );

        setorderItemRows((prev) =>
          prev.map((row, i) =>
            i === index
              ? {
                ...row,
                itemId: selectedItem.itemId,
                itemName: selectedItem.itemName,
                manufacturer: selectedItem.manufacturer || "",
                variantTypeId: selectedItem.variantId,
                unitTypeId: selectedItem.unitId,
                purchasePrice: selectedItem.purchasePrice || 0,
                variantName: variantDetails?.variantName || "",
                unitName: matchedUnit?.unitName || "",
              }
              : row
          )
        );
      } catch (error) {
        console.error("Error fetching item or variant details:", error);
      }
    } else {
      setorderItemRows((prev) =>
        prev.map((row, i) =>
          i === index
            ? {
              ...row,
              [name]: value,
              amount:
                name === "packageQuantity"
                  ? parseFloat(value) * (row.purchasePrice || 0)
                  : name === "purchasePrice"
                    ? (row.packageQuantity || 0) * parseFloat(value)
                    : row.amount,
            }
            : row
        )
      );
    }
  };

  const handleDeleteRow = (index: number) => {
    if (orderItemRows.length === 1) {
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
        setorderItemRows(orderItemRows.filter((_, i) => i !== index));
      },
    });
  };

  const handlePurchaseOrderList = () => {
    setShowPurchasOrder(false);
  };

  useEffect(() => {
    setFormData((prev) => ({
      ...prev,
      orderedDate: new Date(),
      intendedDeliveryDate: new Date(),
    }));
  }, []);

  // const handleInputChange = (
  //   e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  // ) => {
  //   const { id, value } = e.target;

  //   setFormData((prev) => ({
  //     ...prev,
  //     [id]:
  //       id === "orderedDate" || id === "intendedDeliveryDate"
  //         ? new Date(value)
  //         : value,
  //   }));
  // };

  useEffect(() => {
    const fetchSuppliers = async () => {
      try {
        const response = await getSupplier();
        if (response?.data) {
          setSuppliers(response.data);
        }
      } catch (error) {
        console.error("Error fetching suppliers:", error);
      }
    };

    fetchSuppliers();
  }, []);

  const addNewRow = () => {
    setorderItemRows([
      ...orderItemRows,
      {
        itemId: "",
        itemName: "",
        packageQuantity: 0,
        manufacturer: "",
        gstPercentage: 0,
        gstAmount: 0,
        amount: 0,
        unitTypeId: "",
        variantTypeId: "",
        variantName: "",
        unitName: "",
        purchasePrice: 0,
      },
    ]);
  };

  useEffect(() => {
    const grandTotal = orderItemRows.reduce(
      (total, item) => total + (item.amount || 0),
      0
    );

    setFormData((prev) => ({
      ...prev,
      grandTotal,
    }));
  }, [orderItemRows]);

  const handleSupplierDrawer = () => {
    setShowItem(false);
    setShowSupplier(true);
    setShowDrawer(true);
  };

  const handleItemDrawer = (itemId?: string) => {
    if (itemId) {
      setCurrentItemId(itemId);
    }

    setShowSupplier(false);
    setShowItem(true);
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
    const fetchPharmacies = async () => {
      try {
        const data = await getPharmacy();
        setPharmacies(data?.data || []);
        if (!formData.pharmacyId && data.data.length > 0) {
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
  }, [formData.pharmacyId]);

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

  const addPurchaseOrder = () => {
    if (!formData.supplierId || !formData.supplierName?.trim()) {
      toast.error("Please select a supplier before saving the purchase order.");
      return;
    }

    if (!validatePurchaseOrder(orderItemRows)) {
      return;
    }

    const purchaseOrderData: PurchaseOrderData = {
      pharmacyId: formData.pharmacyId,
      supplierId: formData.supplierId,
      supplierName: formData.supplierName,
      orderedDate: new Date(formData.orderedDate),
      intendedDeliveryDate: new Date(formData.intendedDeliveryDate),
      totalAmount: 0,
      totalGst: 0,
      grandTotal: formData.grandTotal,
      purchaseOrderItemDtos: orderItemRows.map((row) => ({
        itemId: row.itemId,
        itemName: row.itemName,
        packageQuantity: row.packageQuantity,
        manufacturer: row.manufacturer,
        unitTypeId: row.unitTypeId,
        variantTypeId: row.variantTypeId,
        variantName: row.variantName,
        unitName: row.unitName,
        gstPercentage: row.gstPercentage || 0,
        gstAmount: row.gstAmount || 0,
        amount: row.amount || 0,
        purchasePrice: row.purchasePrice || 0,
      })),
    };

    handleShowModal({
      message:
        "Are you sure you want to confirm the order? Once confirmed cannot be edited",
      secondaryMessage: "Confirm Order Completion",
      bgClassName: "bg-darkPurple",
      onConfirmCallback: async () => {
        try {
          await createPurchaseOrder(purchaseOrderData);
          setFormData({
            orderId: "",
            orderId1: "",
            pharmacyId: 0,
            supplierId: "",
            supplierName: "",
            orderedDate: new Date(),
            intendedDeliveryDate: new Date(),
            totalAmount: 0,
            totalGst: 0,
            grandTotal: 0,
            purchaseOrderItemDtos: [],
          });

          setorderItemRows([
            {
              itemId: "",
              itemName: "",
              packageQuantity: 0,
              manufacturer: "",
              unitTypeId: "",
              variantTypeId: "",
              variantName: "",
              unitName: "",
              gstPercentage: 0,
              gstAmount: 0,
              amount: 0,
              purchasePrice: 0,
            },
          ]);

          window.location.reload();
        } catch (error) {
          console.error("Failed to submit purchase order:", error);
          toast.error("Failed to submit purchase order. Please try again.");
        }
      },
    });
  };

  useEffect(() => {
    const fetchPurchaseOrder = async () => {
      if (!orderIdNew) return;

      try {
        const data = await getPurchaseOrderById(orderIdNew);

        setFormData({
          orderId: data.orderId || "",
          orderId1: data.orderId1 || "",
          pharmacyId: data.pharmacyId || "",
          supplierId: data.supplierId || "",
          supplierName: data.supplierName || "",
          orderedDate: new Date(data.orderedDate),
          intendedDeliveryDate: new Date(data.intendedDeliveryDate),
          totalAmount: data.totalAmount || 0,
          totalGst: data.totalGst || 0,
          grandTotal: data.grandTotal || 0,
          purchaseOrderItemDtos: data.purchaseOrderItemDtos || [],
        });

        setorderItemRows(
          (data.purchaseOrderItemDtos || []).map((item: PurchaseOrderItem) => ({
            itemId: item.itemId || "",
            itemName: item.itemName || "",
            packageQuantity: item.packageQuantity || 0,
            manufacturer: item.manufacturer || "",
            unitTypeId: item.unitTypeId || "",
            variantTypeId: item.variantTypeId || "",
            variantName: item.variantName || "",
            unitName: item.unitName || "",
            gstPercentage: item.gstPercentage || 0,
            gstAmount: item.gstAmount || 0,
            amount: item.amount || 0,
            purchasePrice: item.purchasePrice || 0,
          }))
        );
      } catch (error) {
        console.error("Failed to fetch and load purchase order:", error);
      }
    };

    fetchPurchaseOrder();
  }, [orderIdNew]);

  const deletePurchaseOrder = async () => {
    if (!orderIdNew) return;

    handleShowModal({
      message:
        "Are you sure you want to delete this order? This action cannot be undone",
      secondaryMessage: "Confirm Deletion",
      bgClassName: "bg-darkRed",
      onConfirmCallback: async () => {
        try {
          await purchaseOrderDelete(orderIdNew);
          toast.success("Purchase order deleted successfully!", {
            position: "top-right",
            autoClose: 3000,
          });
          setShowPurchasOrder(false);
          window.location.reload();
        } catch (error) {
          console.error("Delete failed:", error);
          toast.error("Failed to delete purchase order.", {
            position: "top-right",
            autoClose: 3000,
          });
        }
      },
    });
  };

  const validatePurchaseOrder = (items: typeof orderItemRows) => {
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (!item.itemId || !item.itemName?.trim()) {
        toast.error(`Item Name is required in row ${i + 1}`);
        return false;
      }
      if (!item.packageQuantity || item.packageQuantity <= 0) {
        toast.error(`Order Qty is required in row ${i + 1}`);
        return false;
      }
    }
    return true;
  };

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
          <AddItem setShowDrawer={handleCloseDrawer} itemId={currentItemId} />
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
            New Purchase Order
          </div>

          <div>
            <Button
              onClick={() => handlePurchaseOrderList()}
              label="Purchase Order List"
              value=""
              className="w-48 bg-darkPurple text-white h-11"
              icon={<ClipboardList size={15} />}
            ></Button>
          </div>
        </div>

        <div className="border border-Gray w-full rounded-lg p-5">
          <div className="justify-start text-black text-lg font-normal leading-7">
            Basic Details
          </div>

          <div className="relative mt-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {[
              { id: "orderedDate", label: "Order Date", type: "date" },
              { id: "pharmacyId", label: "Pharmacy", type: "text" },
              { id: "supplierId", label: "Supplier", type: "dropdown" },
              {
                id: "intendedDeliveryDate",
                label: "Intended Delivery Date",
                type: "date",
              },
            ].map(({ id, label, type }) => (
              <div key={id} className="relative w-full">
                {id === "supplierId" ? (
                  <>
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
                  </>
                ) : id === "pharmacyId" ? (
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
                        (pharmacies ?? []).find(
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
                    min={
                      id === "intendedDeliveryDate"
                        ? new Date().toISOString().split("T")[0]
                        : undefined
                    }
                    max={
                      id === "intendedDeliveryDate"
                        ? undefined
                        : id === "orderedDate"
                          ? new Date().toISOString().split("T")[0]
                          : undefined
                    }
                    value={
                      id === "orderedDate"
                        ? new Date().toISOString().split("T")[0] // Always today's date
                        : id === "intendedDeliveryDate"
                          ? typeof formData[id as keyof PurchaseOrderData] ===
                            "string"
                            ? (formData[id as keyof PurchaseOrderData] as string)
                            : formData[id as keyof PurchaseOrderData] instanceof
                              Date
                              ? (formData[id as keyof PurchaseOrderData] as Date)
                                .toISOString()
                                .split("T")[0]
                              : ""
                          : formData[id as keyof PurchaseOrderData]?.toString() ??
                          ""
                    }
                    onChange={(e) => {
                      if (id !== "orderedDate") {
                        setFormData((prev) => ({
                          ...prev,
                          [id]: e.target.value,
                        }));
                      }
                    }}
                    readOnly={id === "orderedDate"}
                    disabled={id === "orderedDate"}
                  />
                )}
              </div>
            ))}
          </div>
        </div>

        <Table
          data={orderItemRows}
          columns={columns}
          noDataMessage="No purchase items found"
        />

        <div>
          <AddItemRow1 onClick={addNewRow} />
        </div>

        <div className="border h-auto w-lg border-Gray rounded-xl p-6 space-y-6 ml-auto font-normal text-sm">
          {[
            {
              label: "GRAND TOTAL",
              value: formData.grandTotal.toFixed(2),

              isTotal: true,
            },
          ].map(({ label, value, isTotal }, index) => (
            <div
              key={index}
              className={`flex justify-between ${isTotal
                  ? "font-semibold text-base bg-gray h-8 p-1 items-center rounded-lg"
                  : ""
                }`}
            >
              <div>{label}</div>
              <div>₹{value}</div>
            </div>
          ))}
        </div>
        <div className="flex justify-end space-x-4">
          {!orderIdNew && (
            <Button
              onClick={addPurchaseOrder}
              label="Confirm"
              value=""
              className="w-28 bg-darkPurple text-white h-11"
            />
          )}

          {orderIdNew && (
            <Button
              onClick={deletePurchaseOrder}
              label="Delete"
              value=""
              className="w-28 bg-darkRed text-white h-11"
            />
          )}
        </div>
      </main>
    </>
  );
};

export default PurchaseOrder;
