"use client";

import { useEffect, useState } from "react";
import { format, startOfMonth, endOfMonth, eachDayOfInterval } from "date-fns";
import {
  getBillingSummaryByDate,
  getPaymentSummaryByDate
} from "@/app/services/BillingSummaryService";
import {
  BillingSummaryData,
  PaymentSummaryData
} from "@/app/types/BillingSummaryData";
import { BiExport } from "react-icons/bi";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { CiCalendar } from "react-icons/ci";
import Image from "next/image";
import Button from "@/app/components/common/Button";
import { exportAsCSVService } from "@/app/services/ExportAsCSVService";
import { toast } from "react-toastify";
import Loader from "@/app/components/common/Loader";
import { useRouter } from 'next/navigation';

const Page = () => {
  const [summaryData, setSummaryData] = useState<BillingSummaryData | null>(null);
  const [paymentSummaryData, setPaymentSummaryData] = useState<PaymentSummaryData | null>(null);
  const [loading, setLoading] = useState(true);
  const [dateFilter, setDateFilter] = useState("today");
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showMonthPicker, setShowMonthPicker] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState<Date | null>(new Date());
  const router = useRouter();

  // Function to aggregate monthly data
  const aggregateMonthlyData = (dailyDataArray: {billing: BillingSummaryData, payment: PaymentSummaryData}[]) => {
    const aggregatedBilling: BillingSummaryData = {
      paidTotalAmount: 0,
      unpaidTotalAmount: 0,
      paidTotalBills: 0,
      unpaidTotalBills: 0,
      totalReturnAmount: 0,
      totalReturnBills: 0
    };

    const aggregatedPayment: PaymentSummaryData = {
      cashTotal: 0,
      upiNetTotal: 0,
      cardTotal: 0,
      upiCashTotal: 0,
      cashCount: 0,
      upiNetCount: 0,
      cardCount: 0,
      upiCashCount: 0
    };

    dailyDataArray.forEach(({billing, payment}) => {
      aggregatedBilling.paidTotalAmount = (aggregatedBilling.paidTotalAmount ?? 0) + (billing.paidTotalAmount ?? 0);
      aggregatedBilling.unpaidTotalAmount = (aggregatedBilling.unpaidTotalAmount ?? 0) + (billing.unpaidTotalAmount ?? 0);
      aggregatedBilling.paidTotalBills = (aggregatedBilling.paidTotalBills ?? 0) + (billing.paidTotalBills ?? 0);
      aggregatedBilling.unpaidTotalBills = (aggregatedBilling.unpaidTotalBills ?? 0) + (billing.unpaidTotalBills ?? 0);
      aggregatedBilling.totalReturnAmount = (aggregatedBilling.totalReturnAmount ?? 0) + (billing.totalReturnAmount ?? 0);
      aggregatedBilling.totalReturnBills = (aggregatedBilling.totalReturnBills ?? 0) + (billing.totalReturnBills ?? 0);

      aggregatedPayment.cashTotal = (aggregatedPayment.cashTotal ?? 0) + (payment.cashTotal ?? 0);
      aggregatedPayment.upiNetTotal = (aggregatedPayment.upiNetTotal ?? 0) + (payment.upiNetTotal ?? 0);
      aggregatedPayment.cardTotal = (aggregatedPayment.cardTotal ?? 0) + (payment.cardTotal ?? 0);
      aggregatedPayment.upiCashTotal = (aggregatedPayment.upiCashTotal ?? 0) + (payment.upiCashTotal ?? 0);
      aggregatedPayment.cashCount = (aggregatedPayment.cashCount ?? 0) + (payment.cashCount ?? 0);
      aggregatedPayment.upiNetCount = (aggregatedPayment.upiNetCount ?? 0) + (payment.upiNetCount ?? 0);
      aggregatedPayment.cardCount = (aggregatedPayment.cardCount ?? 0) + (payment.cardCount ?? 0);
      aggregatedPayment.upiCashCount = (aggregatedPayment.upiCashCount ?? 0) + (payment.upiCashCount ?? 0);
    });

    return { billing: aggregatedBilling, payment: aggregatedPayment };
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const datePickerElement = document.getElementById("custom-date-picker");
      const datePickerButton = document.getElementById("custom-date-button");
      const monthPickerElement = document.getElementById("custom-month-picker");
      const monthPickerButton = document.getElementById("custom-month-button");

      if (
        showDatePicker &&
        datePickerElement &&
        !datePickerElement.contains(event.target as Node) &&
        datePickerButton &&
        !datePickerButton.contains(event.target as Node)
      ) {
        setShowDatePicker(false);
      }

      if (
        showMonthPicker &&
        monthPickerElement &&
        !monthPickerElement.contains(event.target as Node) &&
        monthPickerButton &&
        !monthPickerButton.contains(event.target as Node)
      ) {
        setShowMonthPicker(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [showDatePicker, showMonthPicker]);

  useEffect(() => {
    const fetchSummaries = async () => {
      try {
        setLoading(true);

        if (dateFilter === "customMonth" && selectedMonth) {
          // For custom month, fetch data for each day and aggregate
          const start = startOfMonth(selectedMonth);
          const end = endOfMonth(selectedMonth);
          
          // Only fetch data up to today if the selected month includes future dates
          const today = new Date();
          const actualEnd = end > today ? today : end;
          
          const daysInMonth = eachDayOfInterval({ start, end: actualEnd });

          const dailyPromises = daysInMonth.map(day => 
            Promise.all([
              getBillingSummaryByDate(day),
              getPaymentSummaryByDate(day)
            ])
          );

          const dailyResults = await Promise.all(dailyPromises);
          
          const dailyData = dailyResults.map(([billingData, paymentData]) => ({
            billing: billingData,
            payment: paymentData
          }));

          const aggregatedData = aggregateMonthlyData(dailyData);
          setSummaryData(aggregatedData.billing);
          setPaymentSummaryData(aggregatedData.payment);
        } else {
          // For single day filters
          let dateToFetch = new Date();

          if (dateFilter === "yesterday") {
            dateToFetch.setDate(dateToFetch.getDate() - 1);
          } else if (dateFilter === "custom") {
            dateToFetch = selectedDate;
          }

          const [billingData, paymentData] = await Promise.all([
            getBillingSummaryByDate(dateToFetch),
            getPaymentSummaryByDate(dateToFetch)
          ]);

          setSummaryData(billingData);
          setPaymentSummaryData(paymentData);
        }
      } catch (err) {
        console.error("Failed to load summary:", err);
        setSummaryData(null);
        setPaymentSummaryData(null);
      } finally {
        setLoading(false);
      }
    };

    fetchSummaries();
  }, [dateFilter, selectedDate, selectedMonth]);

  const handleDateChange = (date: Date | null) => {
    if (date) {
      setSelectedDate(date);
      setDateFilter("custom");
      setShowDatePicker(false);
    }
  };

  const handleMonthChange = (date: Date | null) => {
    if (date) {
      setSelectedMonth(date);
      setDateFilter("customMonth");
      setShowMonthPicker(false);
    }
  };

  const formatNumber = (num: number | null | undefined): string => {
    if (num === null || num === undefined) return "0.00";
    if (Number.isInteger(num)) return num.toString();
    return num.toFixed(2);
  };

  const prepareExportData = () => {
    if (!summaryData || !paymentSummaryData) return [];

    let formattedDate;
    if (dateFilter === "customMonth" && selectedMonth) {
      formattedDate = format(selectedMonth, "MMM yyyy");
    } else {
      formattedDate = format(selectedDate, "dd-MM-yyyy");
    }

    return [
      {
        "Type of Report": "Daily Closing Report",
        "Date": formattedDate,
        "Net sales (in Rs.)": formatNumber((summaryData.paidTotalAmount || 0) + (summaryData.unpaidTotalAmount || 0)),
        "Total bill count": (summaryData.paidTotalBills || 0) + (summaryData.unpaidTotalBills || 0),
        "Total Paid amount (in Rs.)": formatNumber(summaryData.paidTotalAmount),
        "Bill count for Paid": summaryData.paidTotalBills || 0,
        "Total Unpaid amount (in Rs.)": formatNumber(summaryData.unpaidTotalAmount),
        "Bill count for Unpaid": summaryData.unpaidTotalBills || 0,
        "Payment type (Cash)": formatNumber(paymentSummaryData.cashTotal),
        "Payment type (UPI)": formatNumber(paymentSummaryData.upiNetTotal),
        "Payment type (Card)": formatNumber(paymentSummaryData.cardTotal),
        "Total Refund Amount of bill returned": formatNumber(summaryData.totalReturnAmount),
        "Total no. of bill return": summaryData.totalReturnBills || 0
      }
    ];
  };

  const handleExport = async () => {
    try {
      const dataToExport = prepareExportData();
      let filename;

      if (dateFilter === "customMonth" && selectedMonth) {
        filename = `Daily_report_${format(selectedMonth, 'MM_yyyy')}`;
      } else {
        filename = `daily_report_${format(selectedDate, 'dd_MM_yyyy')}`;
      }

      await exportAsCSVService.exportData(
        dataToExport,
        'csv',
        {
          filename,
          headers: {
            "Type of Report": "Type of Report",
            "Date": "Date"
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

  const handlePaidBillsClick = () => {
    if (dateFilter !== 'today' && dateFilter !== 'yesterday' && dateFilter !== 'customMonth') {
      return;
    }

    const params = new URLSearchParams();
    params.set('dateFilter', dateFilter);
    params.set('paymentFilter', 'paid');
    
    // Add selected month for custom month filter
    if (dateFilter === 'customMonth' && selectedMonth) {
      params.set('startDate', selectedMonth.toISOString());
    }

    router.push(`/dashboard/salesReport?${params.toString()}`);
  };

  const handleUnpaidBillsClick = () => {
    if (dateFilter !== 'today' && dateFilter !== 'yesterday' && dateFilter !== 'customMonth') {
      return;
    }

    const params = new URLSearchParams();
    params.set('dateFilter', dateFilter);
    params.set('paymentFilter', 'unpaid');
    
    // Add selected month for custom month filter
    if (dateFilter === 'customMonth' && selectedMonth) {
      params.set('startDate', selectedMonth.toISOString());
    }

    router.push(`/dashboard/salesReport?${params.toString()}`);
  };

  const getHeaderDate = () => {
    if (dateFilter === "customMonth" && selectedMonth) {
      return format(selectedMonth, "MMMM yyyy");
    }
    return format(selectedDate, "MMMM dd, yyyy");
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader type="spinner" size="md" text="Loading ..." fullScreen={false} />
      </div>
    );
  }

  return (
    <div className="w-full">
      <div className="container mx-auto">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8">
          <h2 className="text-darkPurple text-2xl md:text-3xl font-medium">
            Daily Closing Report - {getHeaderDate()}
          </h2>
          <div className="flex items-center gap-4">
            <Button
              label="Export as CSV"
              className="px-6 bg-darkPurple text-white hover:bg-darkPurple"
              icon={<BiExport size={18} />}
              onClick={handleExport}
            />
          </div>
        </div>

        {/* Date Filters with new styling */}
        <div className="text-sm font-normal text-[#726C6C] flex space-x-7 cursor-pointer ml-3 mb-8">
          <div
            onClick={() => {
              setDateFilter("today");
              setSelectedDate(new Date());
            }}
            className={`hover:text-[#4B0082] transition-colors ${dateFilter === "today" ? "text-[#4B0082]" : ""
              }`}
          >
            Today
          </div>
          <div
            onClick={() => {
              const yesterday = new Date();
              yesterday.setDate(yesterday.getDate() - 1);
              setDateFilter("yesterday");
              setSelectedDate(yesterday);
            }}
            className={`hover:text-[#4B0082] transition-colors ${dateFilter === "yesterday" ? "text-[#4B0082]" : ""
              }`}
          >
            Yesterday
          </div>
          <div className="relative">
            <div
              id="custom-date-button"
              onClick={() => setShowDatePicker(!showDatePicker)}
              className={`hover:text-[#4B0082] transition-colors flex items-center gap-1 ${dateFilter === "custom" ? "text-[#4B0082]" : ""
                }`}
            >
              Custom Date
              <CiCalendar size={18} />
            </div>
            {showDatePicker && (
              <div
                id="custom-date-picker"
                className="absolute top-full left-0 mt-2 bg-white p-4 rounded-lg shadow-lg z-50 border border-gray-200"
              >
                <DatePicker
                  selected={selectedDate}
                  onChange={handleDateChange}
                  inline
                  maxDate={new Date()}
                />
              </div>
            )}
          </div>
          {/* Custom Month Option */}
          <div className="relative">
            <div
              id="custom-month-button"
              onClick={() => setShowMonthPicker(!showMonthPicker)}
              className={`hover:text-[#4B0082] transition-colors flex items-center gap-1 ${dateFilter === "customMonth" ? "text-[#4B0082]" : ""
                }`}
            >
              Custom Month
              <CiCalendar size={18} />
            </div>
            {showMonthPicker && (
              <div
                id="custom-month-picker"
                className="absolute top-full left-0 mt-2 bg-white p-4 rounded-lg shadow-lg z-50 border border-gray-200"
              >
                <DatePicker
                  selected={selectedMonth}
                  onChange={handleMonthChange}
                  inline
                  showMonthYearPicker
                  dateFormat="MM/yyyy"
                  maxDate={new Date()}
                />
              </div>
            )}
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          {/* Net Bill Count Card */}
          <div className="bg-white p-6 rounded-lg border border-gray-200 flex items-center">
            <div className="rounded-xl mr-2">
              <Image
                src="/reportbillsummary.svg"
                alt="report icon"
                width={45}
                height={32}
              />
            </div>
            <div>
              <p className="text-sm text-gray-500">Net Bill Count</p>
              <p className="text-xl text-gray-800">
                {(summaryData?.paidTotalBills || 0) + (summaryData?.unpaidTotalBills || 0)}
              </p>
            </div>
          </div>

          {/* Total Sales Card */}
          <div className="bg-white p-6 rounded-lg border border-gray-200 flex items-center">
            <div className="rounded-xl mr-2">
              <Image
                src="/reportbillsummary.svg"
                alt="ruppee icon"
                width={45}
                height={32}
              />
            </div>
            <div>
              <p className="text-sm text-gray-500">Total Sales</p>
              <p className="text-xl text-gray-800">
                ₹{formatNumber((summaryData?.paidTotalAmount || 0) + (summaryData?.unpaidTotalAmount || 0))}
              </p>
            </div>
          </div>

          {/* Total Return Amount Card */}
          <div className="bg-white p-6 rounded-lg border border-gray-200 flex items-center">
            <div className="rounded-xl mr-2">
              <Image
                src="/salesreturn.svg"
                alt="return icon"
                width={45}
                height={32}
              />
            </div>
            <div>
              <p className="text-sm text-gray-500">Total Return </p>
              <p className="text-xl text-gray-800">
                ₹{formatNumber(summaryData?.totalReturnAmount || 0)}
              </p>
            </div>
          </div>

          {/* Net Sales Card */}
          <div className="bg-white p-6 rounded-lg border border-gray-200 flex items-center">
            <div className="rounded-xl mr-2">
              <Image
                src="/rupeeBillSummary.svg"
                alt="net sales icon"
                width={45}
                height={32}
              />
            </div>
            <div className="flex items-baseline">
              <p className="text-sm text-gray-500">Net Sales</p>
              <p className="text-xl text-gray-800 ml-2">
                ₹{formatNumber(
                  Math.max(
                    0,
                    ((summaryData?.paidTotalAmount || 0) + (summaryData?.unpaidTotalAmount || 0)) -
                    (summaryData?.totalReturnAmount || 0)
                  )
                )}
                {((summaryData?.paidTotalAmount || 0) + (summaryData?.unpaidTotalAmount || 0)) -
                  (summaryData?.totalReturnAmount || 0) < 0 && (
                    <span className=" ml-1">
                      (-{formatNumber(Math.abs(
                        ((summaryData?.paidTotalAmount || 0) + (summaryData?.unpaidTotalAmount || 0)) -
                        (summaryData?.totalReturnAmount || 0)
                      ))})
                    </span>
                  )}
              </p>
            </div>
          </div>
        </div>

        {/* Sales Summary */}
        <div className="bg-white p-8 rounded-lg border border-gray-200 mb-8">
          <h2 className="text-2xl font-bold text-gray-800 mb-6">Sales Summary</h2>
          <div className="flex justify-between text-gray-500 font-medium mb-4">
            <p></p>
            <div className="flex w-1/2 justify-between">
              <p>Bill Count</p>
              <p>Amount</p>
            </div>
          </div>
          <hr className="mb-4 border-gray-200" />
          <div className="space-y-4 text-gray-700">
            <div className="flex justify-between items-center">
              <p
                className={` ${(dateFilter === 'today' || dateFilter === 'yesterday' || dateFilter === 'customMonth')
                  ? 'cursor-pointer hover:text-[#4B0082] hover:underline'
                  : ''
                  }`}
                onClick={dateFilter === 'today' || dateFilter === 'yesterday' || dateFilter === 'customMonth' ? handlePaidBillsClick : undefined}
              >
                Paid Bills
              </p>
              <div className="flex w-1/2 justify-between">
                <p>{summaryData?.paidTotalBills || 0}</p>
                <p>₹{formatNumber(summaryData?.paidTotalAmount)}</p>
              </div>
            </div>

            <div className="flex justify-between items-center">
              <p
                className={`${(dateFilter === 'today' || dateFilter === 'yesterday' || dateFilter === 'customMonth')
                  ? 'cursor-pointer hover:text-[#4B0082] hover:underline'
                  : ''
                  }`}
                onClick={dateFilter === 'today' || dateFilter === 'yesterday' || dateFilter === 'customMonth' ? handleUnpaidBillsClick : undefined}
              >
                Unpaid Bills
              </p>
              <div className="flex w-1/2 justify-between">
                <p>{summaryData?.unpaidTotalBills || 0}</p>
                <p>₹{formatNumber(summaryData?.unpaidTotalAmount)}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Payment Type Summary */}
        <div className="bg-white p-8 rounded-lg border border-gray-200 mb-8">
          <h2 className="text-2xl font-bold text-gray-800 mb-6">Payment Type Summary</h2>
          <div className="flex justify-between text-gray-500 font-medium mb-4">
            <p></p>
            <div className="flex w-1/2 justify-between">
              <p>Bill Count</p>
              <p>Amount</p>
            </div>
          </div>
          <hr className="mb-4 border-gray-200" />
          <div className="space-y-4 text-gray-700">
            <div className="flex justify-between items-center">
              <p>Cash</p>
              <div className="flex w-1/2 justify-between">
                <p>{paymentSummaryData?.cashCount || 0}</p>
                <p>₹{formatNumber(paymentSummaryData?.cashTotal)}</p>
              </div>
            </div>
            <div className="flex justify-between items-center">
              <p>UPI</p>
              <div className="flex w-1/2 justify-between">
                <p>{paymentSummaryData?.upiNetCount || 0}</p>
                <p>₹{formatNumber(paymentSummaryData?.upiNetTotal)}</p>
              </div>
            </div>
            <div className="flex justify-between items-center">
              <p>Card</p>
              <div className="flex w-1/2 justify-between">
                <p>{paymentSummaryData?.cardCount || 0}</p>
                <p>₹{formatNumber(paymentSummaryData?.cardTotal)}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Return Summary */}
        <div className="bg-white p-8 rounded-lg border border-gray-200">
          <h2 className="text-2xl font-bold text-gray-800 mb-6">Return Summary</h2>
          <div className="flex justify-end text-gray-500 font-medium mb-4">
            <p className="w-1/4 text-right">Amount</p>
          </div>
          <hr className="mb-4 border-gray-200" />
          <div className="space-y-4 text-gray-700">
            <div className="flex justify-between items-center">
              <p>Total no. of Bill Returns</p>
              <p className="w-1/4 text-right">{summaryData?.totalReturnBills || 0}</p>
            </div>
            <div className="flex justify-between items-center">
              <p>Total Refund Amount</p>
              <p className="w-1/4 text-right">₹{formatNumber(summaryData?.totalReturnAmount)}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Page;
















// original code before feature changes........................

// "use client";

// import { useEffect, useState } from "react";
// import { format } from "date-fns";
// import {
//   getBillingSummaryByDate,
//   getPaymentSummaryByDate
// } from "@/app/services/BillingSummaryService";
// import {
//   BillingSummaryData,
//   PaymentSummaryData
// } from "@/app/types/BillingSummaryData";
// import { BiExport } from "react-icons/bi";
// import DatePicker from "react-datepicker";
// import "react-datepicker/dist/react-datepicker.css";
// import { CiCalendar } from "react-icons/ci";
// import Image from "next/image";
// import Button from "@/app/components/common/Button";
// import { exportAsCSVService } from "@/app/services/ExportAsCSVService";
// import { toast } from "react-toastify";
// import Loader from "@/app/components/common/Loader";
// import { useRouter } from 'next/navigation';

// const Page = () => {
//   const [summaryData, setSummaryData] = useState<BillingSummaryData | null>(null);
//   const [paymentSummaryData, setPaymentSummaryData] = useState<PaymentSummaryData | null>(null);
//   const [loading, setLoading] = useState(true);
//   const [dateFilter, setDateFilter] = useState("today");
//   const [selectedDate, setSelectedDate] = useState(new Date());
//   const [showDatePicker, setShowDatePicker] = useState(false);
//   const router = useRouter();

//   useEffect(() => {
//     const handleClickOutside = (event: MouseEvent) => {
//       const datePickerElement = document.getElementById("custom-date-picker");
//       const datePickerButton = document.getElementById("custom-date-button");

//       if (
//         showDatePicker &&
//         datePickerElement &&
//         !datePickerElement.contains(event.target as Node) &&
//         datePickerButton &&
//         !datePickerButton.contains(event.target as Node)
//       ) {
//         setShowDatePicker(false);
//       }
//     };

//     document.addEventListener("mousedown", handleClickOutside);
//     return () => {
//       document.removeEventListener("mousedown", handleClickOutside);
//     };
//   }, [showDatePicker]);

//   useEffect(() => {
//     const fetchSummaries = async () => {
//       try {
//         setLoading(true);
//         let dateToFetch = new Date();

//         if (dateFilter === "yesterday") {
//           dateToFetch.setDate(dateToFetch.getDate() - 1);
//         } else if (dateFilter === "custom") {
//           dateToFetch = selectedDate;
//         }

//         const [billingData, paymentData] = await Promise.all([
//           getBillingSummaryByDate(dateToFetch),
//           getPaymentSummaryByDate(dateToFetch)
//         ]);

//         setSummaryData(billingData);
//         setPaymentSummaryData(paymentData);
//       } catch (err) {
//         console.error("Failed to load summary:", err);
//         setSummaryData(null);
//         setPaymentSummaryData(null);
//       } finally {
//         setLoading(false);
//       }
//     };

//     fetchSummaries();
//   }, [dateFilter, selectedDate]);

//   const handleDateChange = (date: Date | null) => {
//     if (date) {
//       setSelectedDate(date);
//       setDateFilter("custom");
//       setShowDatePicker(false);
//     }
//   };

//   const formatNumber = (num: number | null | undefined): string => {
//     if (num === null || num === undefined) return "0.00";
//     if (Number.isInteger(num)) return num.toString();
//     return num.toFixed(2);
//   };

//   const prepareExportData = () => {
//     if (!summaryData || !paymentSummaryData) return [];

//     const formattedDate = format(selectedDate, "dd-MM-yyyy");

//     return [
//       {
//         "Type of Report": "Daily Closing Report",
//         "Date": formattedDate,
//         "Net sales (in Rs.)": formatNumber((summaryData.paidTotalAmount || 0) + (summaryData.unpaidTotalAmount || 0)),
//         "Total bill count": (summaryData.paidTotalBills || 0) + (summaryData.unpaidTotalBills || 0),
//         "Total Paid amount (in Rs.)": formatNumber(summaryData.paidTotalAmount),
//         "Bill count for Paid": summaryData.paidTotalBills || 0,
//         "Total Unpaid amount (in Rs.)": formatNumber(summaryData.unpaidTotalAmount),
//         "Bill count for Unpaid": summaryData.unpaidTotalBills || 0,
//         "Payment type (Cash)": formatNumber(paymentSummaryData.cashTotal),
//         "Payment type (UPI)": formatNumber(paymentSummaryData.upiNetTotal),
//         "Payment type (Card)": formatNumber(paymentSummaryData.cardTotal),
//         "Payment type (Cash+UPI)": formatNumber(paymentSummaryData.upiCashTotal),
//         "Total Refund Amount of bill returned": formatNumber(summaryData.totalReturnAmount),
//         "Total no. of bill return": summaryData.totalReturnBills || 0
//       }
//     ];
//   };

//   const handleExport = async () => {
//     try {
//       const dataToExport = prepareExportData();
//       const filename = `daily_report_${format(selectedDate, 'dd_MM_yyyy')}`;

//       await exportAsCSVService.exportData(
//         dataToExport,
//         'csv',
//         {
//           filename,
//           headers: {
//             "Type of Report": "Type of Report",
//             "Date": "Date"
//           },
//           csv: {
//             delimiter: ','
//           }
//         }
//       );

//       toast.success("CSV exported successfully!");
//     } catch (error) {
//       console.error("Export failed:", error);
//       toast.error(error instanceof Error ? error.message : "Failed to export CSV");
//     }
//   };

//   const handlePaidBillsClick = () => {
//     if (dateFilter !== 'today' && dateFilter !== 'yesterday') {
//       return;
//     }

//     const params = new URLSearchParams();
//     params.set('dateFilter', dateFilter);
//     params.set('paymentFilter', 'paid');

//     router.push(`/dashboard/salesReport?${params.toString()}`);
//   };


//   const handleUnpaidBillsClick = () => {
//     if (dateFilter !== 'today' && dateFilter !== 'yesterday') {
//       return;
//     }

//     const params = new URLSearchParams();
//     params.set('dateFilter', dateFilter);
//     params.set('paymentFilter', 'unpaid');

//     router.push(`/dashboard/salesReport?${params.toString()}`);
//   };

//   if (loading) {
//     return (
//       <div className="flex justify-center items-center h-64">
//         <Loader type="spinner" size="md" text="Loading ..." fullScreen={false} />
//       </div>
//     );
//   }

//   return (
//     <div className="w-full">
//       <div className="container mx-auto">
//         {/* Header */}
//         <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8">
//           <h2 className="text-darkPurple text-2xl md:text-3xl font-medium">
//             Daily Closing Report - {format(selectedDate, "MMMM dd, yyyy")}
//           </h2>
//           <div className="flex items-center gap-4">
//             <Button
//               label="Export as CSV"
//               className="px-6 bg-darkPurple text-white hover:bg-darkPurple"
//               icon={<BiExport size={18} />}
//               onClick={handleExport}
//             />
//           </div>
//         </div>

//         {/* Date Filters with new styling */}
//         <div className="text-sm font-normal text-[#726C6C] flex space-x-7 cursor-pointer ml-3 mb-8">
//           <div
//             onClick={() => {
//               setDateFilter("today");
//               setSelectedDate(new Date());
//             }}
//             className={`hover:text-[#4B0082] transition-colors ${dateFilter === "today" ? "text-[#4B0082]" : ""
//               }`}
//           >
//             Today
//           </div>
//           <div
//             onClick={() => {
//               const yesterday = new Date();
//               yesterday.setDate(yesterday.getDate() - 1);
//               setDateFilter("yesterday");
//               setSelectedDate(yesterday);
//             }}
//             className={`hover:text-[#4B0082] transition-colors ${dateFilter === "yesterday" ? "text-[#4B0082]" : ""
//               }`}
//           >
//             Yesterday
//           </div>
//           <div className="relative">
//             <div
//               id="custom-date-button"
//               onClick={() => setShowDatePicker(!showDatePicker)}
//               className={`hover:text-[#4B0082] transition-colors flex items-center gap-1 ${dateFilter === "custom" ? "text-[#4B0082]" : ""
//                 }`}
//             >
//               Custom Date
//               <CiCalendar size={18} />
//             </div>
//             {showDatePicker && (
//               <div
//                 id="custom-date-picker"
//                 className="absolute top-full left-0 mt-2 bg-white p-4 rounded-lg shadow-lg z-50 border border-gray-200"
//               >
//                 <DatePicker
//                   selected={selectedDate}
//                   onChange={handleDateChange}
//                   inline
//                   maxDate={new Date()}
//                 />
//               </div>
//             )}
//           </div>
//         </div>

//         {/* Stats Cards */}
//         <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
//           {/* Net Bill Count Card */}
//           <div className="bg-white p-6 rounded-lg border border-gray-200 flex items-center">
//             <div className="rounded-xl mr-2">
//               <Image
//                 src="/reportbillsummary.svg"
//                 alt="report icon"
//                 width={45}
//                 height={32}
//               />
//             </div>
//             <div>
//               <p className="text-sm text-gray-500">Net Bill Count</p>
//               <p className="text-xl text-gray-800">
//                 {(summaryData?.paidTotalBills || 0) + (summaryData?.unpaidTotalBills || 0)}
//               </p>
//             </div>
//           </div>

//           {/* Total Sales Card */}
//           <div className="bg-white p-6 rounded-lg border border-gray-200 flex items-center">
//             <div className="rounded-xl mr-2">
//               <Image
//                 src="/reportbillsummary.svg"
//                 alt="ruppee icon"
//                 width={45}
//                 height={32}
//               />
//             </div>
//             <div>
//               <p className="text-sm text-gray-500">Total Sales</p>
//               <p className="text-xl text-gray-800">
//                 ₹{formatNumber((summaryData?.paidTotalAmount || 0) + (summaryData?.unpaidTotalAmount || 0))}
//               </p>
//             </div>
//           </div>



//           {/* Total Return Amount Card */}
//           <div className="bg-white p-6 rounded-lg border border-gray-200 flex items-center">
//             <div className="rounded-xl mr-2">
//               <Image
//                 src="/salesreturn.svg"
//                 alt="return icon"
//                 width={45}
//                 height={32}
//               />
//             </div>
//             <div>
//               <p className="text-sm text-gray-500">Total Return </p>
//               <p className="text-xl text-gray-800">
//                 ₹{formatNumber(summaryData?.totalReturnAmount || 0)}
//               </p>
//             </div>
//           </div>

//           {/* Net Sales Card */}
//           <div className="bg-white p-6 rounded-lg border border-gray-200 flex items-center">
//             <div className="rounded-xl mr-2">
//               <Image
//                 src="/rupeeBillSummary.svg"
//                 alt="net sales icon"
//                 width={45}
//                 height={32}
//               />
//             </div>
//             <div className="flex items-baseline">
//               <p className="text-sm text-gray-500">Net Sales</p>
//               <p className="text-xl text-gray-800 ml-2">
//                 ₹{formatNumber(
//                   Math.max(
//                     0,
//                     ((summaryData?.paidTotalAmount || 0) + (summaryData?.unpaidTotalAmount || 0)) -
//                     (summaryData?.totalReturnAmount || 0)
//                   )
//                 )}
//                 {((summaryData?.paidTotalAmount || 0) + (summaryData?.unpaidTotalAmount || 0)) -
//                   (summaryData?.totalReturnAmount || 0) < 0 && (
//                     <span className=" ml-1">
//                       (-{formatNumber(Math.abs(
//                         ((summaryData?.paidTotalAmount || 0) + (summaryData?.unpaidTotalAmount || 0)) -
//                         (summaryData?.totalReturnAmount || 0)
//                       ))})
//                     </span>
//                   )}
//               </p>
//             </div>
//           </div>
//         </div>

//         {/* Sales Summary */}
//         <div className="bg-white p-8 rounded-lg border border-gray-200 mb-8">
//           <h2 className="text-2xl font-bold text-gray-800 mb-6">Sales Summary</h2>
//           <div className="flex justify-between text-gray-500 font-medium mb-4">
//             <p></p>
//             <div className="flex w-1/2 justify-between">
//               <p>Bill Count</p>
//               <p>Amount</p>
//             </div>
//           </div>
//           <hr className="mb-4 border-gray-200" />
//           <div className="space-y-4 text-gray-700">
//             <div
//               className={`flex justify-between items-center ${(dateFilter === 'today' || dateFilter === 'yesterday')
//                 ? 'cursor-pointer hover:bg-gray-50 p-2 rounded transition-colors'
//                 : ''
//                 }`}
//               onClick={dateFilter === 'today' || dateFilter === 'yesterday' ? handlePaidBillsClick : undefined}
//             >
//               <p>Paid Bills</p>
//               <div className="flex w-1/2 justify-between">
//                 <p>{summaryData?.paidTotalBills || 0}</p>
//                 <p>₹{formatNumber(summaryData?.paidTotalAmount)}</p>
//               </div>
//             </div>

//             <div
//               className={`flex justify-between items-center ${(dateFilter === 'today' || dateFilter === 'yesterday')
//                 ? 'cursor-pointer hover:bg-gray-50 p-2 rounded transition-colors'
//                 : ''
//                 }`}
//               onClick={dateFilter === 'today' || dateFilter === 'yesterday' ? handleUnpaidBillsClick : undefined}
//             >
//               <p>Unpaid Bills</p>
//               <div className="flex w-1/2 justify-between">
//                 <p>{summaryData?.unpaidTotalBills || 0}</p>
//                 <p>₹{formatNumber(summaryData?.unpaidTotalAmount)}</p>
//               </div>
//             </div>
//           </div>
//         </div>

//         {/* Payment Type Summary */}
//         <div className="bg-white p-8 rounded-lg border border-gray-200 mb-8">
//           <h2 className="text-2xl font-bold text-gray-800 mb-6">Payment Type Summary</h2>
//           <div className="flex justify-between text-gray-500 font-medium mb-4">
//             <p></p>
//             <div className="flex w-1/2 justify-between">
//               <p>Bill Count</p>
//               <p>Amount</p>
//             </div>
//           </div>
//           <hr className="mb-4 border-gray-200" />
//           <div className="space-y-4 text-gray-700">
//             <div className="flex justify-between items-center">
//               <p>Cash</p>
//               <div className="flex w-1/2 justify-between">
//                 <p>{paymentSummaryData?.cashCount || 0}</p>
//                 <p>₹{formatNumber(paymentSummaryData?.cashTotal)}</p>
//               </div>
//             </div>
//             <div className="flex justify-between items-center">
//               <p>UPI</p>
//               <div className="flex w-1/2 justify-between">
//                 <p>{paymentSummaryData?.upiNetCount || 0}</p>
//                 <p>₹{formatNumber(paymentSummaryData?.upiNetTotal)}</p>
//               </div>
//             </div>
//             <div className="flex justify-between items-center">
//               <p>Card</p>
//               <div className="flex w-1/2 justify-between">
//                 <p>{paymentSummaryData?.cardCount || 0}</p>
//                 <p>₹{formatNumber(paymentSummaryData?.cardTotal)}</p>
//               </div>
//             </div>
//             <div className="flex justify-between items-center">
//               <p>UPI + Cash</p>
//               <div className="flex w-1/2 justify-between">
//                 <p>{paymentSummaryData?.upiCashCount || 0}</p>
//                 <p>₹{formatNumber(paymentSummaryData?.upiCashTotal)}</p>
//               </div>
//             </div>
//           </div>
//         </div>

//         {/* Return Summary */}
//         <div className="bg-white p-8 rounded-lg border border-gray-200">
//           <h2 className="text-2xl font-bold text-gray-800 mb-6">Return Summary</h2>
//           <div className="flex justify-end text-gray-500 font-medium mb-4">
//             <p className="w-1/4 text-right">Amount</p>
//           </div>
//           <hr className="mb-4 border-gray-200" />
//           <div className="space-y-4 text-gray-700">
//             <div className="flex justify-between items-center">
//               <p>Total no. of Bill Returns</p>
//               <p className="w-1/4 text-right">{summaryData?.totalReturnBills || 0}</p>
//             </div>
//             <div className="flex justify-between items-center">
//               <p>Total Refund Amount</p>
//               <p className="w-1/4 text-right">₹{formatNumber(summaryData?.totalReturnAmount)}</p>
//             </div>
//           </div>
//         </div>
//       </div>
//     </div>
//   );
// };

// export default Page;