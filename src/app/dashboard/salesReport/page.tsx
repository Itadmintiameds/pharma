"use client";

import Button from "@/app/components/common/Button";
import Input from "@/app/components/common/Input";
import PaginationTable from "@/app/components/common/PaginationTable";
import { BillingData } from "@/app/types/BillingData";
import {
    format, subDays, startOfWeek, endOfWeek, startOfMonth, endOfMonth,
    isWithinInterval, isSameDay, startOfYear, endOfYear, differenceInDays
} from "date-fns";
import { Search } from "lucide-react";
import React, { useEffect, useState } from "react";
import { BsThreeDotsVertical } from "react-icons/bs";
import { FaArrowDown, FaArrowUp } from "react-icons/fa";
import Billing from "@/app/dashboard/billing/components/Billing";
import { getBilling } from "@/app/services/BillingService";
import { getPatientById } from "@/app/services/PatientService";
import BillingSummary from "@/app/dashboard/billing/components/BillingSummary";
import Loader from "@/app/components/common/Loader";
import { BiExport } from "react-icons/bi";
import { exportAsCSVService } from "@/app/services/ExportAsCSVService";
import { toast } from "react-toastify";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { CiCalendar } from "react-icons/ci";
import { differenceInCalendarDays } from "date-fns";

const Page = () => {
    const [showBilling, setShowBilling] = useState(false);
    const [billingData, setBillingData] = useState<BillingData[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);
    const [searchText, setSearchText] = useState<string>("");
    const [currentBillId, setCurrentBillId] = useState<string | null>(null);
    const [showBillSummary, setShowBillSummary] = useState(false);
    const [openMenuId, setOpenMenuId] = useState<string | null>(null);
    const [dateFilter, setDateFilter] = useState<string>("today");
    const [startDate, setStartDate] = useState<Date | null>(null);
    const [endDate, setEndDate] = useState<Date | null>(null);
    const [showDatePicker, setShowDatePicker] = useState(false);
    const [isCustomRangeApplied, setIsCustomRangeApplied] = useState(false);
    const [datePickerMode, setDatePickerMode] = useState<"date" | "month" | "year">("date");
    const [netSales, setNetSales] = useState<number>(0);
    const [netBillCount, setNetBillCount] = useState<number>(0);
    const [paymentFilter, setPaymentFilter] = useState<string>("all");

    const [selectedMonth, setSelectedMonth] = useState<Date | null>(null);

    const toggleMenu = (billId?: string) => {
        setOpenMenuId((prev) => (prev === billId ? null : billId || null));
    };

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            const target = event.target as HTMLElement;
            if (!target.closest(".menu-container")) {
                setOpenMenuId(null);
            }
        };

        document.addEventListener("mousedown", handleClickOutside);
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, []);

    const formatDate = (date: string | Date): string => {
        const parsedDate = typeof date === "string" ? new Date(date) : date;
        return format(parsedDate, "dd-MM-yyyy");
    };

    const [sortConfig, setSortConfig] = useState<{
        key: keyof BillingData | null;
        direction: "asc" | "desc";
    }>({ key: null, direction: "asc" });

    const handleSort = (key: keyof BillingData) => {
        setSortConfig((prev) => {
            if (prev.key === key) {
                return {
                    key,
                    direction: prev.direction === "asc" ? "desc" : "asc",
                };
            }
            return { key, direction: "asc" };
        });
    };

    const getSortedData = () => {
        const sorted = [...filteredData];

        if (sortConfig.key) {
            sorted.sort((a, b) => {
                const aValue = a[sortConfig.key!];
                const bValue = b[sortConfig.key!];

                if (typeof aValue === "string" && typeof bValue === "string") {
                    return sortConfig.direction === "asc"
                        ? aValue.localeCompare(bValue)
                        : bValue.localeCompare(aValue);
                }

                if (typeof aValue === "number" && typeof bValue === "number") {
                    return sortConfig.direction === "asc"
                        ? aValue - bValue
                        : bValue - aValue;
                }

                return 0;
            });
        } else {
            sorted.sort(
                (a, b) =>
                    new Date(b.billDateTime).getTime() -
                    new Date(a.billDateTime).getTime()
            );
        }

        return sorted;
    };

    const displayValue = (
        value: string | number | null | undefined
    ): string | number => {
        return value !== undefined && value !== null && value !== "" ? value : "--";
    };

    const normalizeDate = (date: Date) => {
        const newDate = new Date(date);
        newDate.setHours(0, 0, 0, 0);
        return newDate;
    };

    const filterByDateRange = (data: BillingData[]) => {
        const today = normalizeDate(new Date());

        switch (dateFilter) {
            case "today":
                return data.filter((item) =>
                    isSameDay(normalizeDate(new Date(item.billDateTime)), today)
                );
            case "yesterday":
                return data.filter((item) =>
                    isSameDay(normalizeDate(new Date(item.billDateTime)), subDays(today, 1))
                );
            case "thisWeek":
                return data.filter((item) =>
                    isWithinInterval(normalizeDate(new Date(item.billDateTime)), {
                        start: startOfWeek(today),
                        end: endOfWeek(today),
                    })
                );
            case "customMonth":
                if (isCustomRangeApplied && startDate) {
                    const monthStart = startOfMonth(startDate);
                    const monthEnd = endOfMonth(startDate);

                    return data.filter((item) =>
                        isWithinInterval(normalizeDate(new Date(item.billDateTime)), {
                            start: monthStart,
                            end: monthEnd,
                        })
                    );
                }
                return [];
            case "customYear":
                if (isCustomRangeApplied && startDate) {
                    const yearStart = startOfYear(startDate);
                    let yearEnd;

                    if (startDate.getFullYear() === new Date().getFullYear()) {
                        yearEnd = new Date();
                    } else {
                        yearEnd = endOfYear(startDate);
                    }

                    return data.filter((item) =>
                        isWithinInterval(normalizeDate(new Date(item.billDateTime)), {
                            start: yearStart,
                            end: yearEnd,
                        })
                    );
                }
                return [];
            case "customDateRange":
                if (isCustomRangeApplied && startDate && endDate) {
                    const adjustedEndDate = new Date(endDate);
                    adjustedEndDate.setHours(23, 59, 59, 999);

                    return data.filter((item) =>
                        isWithinInterval(normalizeDate(new Date(item.billDateTime)), {
                            start: normalizeDate(startDate),
                            end: adjustedEndDate,
                        })
                    );
                }
                return [];
            default:
                return data;
        }
    };

    const filterByPaymentStatus = (data: BillingData[]) => {
        switch (paymentFilter) {
            case "paid":
                return data.filter(item => item.paymentStatus === "paid");
            case "unpaid":
                return data.filter(item => item.paymentStatus === "pending");
            default:
                return data;
        }
    };

    const prepareExportData = () => {
        return getSortedData().map(item => ({
            "Bill ID": item.billId1,
            "Patient Name": item.patientName,
            "Mobile No.": item.phone,
            "Patient Type": item.patientType,
            "Bill Date": formatDate(item.billDateTime),
            "Patient ID": item.patientId1,
            "Payment Status": item.paymentStatus,
            "Payment Mode": item.paymentType,
            "Bill Amount": item.grandTotal || 0,
            ...(paymentFilter === "unpaid" && {
                "Days since Billed": differenceInDays(new Date(), new Date(item.billDateTime))
            })
        }));
    };

    const handleExport = async () => {
        try {
            const dataToExport = prepareExportData();
            let filenameSuffix;
            const today = new Date();

            switch (dateFilter) {
                case "today":
                    filenameSuffix = format(today, 'dd_MM_yyyy');
                    break;
                case "yesterday":
                    filenameSuffix = format(subDays(today, 1), 'dd_MM_yyyy');
                    break;
                case "thisWeek":
                    filenameSuffix = `week_${format(startOfWeek(today), 'dd_MM_yyyy')}_to_${format(endOfWeek(today), 'dd_MM_yyyy')}`;
                    break;
                case "customMonth":
                    if (startDate) {
                        filenameSuffix = format(startDate, 'MM_yyyy');
                    } else {
                        filenameSuffix = "custom_month";
                    }
                    break;
                case "customYear":
                    if (startDate) {
                        filenameSuffix = format(startDate, 'yyyy');
                    } else {
                        filenameSuffix = "custom_year";
                    }
                    break;
                case "customDateRange":
                    if (startDate && endDate) {
                        filenameSuffix = `${format(startDate, 'dd_MM_yyyy')}_to_${format(endDate, 'dd_MM_yyyy')}`;
                    } else {
                        filenameSuffix = "custom_range";
                    }
                    break;
                default:
                    filenameSuffix = format(today, 'dd_MM_yyyy');
            }

            await exportAsCSVService.exportData(
                dataToExport,
                'csv',
                {
                    filename: `billing_summary_${filenameSuffix}`,
                    headers: {
                        "Bill ID": "Bill ID",
                        "Patient Name": "Patient Name",
                        "Mobile No.": "Mobile No.",
                        "Patient Type": "Patient Type",
                        "Bill Date": "Bill Date",
                        "Patient ID": "Patient ID",
                        "Payment Status": "Payment Status",
                        "Payment Mode": "Payment Mode",
                        "Bill Amount": "Bill Amount (Rs.)",
                        ...(paymentFilter === "unpaid" && {
                            "Days since Billed": "Days since Billed"
                        })
                    },
                    csv: {
                        delimiter: ','
                    }
                }
            );

            toast.success("CSV exported successfully!");
        } catch (error) {
            console.error("Export failed:", error);
            toast.error(error instanceof Error ? error.message : "Failed to export CSV");
        }
    };

    const handleBillingSummary = (billId?: string) => {
        if (billId) {
            setCurrentBillId(billId);
        }
        setShowBillSummary(true);
    };

    useEffect(() => {
        const fetchBillingData = async () => {
            setLoading(true);
            setError(null);
            try {
                const result = await getBilling();
                if (result.status === "success") {
                    const billingList = result.data;

                    const enrichedBillingData = await Promise.all(
                        billingList.map(async (bill: BillingData) => {
                            try {
                                const patient = await getPatientById(bill.patientId);
                                console.log("patient-----", patient);

                                return {
                                    ...bill,
                                    patientName: `${patient.firstName} ${patient.lastName}`,
                                    phone: patient.phone,
                                    patientId1: patient.patientId1,
                                };
                            } catch (err) {
                                console.error(
                                    `Failed to fetch patient for ID ${bill.patientId}`,
                                    err
                                );
                                return {
                                    ...bill,
                                    patientName: "Unknown",
                                    mobileNo: "N/A",
                                    patientId1: "N/A",
                                };
                            }
                        })
                    );

                    setBillingData(enrichedBillingData);
                } else {
                    setError(result.message || "Failed to fetch data");
                }
            } catch (error) {
                console.error("Error fetching billing data:", error);
                setError("Something went wrong while fetching billing data");
            } finally {
                setLoading(false);
            }
        };

        fetchBillingData();
    }, []);

    const filteredData = filterByPaymentStatus(
        filterByDateRange(
            billingData.filter((item) => {
                const search = searchText.toLowerCase();

                const billDateFormatted = format(
                    new Date(item.billDateTime),
                    "dd-MM-yyyy"
                );

                return (
                    item.billId1?.toLowerCase().includes(search) ||
                    item.patientName?.toLowerCase().includes(search) ||
                    item.patientType?.toLowerCase().includes(search) ||
                    billDateFormatted.toLowerCase().includes(search) ||
                    item.patientId?.toLowerCase().includes(search) ||
                    item.paymentStatus?.toLowerCase().includes(search) ||
                    item.paymentType?.toLowerCase().includes(search) ||
                    item.grandTotal?.toString().toLowerCase().includes(search)
                );
            })
        )
    );

    useEffect(() => {
        const calculateSummary = () => {
            const sales = filteredData.reduce((sum, item) => sum + (item.grandTotal || 0), 0);
            const count = filteredData.length;

            setNetSales(sales);
            setNetBillCount(count);
        };

        calculateSummary();
    }, [filteredData]);

    const baseColumns = [
        {
            header: (
                <div
                    className="flex items-center gap-2 cursor-pointer"
                    onClick={() => handleSort("billId1")}
                >
                    <span>Bill ID</span>
                    {sortConfig.key === "billId1" ? (
                        sortConfig.direction === "asc" ? (
                            <FaArrowUp />
                        ) : (
                            <FaArrowDown />
                        )
                    ) : (
                        <FaArrowDown />
                    )}
                </div>
            ),
            accessor: (row: BillingData) => displayValue(row.billId1),
        },
        {
            header: (
                <div
                    className="flex items-center gap-2 cursor-pointer"
                    onClick={() => handleSort("patientName")}
                >
                    <span>Patient Name</span>
                    {sortConfig.key === "patientName" ? (
                        sortConfig.direction === "asc" ? (
                            <FaArrowUp />
                        ) : (
                            <FaArrowDown />
                        )
                    ) : (
                        <FaArrowDown />
                    )}
                </div>
            ),
            accessor: (row: BillingData) => displayValue(row.patientName),
        },
        {
            header: (
                <div
                    className="flex items-center gap-2 cursor-pointer"
                    onClick={() => handleSort("phone")}
                >
                    <span>Mobile No.</span>
                    {sortConfig.key === "phone" ? (
                        sortConfig.direction === "asc" ? (
                            <FaArrowUp />
                        ) : (
                            <FaArrowDown />
                        )
                    ) : (
                        <FaArrowDown />
                    )}
                </div>
            ),
            accessor: (row: BillingData) => displayValue(row.phone),
        },
        {
            header: (
                <div
                    className="flex items-center gap-2 cursor-pointer"
                    onClick={() => handleSort("patientType")}
                >
                    <span>Patient Type</span>
                    {sortConfig.key === "patientType" ? (
                        sortConfig.direction === "asc" ? (
                            <FaArrowUp />
                        ) : (
                            <FaArrowDown />
                        )
                    ) : (
                        <FaArrowDown />
                    )}
                </div>
            ),
            accessor: (row: BillingData) => displayValue(row.patientType),
        },
        {
            header: (
                <div
                    className="flex items-center gap-2 cursor-pointer"
                    onClick={() => handleSort("billDateTime")}
                >
                    <span>Bill Date</span>
                    {sortConfig.key === "billDateTime" ? (
                        sortConfig.direction === "asc" ? (
                            <FaArrowUp />
                        ) : (
                            <FaArrowDown />
                        )
                    ) : (
                        <FaArrowDown />
                    )}
                </div>
            ),
            accessor: (row: BillingData) =>
                row.billDateTime ? formatDate(row.billDateTime) : "--",
        },
        {
            header: (
                <div
                    className="flex items-center gap-2 cursor-pointer"
                    onClick={() => handleSort("patientId1")}
                >
                    <span>Patient ID</span>
                    {sortConfig.key === "patientId1" ? (
                        sortConfig.direction === "asc" ? (
                            <FaArrowUp />
                        ) : (
                            <FaArrowDown />
                        )
                    ) : (
                        <FaArrowDown />
                    )}
                </div>
            ),
            accessor: (row: BillingData) => displayValue(row.patientId1),
        },

        ...(paymentFilter === "all" ? [{
            header: (
                <div
                    className="flex items-center gap-2 cursor-pointer"
                    onClick={() => handleSort("paymentStatus")}
                >
                    <span>Payment Status</span>
                    {sortConfig.key === "paymentStatus" ? (
                        sortConfig.direction === "asc" ? (
                            <FaArrowUp />
                        ) : (
                            <FaArrowDown />
                        )
                    ) : (
                        <FaArrowDown />
                    )}
                </div>
            ),
            accessor: (row: BillingData) => {
                const value = displayValue(row.paymentStatus);

                if (value === "--") {
                    return (
                        <span className="px-2 py-1 rounded-xl text-sm font-medium bg-gray-200 text-gray-600">
                            {value}
                        </span>
                    );
                }

                if (typeof value === "string") {
                    const status = value.toLowerCase();
                    const isPending = status === "pending";

                    const bgClass = isPending ? "bg-warning" : "bg-green";
                    const textClass = isPending ? "text-warning" : "text-green";
                    const displayText = status.charAt(0).toUpperCase() + status.slice(1);

                    return (
                        <span
                            className={`px-2 py-1 rounded-xl text-sm font-medium ${bgClass} ${textClass}`}
                        >
                            {displayText}
                        </span>
                    );
                }

                return (
                    <span className="px-2 py-1 rounded-xl text-sm font-medium bg-gray-200 text-gray-600">
                        {String(value)}
                    </span>
                );
            },
        }] : []),
        ...(paymentFilter !== "unpaid" ? [{
            header: (
                <div
                    className="flex items-center gap-2 cursor-pointer"
                    onClick={() => handleSort("paymentType")}
                >
                    <span>Payment Mode</span>
                    {sortConfig.key === "paymentType" ? (
                        sortConfig.direction === "asc" ? (
                            <FaArrowUp />
                        ) : (
                            <FaArrowDown />
                        )
                    ) : (
                        <FaArrowDown />
                    )}
                </div>
            ),
            accessor: (row: BillingData) => {
                const value = displayValue(row.paymentType);

                const paymentTypeMap: Record<string, string> = {
                    cash: "Cash",
                    upi: "UPI",
                    upiCash: "UPI & Cash",
                    creditCard: "Credit Card",
                    debitCard: "Debit Card",
                    net_banking: "Net Banking",
                };

                return paymentTypeMap[value] || "--";
            },
        }] : []),
        ...(paymentFilter === "unpaid" ? [{
            header: (
                <div className="flex items-center gap-2">
                    <span>Days since Billed</span>
                </div>
            ),
            accessor: (row: BillingData) => {
                const billDate = new Date(row.billDateTime);
                const today = new Date();
                const daysDiff = differenceInCalendarDays(today, billDate);
                return daysDiff > 0 ? `${daysDiff} Days` : "0 Day";
            },
        }] : []),
        {
            header: (
                <div
                    className="flex items-center gap-2 cursor-pointer"
                    onClick={() => handleSort("grandTotal")}
                >
                    <span>Bill Amount</span>
                    {sortConfig.key === "grandTotal" ? (
                        sortConfig.direction === "asc" ? (
                            <FaArrowUp />
                        ) : (
                            <FaArrowDown />
                        )
                    ) : (
                        <FaArrowDown />
                    )}
                </div>
            ),
            accessor: (row: BillingData) => displayValue(row.grandTotal),
        },
        {
            header: <BsThreeDotsVertical size={18} />,
            accessor: (row: BillingData) => (
                <div className="relative group  menu-container">
                    <button
                        className="p-2 rounded-full hover:bg-gray-200 cursor-pointer"
                        onClick={() => toggleMenu(row.billId)}
                    >
                        <BsThreeDotsVertical size={18} />
                    </button>
                    {openMenuId === row.billId && (
                        <div className="absolute right-0 mt-2 min-w-[160px] bg-white shadow-xl rounded-lg transition-opacity duration-200 z-10 whitespace-nowrap">
                            <button
                                onClick={() => handleBillingSummary(row.billId)}
                                className="block w-full px-4 py-2 text-left text-gray-700 cursor-pointer hover:bg-purple-950 hover:text-white hover:rounded-lg"
                            >
                                View
                            </button>
                        </div>
                    )}
                </div>
            ),
        },
    ];

    const generateYearOptions = () => {
        const currentYear = new Date().getFullYear();
        const startYear = 1900;
        const years = [];
        for (let i = currentYear; i >= startYear; i--) {
            years.push(i);
        }
        return years;
    };

    useEffect(() => {
        const searchParams = new URLSearchParams(window.location.search);
        const dateFilterParam = searchParams.get('dateFilter');
        const paymentFilterParam = searchParams.get('paymentFilter');
        const startDateParam = searchParams.get('startDate');
        const endDateParam = searchParams.get('endDate');

        if (dateFilterParam) {
            setDateFilter(dateFilterParam);
            if (dateFilterParam === 'customDateRange' && startDateParam && endDateParam) {
                setStartDate(new Date(startDateParam));
                setEndDate(new Date(endDateParam));
                setIsCustomRangeApplied(true);
            }
            else if (dateFilterParam === 'customMonth' && startDateParam) {
                // Handle custom month from main code - set the month picker
                const monthDate = new Date(startDateParam);
                setStartDate(monthDate);
                setSelectedMonth(monthDate); // Set the selected month for the picker
                setIsCustomRangeApplied(true);
                setShowDatePicker(false);
            }
            else {
                setStartDate(null);
                setEndDate(null);
                setSelectedMonth(null);
                setIsCustomRangeApplied(false);
            }
        }

        if (paymentFilterParam) {
            setPaymentFilter(paymentFilterParam);
        }
    }, []);


    return (
        <>
            {showBillSummary && currentBillId ? (
                <BillingSummary
                    billId={currentBillId}
                    onClose={() => {
                        setShowBillSummary(false);
                        setCurrentBillId(null);
                    }}
                />
            ) : showBilling ? (
                <Billing setShowBilling={setShowBilling} />
            ) : (
                <main className="space-y-10">
                    <div className="flex justify-between">
                        <div className="justify-start text-darkPurple text-3xl font-medium leading-10">
                            Sales Report
                        </div>

                        <div>
                            <div className="flex space-x-4">
                                <div>
                                    <Input
                                        type="text"
                                        value={searchText}
                                        onChange={(e) => setSearchText(e.target.value)}
                                        placeholder="Search Table..."
                                        className="w-80 border-gray-300"
                                        icon={<Search size={18} />}
                                    />
                                </div>
                                <div>
                                    <Button
                                        onClick={handleExport}
                                        label="Export as CSV"
                                        value=""
                                        className="w-40 bg-darkPurple text-white h-11"
                                        icon={<BiExport size={15} />}
                                    ></Button>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Payment Status Filter */}
                    <div className="text-lg font-medium text-[#726C6C] flex space-x-8 cursor-pointer ml-3 border-b border-gray-200">
                        {[
                            { value: "all", label: "Net Bills" },
                            { value: "paid", label: "Paid Bills" },
                            { value: "unpaid", label: "Unpaid Bills" },
                        ].map((filter) => (
                            <div
                                key={filter.value}
                                onClick={() => setPaymentFilter(filter.value)}
                                className={`relative pb-1 ${paymentFilter === filter.value
                                    ? "text-[#4B0082] border-b-2 border-[#4B0082]"
                                    : "hover:text-[#4B0082] hover:border-b-2 hover:border-gray-300"
                                    } transition-colors`}
                            >
                                {filter.label}
                            </div>
                        ))}
                    </div>

                    {/* Date range selector */}
                    <div className="text-sm font-normal text-[#726C6C] flex space-x-7 cursor-pointer ml-3">
                        {[
                            { value: "today", label: "Today" },
                            { value: "yesterday", label: "Yesterday" },
                            { value: "thisWeek", label: "This Week" },
                            { value: "customMonth", label: "Custom Month", icon: <CiCalendar size={18} /> },
                            { value: "customYear", label: "Custom Year", icon: <CiCalendar size={18} /> },
                            { value: "customDateRange", label: "Billing Date Range", icon: <CiCalendar size={18} /> },
                        ].map((filter) => (
                            <div key={filter.value} className="relative">
                                <div
                                    onClick={() => {
                                        const newFilter = filter.value;
                                        setDateFilter(newFilter);
                                        setIsCustomRangeApplied(false);
                                        if (newFilter === "customMonth" || newFilter === "customYear" || newFilter === "customDateRange") {
                                            setStartDate(null);
                                            if (newFilter === "customDateRange") setEndDate(null);
                                            setDatePickerMode(
                                                newFilter === "customMonth" ? "month" :
                                                    newFilter === "customYear" ? "year" : "date"
                                            );
                                            setShowDatePicker(true);
                                        } else {
                                            setShowDatePicker(false);
                                        }
                                    }}
                                    className={`hover:text-[#4B0082] transition-colors flex items-center gap-1 ${dateFilter === filter.value ? "text-[#4B0082]" : ""
                                        }`}
                                >
                                    {filter.label}
                                    {filter.icon}
                                </div>

                                {(dateFilter === "customMonth" || dateFilter === "customYear" || dateFilter === "customDateRange") &&
                                    filter.value === dateFilter &&
                                    showDatePicker && (
                                        <div className="absolute top-full left-0 mt-2 bg-white p-4 rounded-lg shadow-lg z-50 border border-gray-200 w-[240px]">
                                            <div className="space-y-4">
                                                <div>
                                                    <label className="block text-sm text-gray-600 mb-1">
                                                        {datePickerMode === "month" ? "Select Month" :
                                                            datePickerMode === "year" ? "Select Year" :
                                                                "Select Date Range"}
                                                    </label>

                                                    {datePickerMode === "year" ? (
                                                        <div className="border rounded-md p-2">
                                                            <div className="grid grid-cols-3 gap-2 max-h-40 overflow-y-auto">
                                                                {generateYearOptions().map((year) => (
                                                                    <button
                                                                        key={year}
                                                                        onClick={() => setStartDate(new Date(year, 0, 1))}
                                                                        className={`p-2 text-center rounded hover:bg-purple-900 ${startDate && startDate.getFullYear() === year
                                                                            ? "bg-darkPurple text-white"
                                                                            : "bg-white"
                                                                            }`}
                                                                    >
                                                                        {year}
                                                                    </button>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    ) : datePickerMode === "month" ? (
                                                        <div className="flex items-center border rounded-md p-2">
                                                            <DatePicker
                                                                selected={selectedMonth}
                                                                onChange={(date) => setStartDate(date)}
                                                                maxDate={new Date()}
                                                                className="w-full focus:outline-none text-gray-900 text-sm"
                                                                placeholderText="Select month"
                                                                dateFormat="MMM yyyy"
                                                                showMonthYearPicker
                                                            />
                                                            <div
                                                                className="w-5 h-5 text-gray-500 ml-2 cursor-pointer"
                                                                onClick={() => {
                                                                    const datePickerInput = document.querySelector('.react-datepicker-wrapper input');
                                                                    if (datePickerInput) {
                                                                        (datePickerInput as HTMLElement).focus();
                                                                    }
                                                                }}
                                                            >
                                                                <CiCalendar size={20} />
                                                            </div>
                                                        </div>
                                                    ) : (
                                                        <>
                                                            <div className="flex items-center border rounded-md p-2 mb-2">
                                                                <DatePicker
                                                                    selected={startDate}
                                                                    onChange={(date) => setStartDate(date)}
                                                                    selectsStart
                                                                    startDate={startDate}
                                                                    endDate={endDate}
                                                                    maxDate={new Date()}
                                                                    className="w-full focus:outline-none text-gray-900 text-sm"
                                                                    placeholderText="From date"
                                                                    dateFormat="MMM d, yy"
                                                                />
                                                                <div
                                                                    className="w-5 h-5 text-gray-500 ml-2 cursor-pointer"
                                                                    onClick={() => {
                                                                        const datePickerInputs = document.querySelectorAll('.react-datepicker-wrapper input');
                                                                        if (datePickerInputs.length > 0) {
                                                                            (datePickerInputs[0] as HTMLElement).focus();
                                                                        }
                                                                    }}
                                                                >
                                                                    <CiCalendar size={20} />
                                                                </div>
                                                            </div>
                                                            <div className="flex items-center border rounded-md p-2">
                                                                <DatePicker
                                                                    selected={endDate}
                                                                    onChange={(date) => setEndDate(date)}
                                                                    selectsEnd
                                                                    startDate={startDate}
                                                                    endDate={endDate}
                                                                    minDate={startDate || undefined}
                                                                    maxDate={new Date()}
                                                                    className="w-full focus:outline-none text-gray-900 text-sm"
                                                                    placeholderText="To date"
                                                                    dateFormat="MMM d, yy"
                                                                />
                                                                <div
                                                                    className="w-5 h-5 text-gray-500 ml-2 cursor-pointer"
                                                                    onClick={() => {
                                                                        const datePickerInputs = document.querySelectorAll('.react-datepicker-wrapper input');
                                                                        if (datePickerInputs.length > 1) {
                                                                            (datePickerInputs[1] as HTMLElement).focus();
                                                                        }
                                                                    }}
                                                                >
                                                                    <CiCalendar size={20} />
                                                                </div>
                                                            </div>
                                                        </>
                                                    )}
                                                </div>

                                                <div className="flex justify-between pt-2">
                                                    <button
                                                        onClick={() => {
                                                            setStartDate(null);
                                                            setEndDate(null);
                                                            setIsCustomRangeApplied(false);
                                                            setShowDatePicker(false);
                                                        }}
                                                        className="px-3 py-1 text-sm text-gray-700 hover:bg-gray-100 rounded"
                                                    >
                                                        Cancel
                                                    </button>
                                                    <button
                                                        onClick={() => {
                                                            if ((datePickerMode === "date" && startDate && endDate) ||
                                                                (datePickerMode !== "date" && startDate)) {
                                                                setIsCustomRangeApplied(true);
                                                                setShowDatePicker(false);
                                                            }
                                                        }}
                                                        disabled={(datePickerMode === "date" && (!startDate || !endDate)) ||
                                                            (datePickerMode !== "date" && !startDate)}
                                                        className={`px-3 py-1 text-sm rounded ${((datePickerMode === "date" && (!startDate || !endDate)) ||
                                                            (datePickerMode !== "date" && !startDate))
                                                            ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                                                            : "bg-darkPurple text-white"
                                                            }`}
                                                    >
                                                        Apply
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                            </div>
                        ))}
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                        <div className="bg-gray-50 p-6 rounded-lg border border-gray-200 flex items-center">
                            <div>
                                <p className="text-sm text-gray-500">Total Billed Amount</p>
                                <p className="text-xl text-gray-800">
                                    ₹{netSales}
                                </p>
                            </div>
                        </div>
                        <div className="bg-gray-50 p-6 rounded-lg border border-gray-200 flex items-center">
                            <div>
                                <p className="text-sm text-gray-500">Total Number of Bills</p>
                                <p className="text-xl text-gray-800">
                                    {netBillCount}
                                </p>
                            </div>
                        </div>
                    </div>

                    {loading ? (
                        <div className="flex justify-center items-center h-64">
                            <Loader type="spinner" size="md" text="Loading ..." fullScreen={false} />
                        </div>
                    ) : error ? (
                        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
                            <strong>Error!</strong> {error}
                        </div>
                    ) : (
                        <PaginationTable
                            data={getSortedData()}
                            columns={baseColumns}
                            noDataMessage="No billing records found"
                        />
                    )}
                </main>
            )}
        </>
    );
};

export default Page;