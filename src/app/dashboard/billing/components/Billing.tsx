"use client";

import Button from "@/app/components/common/Button";
import Drawer from "@/app/components/common/Drawer";
import Table from "@/app/components/common/Table";
import { BillingData, BillingItemData } from "@/app/types/BillingData";
import { ClipboardList, Plus } from "lucide-react";
import React, { useEffect, useRef, useState } from "react";
import { InputActionMeta } from "react-select";
import { BsThreeDotsVertical } from "react-icons/bs";
import Patient from "../../patient/components/Patient";
import ItemDropdown from "@/app/components/common/ItemDropdown";
import { getPatient, maxPatientId } from "@/app/services/PatientService";
import { PatientData } from "@/app/types/PatientData";
import SelectField from "@/app/components/common/SelectField";
import { getInventoryDetails } from "@/app/services/InventoryService";
import { getItemById } from "@/app/services/ItemService";
import { toast } from "react-toastify";
import Modal from "@/app/components/common/Modal";
import { createBilling } from "@/app/services/BillingService";
import Doctor from "../../doctor/components/Doctor";
import { getDoctor } from "@/app/services/DoctorService";
import {
  handleNumericChange,
  restrictInvalidNumberKeys,
} from "@/app/components/common/RestrictedVal";
import { DoctorData } from "@/app/types/DoctorData";
import { getPharmacy } from "@/app/services/PharmacyService";
import { PharmacyData } from "@/app/types/PharmacyData";
import { billingItemSchema, billingSchema } from "@/app/schema/BillingSchema";
import { ZodError, ZodIssue } from "zod";

interface BillingProps {
  setShowBilling: (value: boolean) => void;
}

type OptionType = {
  label: string;
  value: string;
};

interface PatientOption {
  label: string;
  value: string;
  patientName: string;
  gender: string;
  patientId: string;
  patientId1: string;
  phone: number;
  patientAddress?: string;
  patientCity?: string;
}

const editablePatientFields = [
  "patientName",
  "gender",
  "patientAddress",
] as const;

type EditablePatientField = (typeof editablePatientFields)[number];

const isEditablePatientField = (
  field: string
): field is EditablePatientField => {
  return editablePatientFields.includes(field as EditablePatientField);
};

const getIncrementedPatientId = (currentId: string): string => {
  if (!currentId) {
    return "";
  }

  const digitMatch = currentId.match(/(\d+)(?!.*\d)/);

  if (!digitMatch || digitMatch.index === undefined) {
    return currentId;
  }

  const digits = digitMatch[1];
  const prefix = currentId.slice(0, digitMatch.index);
  const suffix = currentId.slice(digitMatch.index + digits.length);

  const incrementedNumber = (parseInt(digits, 10) + 1)
    .toString()
    .padStart(digits.length, "0");

  return `${prefix}${incrementedNumber}${suffix}`;
};

const Billing: React.FC<BillingProps> = ({ setShowBilling }) => {
  const [showPatient, setShowPatient] = useState(false);
  const [showDoctor, setShowDoctor] = useState(false);
  const [, setShowDrawer] = useState<boolean>(false);
  const [, setBillingItems] = useState<BillingItemData[]>([]);
  const [mobileOptions, setMobileOptions] = useState<PatientOption[]>([]);
  const [, setDoctorOptions] = useState<OptionType[]>([]);
  const [, setPharmacies] = useState<PharmacyData[]>([]);
  const [selectedMobile, setSelectedMobile] = useState<string | null>(null);
  const [mobileInputValue, setMobileInputValue] = useState("");
  const [patientData, setPatientData] = useState<Partial<PatientData>>({});
  const [nextPatientId, setNextPatientId] = useState<string>("");
  const [showModal, setShowModal] = useState(false);
  const [modalMessage, setModalMessage] = useState("");
  const [modalSecondaryMessage, setModalSecondaryMessage] = useState("");
  const [modalBgClass, setModalBgClass] = useState("");
  const [modalCancelCallback, setModalCancelCallback] = useState<() => void>(
    () => {}
  );
  const [modalConfirmCallback, setModalConfirmCallback] = useState<
    () => Promise<void> | void
  >(() => {});

  const defaultDoctorOptions = [
    { label: "+ Add New Doctor", value: "newDoctor" },
  ];

  interface ModalOptions {
    message: string;
    secondaryMessage?: string;
    bgClassName?: string;
    onConfirmCallback: () => Promise<void> | void;
    onCancelCallback?: () => void;
  }

  const [formData, setFormData] = useState<BillingData>({
    billId: "",
    billId1: "",
    pharmacyId: "",
    billDateTime: new Date(),
    patientId: "",
    patientId1: "",
    patientName: "",
    patientAddress: "",
    patientCity: "",
    gender: "",
    doctorId: "",
    patientType: "Walkin",
    phone: 0,
    subTotal: 0,
    totalGst: 0,
    totalDiscount: 0,
    grandTotal: 0,
    paymentStatus: "",
    paymentType: "",
    receivedAmount: 0,
    balanceAmount: 0,
    upi: 0,
    cash: 0,
    billItemDtos: [],
  });

  const [billingItemRows, setBillingItemRows] = useState<BillingItemData[]>([
    {
      billItemId: "",
      itemId: "",
      itemName: "",
      batchNo: "",
      expiryDate: null,
      packageQuantity: 0,
      availableQuantity: 0,
      discountPercentage: 0,
      discountAmount: 0,
      mrpSalePricePerUnit: 0,
      gstPercentage: 0,
      gstAmount: 0,
      netTotal: 0,
      grossTotal: 0,
    },
  ]);

  const addNewRow = () => {
    const newRow: BillingItemData = {
      billItemId: "",
      itemId: "",
      itemName: "",
      batchNo: "",
      expiryDate: null,
      packageQuantity: 0,
      availableQuantity: 0,
      discountPercentage: 0,
      discountAmount: 0,
      mrpSalePricePerUnit: 0,
      gstPercentage: 0,
      gstAmount: 0,
      netTotal: 0,
      grossTotal: 0,
    };

    setBillingItemRows((prev) => [...prev, newRow]);
    setBillingItems((prev) => [...prev, newRow]);
  };

  const clearBillingRow = (): BillingItemData => ({
    billItemId: "",
    itemId: "",
    itemName: "",
    batchNo: "",
    expiryDate: null,
    packageQuantity: 0,
    availableQuantity: 0,
    discountPercentage: 0,
    discountAmount: 0,
    mrpSalePricePerUnit: 0,
    gstPercentage: 0,
    gstAmount: 0,
    netTotal: 0,
    grossTotal: 0,
  });

  const handleItemChange = async (
    index: number,
    selectedOption: { label: string; value: string }
  ) => {
    try {
      const [itemId, batchNo] = selectedOption.value.split("__");

      const { data: inventory = [] } = await getInventoryDetails();

      const inventoryItem = inventory.find(
        (inv: BillingItemData) =>
          inv.itemId === itemId && inv.batchNo === batchNo
      );

      if (!inventoryItem) {
        console.warn("Inventory item not found");
        return;
      }

      // Check for duplicate selection of same item+batch
      const isDuplicate = billingItemRows.some((item, idx) => {
        return (
          idx !== index && item.itemId === itemId && item.batchNo === batchNo
        );
      });

      if (isDuplicate) {
        toast.error(`Item "${selectedOption.label}" is already selected.`, {
          position: "top-right",
          autoClose: 3000,
        });

        // Clear the row if duplicate
        const updatedRows = [...billingItemRows];
        updatedRows[index] = {
          ...updatedRows[index],
          itemId: "",
          itemName: "",
          batchNo: "",
          expiryDate: null,
          packageQuantity: 0,
          availableQuantity: 0,
          discountPercentage: 0,
          discountAmount: 0,
          mrpSalePricePerUnit: 0,
          gstPercentage: 0,
          gstAmount: 0,
          netTotal: 0,
          grossTotal: 0,
        };
        setBillingItemRows(updatedRows);
        setBillingItems(updatedRows);
        return;
      }

      const item = await getItemById(itemId);

      const updatedItem: BillingItemData = {
        billItemId: "",
        itemId,
        itemName: item.itemName,
        batchNo,
        expiryDate: inventoryItem.expiryDate,
        packageQuantity: 0,
        availableQuantity: inventoryItem.packageQuantity,
        discountPercentage: 0,
        discountAmount: 0,
        mrpSalePricePerUnit:
          inventoryItem.mrpSalePricePerUnit ?? item.mrpSalePricePerUnit ?? 0,
        gstPercentage: inventoryItem.gstPercentage,
        gstAmount: inventoryItem.gstAmount,
        netTotal: 0,
        grossTotal: 0,
      };

      // Price calculations
      const baseAmount =
        updatedItem.packageQuantity * updatedItem.mrpSalePricePerUnit;
      const discount = parseFloat(
        ((baseAmount * updatedItem.discountPercentage) / 100).toFixed(2)
      );
      const net = parseFloat((baseAmount - discount).toFixed(2));
      const gst = parseFloat(
        ((net * updatedItem.gstPercentage) / 100).toFixed(2)
      );
      const gross = parseFloat((net + gst).toFixed(2));

      updatedItem.discountAmount = discount;
      updatedItem.gstAmount = gst;
      updatedItem.netTotal = net;
      updatedItem.grossTotal = gross;

      const updatedRows = [...billingItemRows];
      updatedRows[index] = updatedItem;
      setBillingItemRows(updatedRows);
      setBillingItems(updatedRows);
    } catch (err) {
      console.error("Error loading item details:", err);
    }
  };

  const columns: {
    header: string;
    accessor:
      | keyof BillingItemData
      | ((row: BillingItemData, index: number) => React.ReactNode);
    className?: string;
  }[] = [
    {
      header: "Item Name",
      accessor: (row: BillingItemData, index: number) => {
        const selectedOption =
          row.itemId && row.batchNo
            ? {
                value: `${row.itemId}__${row.batchNo}`,
                label: `${row.itemName}`,
                batchNo: row.batchNo,
                itemId: row.itemId,
                packageQty: row.availableQuantity,
              }
            : null;

        return (
          <ItemDropdown
            selectedOption={selectedOption}
            onChange={(selectedOption) => {
              if (!selectedOption) {
                const clearedRows = [...billingItemRows];
                clearedRows[index] = clearBillingRow();
                setBillingItemRows(clearedRows);
                setBillingItems(clearedRows);
                return;
              }

              handleItemChange(index, selectedOption);
            }}
          />
        );
      },
      className: "text-left outline-none focus:border-purple-900 focus:ring-0",
    },

    {
      header: "Batch No.",
      accessor: "batchNo",
      className: "text-left",
    },
    {
      header: "Expiry Date",
      accessor: (row: BillingItemData) => {
        if (!row.expiryDate || isNaN(new Date(row.expiryDate).getTime())) {
          return "-";
        }
        return new Date(row.expiryDate).toLocaleDateString("en-GB"); // DD/MM/YYYY
      },
      className: "text-left",
    },

    {
      header: "Pack Qty.",
      accessor: (row: BillingItemData, index: number) => (
        <div className="flex flex-col">
          <input
            type="number"
            min="0"
            value={row.packageQuantity === 0 ? "" : row.packageQuantity}
            className="w-20 border border-gray-300 rounded px-2 py-1 outline-none focus:ring-0 focus:outline-none"
            onChange={(e) =>
              handleBillingItemChange(
                index,
                "packageQuantity",
                Number(e.target.value)
              )
            }
          />
          <span className="text-xs text-gray-500 mt-1">
            Available: {row.availableQuantity ?? 0}
          </span>
        </div>
      ),
      className: "text-left",
    },

    {
      header: "Price / Unit ",
      accessor: "mrpSalePricePerUnit",
      className: "text-left",
    },
    {
      header: "Discount %",
      accessor: (row: BillingItemData, index: number) => (
        <input
          type="number"
          min="0"
          value={row.discountPercentage === 0 ? "" : row.discountPercentage}
          className="w-20 border border-gray-300 rounded px-2 py-1 outline-none focus:ring-0 focus:outline-none"
          onChange={(e) =>
            handleBillingItemChange(
              index,
              "discountPercentage",
              Number(e.target.value)
            )
          }
        />
      ),
      className: "text-left",
    },
    {
      header: "Discount",
      accessor: "discountAmount",
      className: "text-left",
    },
    {
      header: "GST %",
      accessor: "gstPercentage",
      className: "text-left",
    },
    {
      header: "GST",
      accessor: "gstAmount",
      className: "text-left",
    },
    {
      header: "Gross",
      accessor: "netTotal",
      className: "text-left",
    },
    {
      header: "Net",
      accessor: "grossTotal",
      className: "text-left",
    },

    {
      header: "Action",
      accessor: (row: BillingItemData, index: number) => (
        <div className="relative group">
          <button className="p-2 rounded-full hover:bg-gray-200 cursor-pointer">
            <BsThreeDotsVertical size={18} />
          </button>

          <div className="absolute right-0 mt-2 w-32 bg-white shadow-xl rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 z-10">
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

  const handleBillingItemChange = (
    index: number,
    field: keyof BillingItemData,
    value: number
  ) => {
    const updatedRows = [...billingItemRows];
    const row = { ...updatedRows[index], [field]: value };

    if (field === "packageQuantity") {
      const available = row.availableQuantity ?? 0;
      if (value > available) {
        toast.error(
          `Entered Package quantity (${value}) exceeds Available quantity (${available})`,
          {
            position: "top-right",
            autoClose: 3000,
          }
        );
        return;
      }
    }

    const baseAmount = row.packageQuantity * row.mrpSalePricePerUnit;
    const discount = parseFloat(
      ((baseAmount * row.discountPercentage) / 100).toFixed(2)
    );
    const net = parseFloat((baseAmount - discount).toFixed(2));
    const gst = parseFloat(((net * row.gstPercentage) / 100).toFixed(2));
    const gross = parseFloat((net + gst).toFixed(2));

    row.discountAmount = discount;
    row.gstAmount = gst;
    row.netTotal = net;
    row.grossTotal = gross;

    updatedRows[index] = row;
    setBillingItemRows(updatedRows);
    setBillingItems(updatedRows);
  };

  const fetchMobileNumbers = async () => {
    try {
      const patients = await getPatient();
      const options = patients.map((p: PatientData) => ({
        label: `${p.phone} - ${p.patientName}`,
        value: `${p.phone}_${p.patientId}`,
        phone: p.phone,
        patientName: p.patientName,
        gender: p.gender,
        patientId: p.patientId,
        patientId1: p.patientId1,
        patientAddress: p.patientAddress,
        patientCity: p.patientCity,
      }));

      setMobileOptions(options);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchMobileNumbers();
  }, []);

  useEffect(() => {
    const fetchNextPatientId = async () => {
      try {
        const maxId = await maxPatientId();
        if (maxId) {
          setNextPatientId(getIncrementedPatientId(maxId));
        } else {
          setNextPatientId("");
        }
      } catch (error) {
        console.error("Failed to fetch next patient id", error);
      }
    };

    fetchNextPatientId();
  }, []);

  useEffect(() => {
    if (!selectedMobile && nextPatientId) {
      setPatientData((prev) => ({
        ...prev,
        patientId1: nextPatientId,
      }));

      setFormData((prev) => ({
        ...prev,
        patientId1: nextPatientId,
      }));
    }
  }, [nextPatientId, selectedMobile]);

  const loadMobileOptions = (
    inputValue: string,
    callback: (options: OptionType[]) => void
  ) => {
    const filtered = mobileOptions.filter(
      (opt) =>
        opt.label.toLowerCase().includes(inputValue.toLowerCase()) ||
        String(opt.value).toLowerCase().includes(inputValue.toLowerCase())
    );

    // const addNewOption = {
    //   label: "+ Add New Patient",
    //   value: "newPatient",
    // };

    // callback([addNewOption, ...filtered]);
    callback(filtered);
  };

  const handleMobileSelect = (
    selected: { label: string; value: string } | null
  ) => {
    if (!selected) {
      clearPatientSelection();
      setMobileInputValue("");
      return;
    }

    setSelectedMobile(selected.value);
    setMobileInputValue("");

    const [phonePart, patientIdPart] = selected.value.split("_");

    const found = mobileOptions.find(
      (opt) =>
        String(opt.phone) === phonePart &&
        String(opt.patientId) === patientIdPart
    );

    if (found) {
      setPatientData({
        phone: Number(found.phone),
        patientName: found.patientName,
        gender: found.gender || "Not Available",
        patientAddress: found.patientAddress || "Not Available",
        patientCity: found.patientCity || "Not Available",
      });

      setFormData((prev) => ({
        ...prev,
        patientId: found.patientId,
        patientId1: found.patientId1 || "",
        patientName: found.patientName,
        phone: Number(found.phone),
        gender: found.gender || "",
        patientAddress: found.patientAddress || "",
        patientCity: found.patientCity || "",
      }));
    }
  };

  const fetchDoctorOptions = async () => {
    try {
      const doctors = await getDoctor();
      const options = doctors.map((doc: DoctorData) => ({
        label: `${doc.doctorName}`,
        value: doc.doctorId,
      }));
      setDoctorOptions(options);
    } catch (error) {
      console.error("Failed to fetch doctor options:", error);
    }
  };

  useEffect(() => {
    fetchDoctorOptions();
  }, []);

  const loadDoctorOptions = async (
    inputValue: string,
    callback: (options: OptionType[]) => void
  ) => {
    try {
      const doctors = await getDoctor();
      const filtered = doctors
        .filter((doc: DoctorData) =>
          doc.doctorName.toLowerCase().includes(inputValue.toLowerCase())
        )
        .map((doc: DoctorData) => ({
          label: `${doc.doctorName}`,
          value: doc.doctorId,
        }));
      callback([...defaultDoctorOptions, ...filtered]);
    } catch (error) {
      console.error("Failed to load doctor options", error);
      callback(defaultDoctorOptions);
    }
  };

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;

    setFormData((prev) => {
      const isNumberField = ![
        "paymentStatus",
        "paymentType",
        "patientType",
        "patientId1",
        "doctorId",
      ].includes(name);

      const parsedValue = isNumberField ? parseFloat(value) || 0 : value;

      const updatedData: typeof prev = {
        ...prev,
        [name]: parsedValue,
      };

      if (
        name === "receivedAmount" &&
        prev.paymentType === "cash" &&
        typeof parsedValue === "number"
      ) {
        updatedData.balanceAmount = parseFloat(
          (prev.grandTotal - parsedValue).toFixed(2)

        );
      }

      return updatedData;
    });
  };

  const handleDeleteRow = (index: number) => {
    if (billingItemRows.length === 1) {
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
        setBillingItemRows(billingItemRows.filter((_, i) => i !== index));
      },
    });
  };

  const handleShowModal = (options: ModalOptions) => {
    setModalMessage(options.message);
    setModalSecondaryMessage(options.secondaryMessage || "");
    setModalBgClass(options.bgClassName || "");
    setModalConfirmCallback(() => options.onConfirmCallback);

    setModalCancelCallback(() => options.onCancelCallback || (() => {}));

    setShowModal(true);
  };

  const handleModalConfirm = async () => {
    await modalConfirmCallback();
    setShowModal(false);
  };

  const handleModalCancel = () => {
    if (modalCancelCallback) {
      modalCancelCallback();
    }
    setShowModal(false);
  };

  const resetPatientDetails = () => {
    setPatientData({
      phone: 0,
      patientName: "",
      gender: "",
      patientAddress: "",
      patientCity: "",
      patientId1: nextPatientId || "",
    });
  };

  const getClearedPatientFormFields = () => ({
    patientId: "",
    patientId1: nextPatientId || "",
    patientName: "",
    patientAddress: "",
    patientCity: "",
    gender: "",
    phone: 0,
  });

  const handlePatientDetailsChange =
    (field: EditablePatientField) =>
    (
      e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
    ) => {
      const { value } = e.target;

      setPatientData((prev) => ({
        ...prev,
        [field]: value,
      }));

      setFormData((prev) => ({
        ...prev,
        [field]: value,
      }));
    };

  const clearPatientSelection = () => {
    setSelectedMobile(null);
    resetPatientDetails();
    setFormData((prev) => ({
      ...prev,
      patientType: "",
      doctorId: "",
      ...getClearedPatientFormFields(),
    }));
  };

  const handleMobileInputChange = (
    value: string,
    actionMeta: InputActionMeta
  ) => {
    if (actionMeta.action === "set-value") {
      setMobileInputValue(value);
      return;
    }

    if (
      actionMeta.action === "input-blur" ||
      actionMeta.action === "menu-close"
    ) {
      return;
    }

    setMobileInputValue(value);

    if (actionMeta.action === "input-change") {
      const numericPhone = value ? Number(value) : 0;

      if (selectedMobile) {
        clearPatientSelection();
      }

      setPatientData((prev) => ({
        ...prev,
        phone: numericPhone,
      }));

      setFormData((prev) => ({
        ...prev,
        phone: numericPhone,
      }));
    }

    if (!value) {
      clearPatientSelection();
    }
  };

  const handlePatientDrawer = () => {
    setShowPatient(true);
    setShowDrawer(true);
    setShowDoctor(false);
  };

  const handleDoctorDrawer = () => {
    setShowDoctor(true);
    setShowDrawer(true);
    setShowPatient(false);
  };

  const handleCloseDrawer = async () => {
    setShowDrawer(false);
    setShowPatient(false);
    setShowDoctor(false);
  };

  const handleBillingList = () => {
    setShowBilling(false);
  };

  useEffect(() => {
    const subTotal = billingItemRows.reduce(
      (acc, item) => acc + (item.netTotal || 0),
      0
    );
    const totalGST = billingItemRows.reduce(
      (acc, item) => acc + (item.gstAmount || 0),
      0
    );
    const totalDiscount = billingItemRows.reduce(
      (acc, item) => acc + (item.discountAmount || 0),
      0
    );
    const grandTotal = subTotal + totalGST - totalDiscount;

    setFormData((prev) => ({
      ...prev,
      subTotal,
      totalGst: totalGST,
      totalDiscount,
      grandTotal,
    }));
  }, [billingItemRows]);

  useEffect(() => {
    if (formData.paymentStatus === "pending" && formData.paymentType !== "") {
      setFormData((prev) => ({
        ...prev,
        paymentType: "",
        receivedAmount: 0,
        balanceAmount: 0,
      }));
    }
  }, [formData.paymentStatus, formData.paymentType]);

  const addBilling = () => {
    try {
      billingSchema.parse(formData);

      billingItemRows.forEach((item,) => {
        billingItemSchema.parse(item);
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

    handleShowModal({
      message:
        "Are you sure you want to confirm the Billing? Once confirmed, this Bill cannot be edited.",
      secondaryMessage: "Confirm Billing",
      bgClassName: "bg-darkPurple",
      onConfirmCallback: async () => {
        try {
          const { ...payloadWithoutDoctorName } = formData;

          const billingPayload: BillingData = {
            ...payloadWithoutDoctorName,
            billItemDtos: billingItemRows,
          };

          const response = await createBilling(billingPayload);

          console.log("Billing saved successfully:", response);
          toast.success("Billing saved successfully!");

          setFormData({
            billId: "",
            billId1: "",
            pharmacyId: "",
            billDateTime: new Date(),
            patientId: "",
            patientId1: "",
            patientName: "",
            doctorId: "",
            patientType: "Walkin",
            subTotal: 0,
            totalGst: 0,
            totalDiscount: 0,
            grandTotal: 0,
            paymentStatus: "",
            paymentType: "",
            receivedAmount: 0,
            balanceAmount: 0,
            upi: 0,
            cash: 0,
            billItemDtos: [],
          });

          setBillingItemRows([]);
          window.location.reload();
        } catch (error: unknown) {
          if (error instanceof Error) {
            console.error("Error saving billing:", error.message);
            toast.error(`Error: ${error.message}`);
          } else {
            console.error("Unexpected error:", error);
            toast.error("An unexpected error occurred.");
          }
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

      {showPatient && (
        <Drawer setShowDrawer={handleCloseDrawer} title={"Add New Patient"}>
          <Patient
            setShowDrawer={handleCloseDrawer}
            onPatientAdded={fetchMobileNumbers}
          />
        </Drawer>
      )}

      {showDoctor && (
        <Drawer setShowDrawer={handleCloseDrawer} title={"Add New Doctor"}>
          <Doctor
            setShowDrawer={handleCloseDrawer}
            onDoctorAdded={fetchDoctorOptions}
          />
        </Drawer>
      )}

      <main className="space-y-6">
        <div className="flex justify-between">
          <div className="justify-start text-darkPurple text-3xl font-medium leading-10 ">
            Generate Sale
          </div>

          <div>
            <Button
              onClick={() => handleBillingList()}
              label="Sales List"
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

          <div className="relative mt-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-4 gap-2">
            {[
              {
                id: "phone",
                label: "Mobile Number",
                type: "text",
                readOnly: false,
              },
              {
                id: "patientName",
                label: "Patient Name",
                type: "text",
                readOnly: true,
              },
              {
                id: "gender",
                label: "Gender",
                type: "text",
                readOnly: true,
              },
              {
                id: "patientAddress",
                label: "Address",
                type: "text",
                readOnly: true,
              },
            ].map(({ id, label, type, readOnly }) => {
              if (id === "phone") {
                return (
                  <div key={id} className="relative w-full z-50">
                    <SelectField
                      value={
                        mobileOptions.find(
                          (opt) => opt.value === selectedMobile
                        ) || null
                      }
                      onChange={handleMobileSelect}
                      label="Mobile Number"
                      loadOptions={loadMobileOptions}
                      inputValue={mobileInputValue}
                      onInputChange={handleMobileInputChange}
                      formatOptionLabel={(data, { context }) => {
                        const option = data as PatientOption;

                        return context === "value"
                          ? option.phone
                          : `${option.phone} - ${option.patientName}`;
                      }}
                    />
                  </div>
                );
              }

              if (id === "gender" && !selectedMobile) {
                return (
                  <div key={id} className="relative w-full">
                    <label
                      htmlFor={id}
                      className="absolute left-3 top-0 -translate-y-1/2 bg-white px-1 text-gray-500 text-xs transition-all"
                    >
                      {label}
                    </label>
                    <select
                      id={id}
                      name={id}
                      value={patientData.gender?.toString() ?? ""}
                      onChange={handlePatientDetailsChange("gender")}
                      className="peer w-full h-[49px] px-3 py-3 border border-Gray rounded-md bg-transparent text-black outline-none focus:border-purple-900 focus:ring-0"
                    >
                      <option value="">Select Gender</option>
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                );
              }

              const isEditable = isEditablePatientField(id);
              const computedReadOnly = isEditable
                ? Boolean(selectedMobile)
                : readOnly;
              const changeHandler = isEditable
                ? handlePatientDetailsChange(id)
                : undefined;

              return (
                <div key={id} className="relative w-full">
                  <label
                    htmlFor={id}
                    className="absolute left-3 top-0 -translate-y-1/2 bg-white px-1 text-gray-500 text-xs transition-all"
                  >
                    {label}
                  </label>
                  <input
                    id={id}
                    name={id}
                    type={type}
                    readOnly={computedReadOnly}
                    value={
                      patientData[id as keyof typeof patientData] instanceof
                      Date
                        ? (patientData[id as keyof typeof patientData] as Date)
                            .toISOString()
                            .split("T")[0]
                        : patientData[
                            id as keyof typeof patientData
                          ]?.toString() || ""
                    }
                    onChange={changeHandler}
                    className="peer w-full h-[49px] px-3 py-3 border border-Gray rounded-md bg-transparent text-black outline-none focus:border-purple-900 focus:ring-0"
                  />
                </div>
              );
            })}
          </div>

          <div className="relative mt-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-4 gap-2">
            {[
              {
                id: "patientId1",
                label: "Patient ID",
                type: "text",
                readOnly: true,
              },
              {
                id: "patientType",
                label: "Patient Type",
                type: "text",
                readOnly: false,
              },
              {
                id: "doctorId",
                label: "Doctor Referred",
                type: "text",
                readOnly: false,
              },
              {
                id: "patientCity",
                label: "City",
                type: "text",
                readOnly: false,
              },
            ].map(({ id, label, type, readOnly }) => (
              <div key={id} className="relative w-full z-50">
                <label
                  htmlFor={id}
                  className="absolute left-3 top-0 -translate-y-1/2 bg-white px-1 text-gray-500 text-xs transition-all"
                >
                  {label}
                </label>

                {id === "patientType" ? (
                  <select
                    id={id}
                    name={id}
                    value={formData.patientType}
                    onChange={handleInputChange}
                    className="peer w-full h-[49px] px-3 py-3 border border-Gray rounded-md bg-transparent text-black outline-none focus:border-purple-900 focus:ring-0"
                  >
                    <option value="Walkin">Walkin</option>
                    <option value="IP">IP</option>
                    <option value="OP">OP</option>
                  </select>
                ) : id === "doctorId" ? (
                  <SelectField
                    value={
                      formData.doctorId && formData.doctorName
                        ? {
                            label: formData.doctorName,
                            value: formData.doctorId,
                          }
                        : null
                    }
                    onChange={(selected) => {
                      if (selected?.value === "newDoctor") {
                        handleDoctorDrawer();
                        return;
                      }
                      setFormData((prev) => ({
                        ...prev,
                        doctorId: selected?.value || "",
                        doctorName: selected?.label || "",
                      }));
                    }}
                    label="Doctor Referred"
                    loadOptions={loadDoctorOptions}
                    defaultOptions={defaultDoctorOptions}
                    formatOptionLabel={(data) => data.label}
                  />
                ) : (
                  <input
                    id={id}
                    name={id}
                    type={type}
                    readOnly={id === "patientId1" ? true : readOnly}
                    value={
                      id === "doctorId"
                        ? formData.doctorName || ""
                        : formData[id as keyof typeof formData]?.toString() ??
                          ""
                    }
                    onChange={handleInputChange}
                    className={`peer w-full h-[49px] px-3 py-3 border border-Gray rounded-md bg-transparent text-black outline-none ${
                      id === "patientId1"
                        ? "cursor-not-allowed bg-gray-100"
                        : "focus:border-purple-900 focus:ring-0"
                    }`}
                  />
                )}
              </div>
            ))}
          </div>
        </div>

        <input type="hidden" name="pharmacyId" value={formData.pharmacyId} />

        <Table
          data={billingItemRows}
          columns={columns}
          noDataMessage="No Data Found"
        />

        <div>
          <Button
            onClick={() => addNewRow()}
            label="Add Item Row"
            value=""
            className="w-44 bg-gray h-11"
            icon={<Plus size={15} />}
          ></Button>
        </div>

        <div className="flex flex-col space-y-4 px-4">
          {[0, 1, 2, 3].map((_, index) => (
            <div key={index} className="flex justify-between w-full">
              <div className="flex items-center flex-1 gap-x-32">
                {index === 0 && (
                  <>
                    <label className="w-48 text-base font-medium">
                      Payment Status
                    </label>
                    <select
                      className="w-60 h-10 p-2 border border-Gray rounded-md bg-white text-black outline-none focus:border-purple-900 focus:ring-0 text-base"
                      value={formData.paymentStatus}
                      onChange={handleInputChange}
                      name="paymentStatus"
                    >
                      <option value="">Select Status</option>
                      <option value="paid">Paid</option>
                      <option value="pending">Partial</option>
                      <option value="pending">Credit</option>
                    </select>
                  </>
                )}
                {index === 1 && (
                  <>
                    <label className="w-48 text-base font-medium">
                      Payment Type
                    </label>
                    <select
                      className={`w-60 h-10 p-2 border rounded-md bg-white text-black outline-none text-base ${
                        formData.paymentStatus === "pending"
                          ? "border-gray-300 bg-gray-100 cursor-not-allowed"
                          : "border-Gray focus:border-purple-900 focus:ring-0"
                      }`}
                      value={formData.paymentType}
                      onChange={handleInputChange}
                      name="paymentType"
                      disabled={formData.paymentStatus === "pending"}
                    >
                      <option value="">Select Type</option>
                      <option value="cash">Cash</option>
                      <option value="upi">UPI</option>
                      <option value="upiCash">UPI & Cash</option>
                      <option value="creditCard">Credit Card</option>
                      <option value="debitCard">Debit Card</option>
                      <option value="net_banking">Net Banking</option>
                    </select>
                  </>
                )}

                {index === 2 && (
                  <>
                    {formData.paymentType === "upiCash" ? (
                      <>
                        <label
                          htmlFor="upi"
                          className="w-48 text-base font-medium"
                        >
                          UPI
                        </label>
                        <div className="flex flex-col">
                          <input
                            type="number"
                            id="upi"
                            name="upi"
                            className="w-60 h-10 p-2 border border-Gray rounded-md bg-white text-black outline-none text-base focus:border-purple-900 focus:ring-0"
                            value={formData.upi || ""}
                            onKeyDown={restrictInvalidNumberKeys}
                            onChange={handleNumericChange((e) =>
                              handleInputChange(e)
                            )}
                          />
                        </div>
                      </>
                    ) : (
                      <>
                        <label
                          htmlFor="receivedAmount"
                          className="w-48 text-base font-medium"
                        >
                          Received Amount
                        </label>
                        <div className="flex flex-col">
                          <input
                            type="number"
                            id="receivedAmount"
                            name="receivedAmount"
                            className={`w-60 h-10 p-2 border rounded-md text-black outline-none text-base ${
                              formData.paymentType !== "cash"
                                ? "border-gray-300 bg-gray-100 cursor-not-allowed"
                                : "border-Gray bg-white focus:border-purple-900 focus:ring-0"
                            }`}
                            value={
                              formData.receivedAmount === 0
                                ? ""
                                : formData.receivedAmount
                            }
                            onKeyDown={restrictInvalidNumberKeys}
                            onChange={handleNumericChange((e) =>
                              handleInputChange(e)
                            )}
                            disabled={formData.paymentType !== "cash"}
                          />
                        </div>
                      </>
                    )}
                  </>
                )}

                {index === 3 && (
                  <>
                    {formData.paymentType === "upiCash" ? (
                      <>
                        <label
                          htmlFor="cash"
                          className="w-48 text-base font-medium"
                        >
                          Cash
                        </label>
                        <div className="flex flex-col">
                          <input
                            type="number"
                            id="cash"
                            name="cash"
                            className="w-60 h-10 p-2 border border-Gray rounded-md bg-white text-black outline-none text-base focus:border-purple-900 focus:ring-0"
                            value={formData.cash || ""}
                            onKeyDown={restrictInvalidNumberKeys}
                            onChange={handleNumericChange((e) =>
                              handleInputChange(e)
                            )}
                          />
                        </div>
                      </>
                    ) : (
                      <>
                        <label
                          htmlFor="balanceAmount"
                          className="w-48 text-base font-medium"
                        >
                          Balance Amount
                        </label>
                        <div className="flex flex-col">
                          <input
                            type="number"
                            id="balanceAmount"
                            name="balanceAmount"
                            className={`w-60 h-10 p-2 border rounded-md text-black outline-none text-base ${
                              formData.paymentType !== "cash"
                                ? "border-gray-300 bg-gray-100 cursor-not-allowed"
                                : "border-Gray bg-white focus:border-purple-900 focus:ring-0"
                            }`}
                            value={
                              formData.balanceAmount === 0
                                ? ""
                                : formData.balanceAmount
                            }
                            onKeyDown={restrictInvalidNumberKeys}
                            onChange={handleNumericChange((e) =>
                              handleInputChange(e)
                            )}
                            disabled={formData.paymentType !== "cash"}
                          />
                        </div>
                      </>
                    )}
                  </>
                )}
              </div>

              <div className="flex items-center flex-1 justify-end gap-x-10">
                {index === 0 && (
                  <>
                    <span className="w-48 text-base font-medium">
                      Sub Total
                    </span>
                    <span className="w-60 text-base text-right">
                      {formData.subTotal.toFixed(2)}
                    </span>
                  </>
                )}
                {index === 1 && (
                  <>
                    <span className="w-48 text-base font-medium">
                      Total GST
                    </span>
                    <span className="w-60 text-base text-right">
                      {formData.totalGst.toFixed(2)}
                    </span>
                  </>
                )}
                {index === 2 && (
                  <>
                    <span className="w-48 text-base font-medium">
                      Total Discount
                    </span>
                    <span className="w-60 text-base text-right">
                      {formData.totalDiscount.toFixed(2)}
                    </span>
                  </>
                )}
                {index === 3 && (
                  <div className="flex bg-gray1 rounded-lg space-x-8 p-1.5">
                    <span className="w-48 text-xl font-medium">
                      Grand Total
                    </span>
                    <span className="w-60 text-xl font-medium text-right">
                      {formData.grandTotal.toFixed(2)}
                    </span>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        <div className="flex justify-end">
          <Button
            onClick={addBilling}
            label="Save"
            value=""
            className="w-28 bg-darkPurple text-white h-11"
          ></Button>
        </div>
      </main>
    </>
  );
};

export default Billing;
