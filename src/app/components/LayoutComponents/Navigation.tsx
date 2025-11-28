"use client";

import { NavigationItem } from '@/app/types/NavigationItem'
import { MdDashboard, MdInventory, MdAssignmentReturn, MdOutlineInventory, MdBarChart } from "react-icons/md";
import { IoPeople, IoSettings } from "react-icons/io5";
import { RiMedicineBottleFill } from "react-icons/ri";
import { FaHouseChimneyMedical, FaNotesMedical } from "react-icons/fa6";
import { PiKeyReturnFill, PiReceiptFill } from "react-icons/pi";
import { FaChartArea, FaListAlt, FaUsers, FaWindowRestore } from 'react-icons/fa';
import { TbCreditCardFilled, TbReportMoney } from "react-icons/tb";
import { RiWaterPercentFill } from "react-icons/ri";
import { ClockAlert } from 'lucide-react';
import { BsCashStack } from 'react-icons/bs';
import { IoMdListBox } from "react-icons/io";
import { FaFileInvoice } from "react-icons/fa6";





export const navigation: NavigationItem[] = [
  { name: "Dashboard", href: "/dashboard", icon: MdDashboard, current: true },

  {
    name: "Purchase",
    icon: MdInventory,
    current: false,
    children: [
      { name: "Purchase Order", href: "/dashboard/order", current: false, icon: FaNotesMedical },
      { name: "Purchase Entry", href: "/dashboard/entry", current: false, icon: FaListAlt },
      { name: "Purchase Return", href: "/dashboard/return", current: false, icon: MdAssignmentReturn },
      { name: "Inventory", href: "/dashboard/stockreport", icon: MdOutlineInventory, current: true },
    ],
  },


  {
    name: "Sales",
    icon: PiReceiptFill,
    current: false,
    children: [
      { name: "Sale", href: "/dashboard/billing", icon: IoMdListBox, current: true },
      { name: "Sales Return", href: "/dashboard/salesReturn", icon: PiKeyReturnFill, current: true },


    ],
  },


  {
    name: "Stock Summary",
    icon: MdBarChart,
    current: false,
    children: [

      { name: "Purchase Summary", href: "/dashboard/purchaseDetails", icon: FaListAlt, current: true },
      { name: "Supplier Payment", href: "/dashboard/supplierPayment", icon: TbCreditCardFilled , current: true },
      { name: "GST Summary", href: "/dashboard/gstsummary", icon: RiWaterPercentFill, current: true },
      { name: "Expiry Stock", href: "/dashboard/expiryReport", icon: ClockAlert, current: true } ,
    ],
  },


  {
    name: "Sales Statistics",
    icon: FaChartArea,
    current: false,
    children: [
      { name: "Daily Closing Report", href: "/dashboard/billingSummary", icon: BsCashStack, current: true },
      { name: "Sales Report", href: "/dashboard/salesReport", icon: TbReportMoney, current: true },
      { name: "Sales GST Report", href: "/dashboard/salesGstReport", icon: FaFileInvoice, current: true },
    ],
  },


  {
    name: "Inventory Setting",
    icon: FaWindowRestore,
    current: false,
    children: [
      { name: "Supplier Master", href: "/dashboard/supplier", icon: IoPeople, current: true },
      { name: "Item Master", href: "/dashboard/item", icon: RiMedicineBottleFill, current: true },
      { name: "Variant Master", href: "/dashboard/variant", icon: RiMedicineBottleFill, current: true }

    ],
  },


  {
    name: "Settings",
    icon: IoSettings,
    current: false,
    children: [
      { name: "User Management", href: "/dashboard/userManagement", current: false, icon: FaUsers },
      // { name: "User Profile", href: "/dashboard/profile", current: false, icon: HiUser },
      { name: "Pharmacy", href: "/dashboard/pharmacy", current: false, icon: FaHouseChimneyMedical },
    ],
  },
];