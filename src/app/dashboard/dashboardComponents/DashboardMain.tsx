"use client";

import ConfirmDialog from "@/app/components/common/ConfirmDialog";
import { showToast } from "@/app/components/common/Toast";
import { deletePharmacyRegistration, getPharmacyRegistrationDetails, getUserOrganization, getUserPharmacyKPIs, getUserPharmacyRegistrations } from "@/services/SetupBusinessService";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import PharmacyDetailsModal from "./PharmacyDetailsModal";

export default function DashboardMain() {
  /*
  // PREVIOUS REDESIGNED CODE PRESERVED:
  const complianceStatus = 'Not Submitted'; 
  const hospitalName = 'ABC Hospital';
  const entityType = 'Hospital';

  const restrictedModules = [
    { name: 'Inventory', icon: '/dashboard/inventory.svg' },
    { name: 'Purchase', icon: '/dashboard/purchase.svg' },
    { name: 'Sales', icon: '/dashboard/sales.svg' },
    { name: 'Suppliers', icon: '/dashboard/suppliers.svg' },
    { name: 'Customers', icon: '/dashboard/Customer.svg' },
    { name: 'Reports', icon: '/dashboard/Reports.svg' },
    { name: 'Billing', icon: '/dashboard/billing.svg' },
  ];
  */

  const setupPercentage = 0; // Dynamic setup percentage
  const applicationStep = 2; // Dynamic step status: 1 = Submitted, 2 = Under Review, 3 = Approved
  const router = useRouter();

  const [kpis, setKpis] = useState({
    totalPharmacies: 0,
    approved: 0,
    underReview: 0,
    actionRequired: 0,
    rejected: 0
  });

  const [selectedDetails, setSelectedDetails] = useState<any>(null);
  const [selectedCard, setSelectedCard] = useState<any>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [detailsLoading, setDetailsLoading] = useState(false);

  const handleViewDetails = async (card: any) => {
    setDetailsLoading(true);
    try {
      const details = await getPharmacyRegistrationDetails(card.reqId);
      if (details && details.data) {
        setSelectedDetails(details.data);
        setSelectedCard(card);
        setIsModalOpen(true);
      }
    } catch (err) {
      console.error("Failed to fetch details:", err);
    } finally {
      setDetailsLoading(false);
    }
  };

  const handleEdit = () => {
    if (!selectedCard) return;
    setIsModalOpen(false);
    router.push(`/dashboard/setupBusiness?reqId=${selectedCard.reqId}`);
  };

  const [deleting, setDeleting] = useState(false);
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);

  // Delete button in the details modal only opens the confirmation popup;
  // the actual delete runs from confirmDelete once the user confirms.
  const handleDelete = () => {
    if (!selectedCard) return;
    setConfirmDeleteOpen(true);
  };

  const confirmDelete = async () => {
    if (!selectedCard) return;

    setDeleting(true);
    try {
      await deletePharmacyRegistration(selectedCard.reqId);
      setApplicationCards((prev) => prev.filter((c) => c.reqId !== selectedCard.reqId));
      setKpis((prev) => ({
        ...prev,
        totalPharmacies: Math.max(0, prev.totalPharmacies - 1),
      }));
      showToast.success("Draft deleted successfully!");
      setConfirmDeleteOpen(false);
      setIsModalOpen(false);
      setSelectedDetails(null);
      setSelectedCard(null);
    } catch (err: any) {
      showToast.error(err?.message || "Failed to delete draft.");
      console.error("Delete failed:", err);
    } finally {
      setDeleting(false);
    }
  };

  const cards = [
    {
      title: "Total Location",
      value: kpis.totalPharmacies,
      icon: "/BusinessSetup/LocationIcon.svg",
    },
    {
      title: "Approved",
      value: kpis.approved,
      icon: "/BusinessSetup/ApprovedIcon.svg",
    },
    {
      title: "Under Review",
      value: kpis.underReview,
      icon: "/BusinessSetup/UnderReviewIcon.svg",
    },
    {
      title: "Action Required",
      value: kpis.actionRequired,
      icon: "/BusinessSetup/ActionReviewIcon.svg",
    },
  ];

  const STATUS_CONFIG = {
    UNDER_REVIEW: {
      label: "Under Review",
      badge: "bg-[#EAEFFF] text-[#2141B5]",
      icon: "/PharmacyDetails/PharmacyIcon.svg",
      iconBg: "bg-[#F3EDFF]",
    },

    ACTION_REQUIRED: {
      label: "Action Required",
      badge: "bg-[#FFF9E6] text-[#BA2C2C]",
      icon: "/PharmacyDetails/PharmacyIcon.svg",
      iconBg: "bg-[#FFF8E8]",
    },

    APPROVED: {
      label: "Approved",
      badge: "bg-[#DCF7CB] text-[#409600]",
      icon: "/PharmacyDetails/PharmacyIcon.svg",
      iconBg: "bg-[#DFF5D1]",
    },

    REJECT: {
      label: "Rejected",
      badge: "bg-[#FEE2E2] text-[#991B1B]",
      icon: "/PharmacyDetails/PharmacyIcon.svg",
      iconBg: "bg-[#FEE2E2]",
    },

    DRAFT: {
      label: "Draft",
      badge: "bg-[#ECECEC] text-[#404040]",
      icon: "/PharmacyDetails/PharmacyIcon.svg",
      iconBg: "bg-[#ECECEC]",
    },

    NOT_STARTED: {
      label: "Not Started",
      badge: "bg-[#ECECEC] text-[#404040]",
      icon: "/PharmacyDetails/PharmacyIcon.svg",
      iconBg: "bg-[#ECECEC]",
    },
  };

  const [applicationCards, setApplicationCards] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [organizationType, setOrganizationType] = useState<string>("");

  useEffect(() => {
    const fetchPharmacies = async () => {
      try {
        // Fetch logged-in user information first
        const userResponse = await fetch('/api/user-info');
        if (!userResponse.ok) {
          console.error("Failed to fetch user info");
          setLoading(false);
          return;
        }

        const { userId } = await userResponse.json();

        if (!userId) {
          console.error("No userId found for the current user");
          setLoading(false);
          return;
        }

        const [response, kpiResponse, org] = await Promise.all([
          getUserPharmacyRegistrations(String(userId)),
          getUserPharmacyKPIs(String(userId)),
          getUserOrganization()
        ]);

        if (org && org.organizationType) {
          setOrganizationType(org.organizationType);
        }

        if (kpiResponse && kpiResponse.data) {
          setKpis({
            totalPharmacies: kpiResponse.data.totalPharmacies || 0,
            approved: kpiResponse.data.approved || 0,
            underReview: kpiResponse.data.underReview || 0,
            actionRequired: kpiResponse.data.actionRequired || 0,
            rejected: kpiResponse.data.rejected || 0
          });
        }

        if (response && response.data) {
          const formattedData = response.data.map((item: any) => {
            const date = item.updatedDate ? new Date(item.updatedDate) : new Date();
            const formattedDate = date.toLocaleDateString('en-GB', {
              day: '2-digit',
              month: 'short',
              year: 'numeric'
            });

            let mappedStatus = "NOT_STARTED";
            switch (item.status) {
              case "SUBMITTED":
                mappedStatus = "UNDER_REVIEW";
                break;
              case "CORRECTION":
                mappedStatus = "ACTION_REQUIRED";
                break;
              case "ACCEPT":
                mappedStatus = "APPROVED";
                break;
              case "REJECT":
                mappedStatus = "REJECT";
                break;
              case "DRAFT":
                mappedStatus = "DRAFT";
                break;
              default:
                mappedStatus = item.status || "NOT_STARTED";
            }

            return {
              hospitalName: item.pharmacyName,
              status: mappedStatus,
              lastUpdated: formattedDate,
              description: item.type,
              reqId: item.pharmacyReqId,
            };
          });
          setApplicationCards(formattedData);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchPharmacies();
  }, []);

  return (
    // <div className="flex flex-col select-none font-body w-full max-w-7xl gap-8">

    //   {/* Title & Setup Call-to-action Section */}
    //   <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 w-full">
    //     {/* Welcome Text block */}
    //     <div className="flex flex-col gap-2 w-full max-w-[500px]">
    //       <h1 className="text-h4 font-semibold font-work-sans leading-[44px] text-pneutral-900">
    //         Welcome to TiaMeds
    //       </h1>
    //       <p className="text-p3 font-normal text-pneutral-900 font-body leading-normal">
    //         Complete your Business setup to start using <br /> TiaMeds Inventory Platform
    //       </p>
    //     </div>

    //     {/* Start Setup Button */}
    //     <Button
    //       onClick={() => router.push("/dashboard/setupBusiness")}
    //       variant="primary"
    //       className="w-[272px] h-[48px] rounded-[8px] font-work-sans font-medium text-[16px] leading-[32px] text-pneutral-50 whitespace-nowrap select-none shrink-0"
    //     >
    //       Start Setting Up Your Business
    //     </Button>
    //   </div>

    //   {/* Grid containing Cards */}
    //   <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 w-full">

    //     {/* Left Card: Setup Progress (Stretched to w-full) */}
    //     <div className="w-full h-[208px] bg-white border border-pneutral-200 rounded-[10px] p-4 flex flex-col gap-4 overflow-hidden select-none shrink-0">
    //       {/* Card Header (divider line placed below the percentage) */}
    //       <div className="flex flex-col border-b border-pneutral-100 pb-2 w-full gap-3">
    //         <span className="text-[16px] font-bold text-pneutral-900 font-body leading-none">
    //           Setup Progress
    //         </span>
    //         <span className="text-[12px] font-normal text-pneutral-500 font-body leading-none">
    //           {setupPercentage}% Complete
    //         </span>
    //       </div>

    //       {/* Setup Steps (w-[447.33px] h-[106.44px]) */}
    //       <div className="flex flex-col justify-between w-full h-[106.44px] gap-[14px] mt-1">
    //         {/* Step 1: Business Information */}
    //         <div className="flex items-center justify-between w-full h-[26px]">
    //           <div className="flex items-center gap-3">
    //             <Image
    //               src="/dashboard/icons/step 1.svg"
    //               alt="Step 1"
    //               width={24}
    //               height={24}
    //               className="object-contain shrink-0"
    //             />
    //             <span className="text-[14px] font-normal text-pneutral-800 font-body leading-none">
    //               Business Information
    //             </span>
    //           </div>
    //           {/* Status Box (single line) */}
    //           <div className="w-[96px] h-[26px] bg-pneutral-50 border border-pneutral-200 rounded-[4px] py-1 px-2 flex items-center justify-center text-[12px] font-medium text-pneutral-900 font-body leading-none select-none whitespace-nowrap">
    //             Not Started
    //           </div>
    //         </div>

    //         {/* Step 2: Location Setup */}
    //         <div className="flex items-center justify-between w-full h-[26px]">
    //           <div className="flex items-center gap-3">
    //             <Image
    //               src="/dashboard/icons/step 2.svg"
    //               alt="Step 2"
    //               width={24}
    //               height={24}
    //               className="object-contain shrink-0"
    //             />
    //             <span className="text-[14px] font-normal text-pneutral-800 font-body leading-none">
    //               Location Setup
    //             </span>
    //           </div>
    //           <div className="w-[96px] h-[26px] bg-pneutral-50 border border-pneutral-200 rounded-[4px] py-1 px-2 flex items-center justify-center text-[12px] font-medium text-pneutral-900 font-body leading-none select-none whitespace-nowrap">
    //             Not Started
    //           </div>
    //         </div>

    //         {/* Step 3: Compliance Submission */}
    //         <div className="flex items-center justify-between w-full h-[26px]">
    //           <div className="flex items-center gap-3">
    //             <Image
    //               src="/dashboard/icons/step 3.svg"
    //               alt="Step 3"
    //               width={24}
    //               height={24}
    //               className="object-contain shrink-0"
    //             />
    //             <span className="text-[14px] font-normal text-pneutral-800 font-body leading-none">
    //               Compliance Submission
    //             </span>
    //           </div>
    //           <div className="w-[96px] h-[26px] bg-pneutral-50 border border-pneutral-200 rounded-[4px] py-1 px-2 flex items-center justify-center text-[12px] font-medium text-pneutral-900 font-body leading-none select-none whitespace-nowrap">
    //             Not Started
    //           </div>
    //         </div>

    //       </div>
    //     </div>

    //     {/* Right Card: Application Status Card (Stretched to w-full) */}
    //     <div className="w-full h-[208px] bg-white border border-pneutral-200 rounded-[10px] p-4 flex flex-col gap-4 overflow-hidden select-none shrink-0">
    //       <div className="flex flex-col border-b border-pneutral-100 pb-2 w-full gap-1">
    //         <span className="text-[16px] font-bold text-pneutral-900 font-body leading-none">
    //           Application Status
    //         </span>
    //       </div>

    //       {/* Dynamic Horizontal Wizard Flow Container */}
    //       <div className="flex flex-col w-full max-w-[436px] mx-auto select-none mt-3">
    //         {/* Circles Row */}
    //         <div className="relative flex items-center justify-between w-full h-[54px]">
    //           {/* Background Line Connector */}
    //           <div className="absolute top-[26px] left-[27px] right-[27px] h-[2px] flex z-0">
    //             <div className={`h-full w-1/2 ${applicationStep >= 2 ? 'bg-[#56C201]' : 'bg-pneutral-200'}`}></div>
    //             <div className={`h-full w-1/2 ${applicationStep >= 3 ? 'bg-[#56C201]' : 'bg-pneutral-200'}`}></div>
    //           </div>

    //           {/* Step 1 Circle (Submission: Always Completed) */}
    //           <div className="w-[54px] h-[54px] rounded-full border-2 border-[#56C201] bg-[#56C201] flex items-center justify-center z-10 shrink-0">
    //             <Image
    //               src="/dashboard/icons/completed.svg"
    //               alt="Completed"
    //               width={22}
    //               height={20}
    //               className="object-contain shrink-0"
    //             />
    //           </div>

    //           {/* Step 2 Circle (Under Review) */}
    //           <div className={`w-[54px] h-[54px] rounded-full border-2 flex items-center justify-center z-10 shrink-0 ${
    //             applicationStep >= 2 ? 'border-secondary-700 bg-secondary-700' : 'border-pneutral-300 bg-white'
    //           }`}>
    //             <Image
    //               src={applicationStep >= 2 ? '/dashboard/icons/inprogress.svg' : '/dashboard/icons/pending.svg'}
    //               alt="Status"
    //               width={applicationStep >= 2 ? 26 : 27}
    //               height={applicationStep >= 2 ? 24 : 27}
    //               className="object-contain shrink-0"
    //             />
    //           </div>

    //           {/* Step 3 Circle (Approved) */}
    //           <div className={`w-[54px] h-[54px] rounded-full border-2 flex items-center justify-center z-10 shrink-0 ${
    //             applicationStep >= 3 ? 'border-[#56C201] bg-[#56C201]' : 'border-pneutral-300 bg-white'
    //           }`}>
    //             <Image
    //               src={applicationStep >= 3 ? '/dashboard/icons/completed.svg' : '/dashboard/icons/pending.svg'}
    //               alt="Status"
    //               width={applicationStep >= 3 ? 22 : 27}
    //               height={applicationStep >= 3 ? 20 : 27}
    //               className="object-contain shrink-0"
    //             />
    //           </div>
    //         </div>

    //         {/* Labels Row */}
    //         <div className="flex justify-between items-start w-full mt-2">
    //           {/* Step 1 Label */}
    //           <div className="w-[120px] flex flex-col items-center text-center gap-0.5">
    //             <span className="text-[11px] font-medium text-pneutral-800 font-body leading-tight">
    //               Application Submission
    //             </span>
    //             <span className="text-[10px] font-bold text-success-600 font-body">
    //               Completed
    //             </span>
    //           </div>

    //           {/* Step 2 Label */}
    //           <div className="w-[120px] flex flex-col items-center text-center gap-0.5">
    //             <span className="text-[11px] font-medium text-pneutral-800 font-body leading-tight">
    //               Under Review
    //             </span>
    //             <span className={`text-[10px] font-bold font-body ${applicationStep >= 2 ? 'text-secondary-600' : 'text-pneutral-400'}`}>
    //               {applicationStep >= 2 ? 'In Progress' : 'Pending'}
    //             </span>
    //           </div>

    //           {/* Step 3 Label */}
    //           <div className="w-[120px] flex flex-col items-center text-center gap-0.5">
    //             <span className={`text-[11px] font-medium font-body leading-tight ${applicationStep >= 3 ? 'text-pneutral-800' : 'text-pneutral-400'}`}>
    //               Approved
    //             </span>
    //             <span className={`text-[10px] font-bold font-body ${applicationStep >= 3 ? 'text-success-600' : 'text-pneutral-400'}`}>
    //               {applicationStep >= 3 ? 'Completed' : 'Pending'}
    //             </span>
    //           </div>
    //         </div>

    //       </div>
    //     </div>

    //   </div>

    //   {/* Two empty identical boxes below */}
    //   <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 w-full">
    //     <div className="w-full h-[208px] bg-white border border-pneutral-200 rounded-[10px] shrink-0"></div>
    //     <div className="w-full h-[208px] bg-white border border-pneutral-200 rounded-[10px] shrink-0"></div>
    //   </div>

    // </div>

    <>
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-2">
          <div className="text-h4 font-semibold text-pneutral-900">
            Welcome to TiaMeds
          </div>
          <div className="text-p4 font-normal text-pneutral-900 font-noto-sans">
            Complete your Business setup to start using <br /> TiaMeds Inventory
            Platform
          </div>
        </div>

        <div className="flex flex-wrap gap-4">
          {cards.map((card) => (
            <div
              key={card.title}
              className="w-[290px] h-[108px] gap-[16px] rounded-xl border border-pneutral-100 bg-white p-4 grid grid-cols-[64px_1fr]"
            >
              <div className="flex items-center justify-center">
                <Image
                  src={card.icon}
                  alt={card.title}
                  width={52}
                  height={52}
                />
              </div>

              <div className="flex flex-col justify-center gap-4">
                <p className="text-label-l3 font-medium text-pneutral-900">
                  {card.title}
                </p>

                <p className="text-h4 font-medium text-pneutral-900 leading-none">
                  {card.value}
                </p>
              </div>
            </div>
          ))}
        </div>

        <div className="w-full h-17.5 p-4 border border-pneutral-200 bg-white rounded-lg flex justify-between items-center">
          <div className="text-p5 font-medium font-noto-sans">
            Application Status
          </div>
          <div className="flex gap-4">
            <div className="w-[153px] h-[36px] border-[1.5px] border-secondary-100 rounded-lg flex items-center px-3 gap-2 bg-white">
              <Image
                src="/BusinessSetup/SearchIcon.svg"
                alt="Search"
                width={16}
                height={16}
              />

              <input
                type="text"
                placeholder="Search Location..."
                className="w-full bg-transparent outline-none text-p2 font-normal placeholder:text-pneutral-400"
              />
            </div>
            <div>
              <button className="w-[117px] h-[36px] border-[1.5px] border-pneutral-300 rounded-lg text-p2 font-normal flex items-center justify-center gap-2">
                All Status
                <Image
                  src="/BusinessSetup/DropdownIcon.svg"
                  alt="Dropdown"
                  width={16}
                  height={16}
                />
              </button>
            </div>

            <div>
              <button
                onClick={() => {
                  if (organizationType?.toLowerCase() === "multiple") {
                    router.push("/dashboard/setupBusiness");
                  }
                }}
                disabled={organizationType?.toLowerCase() !== "multiple"}
                className={`w-[139px] h-[36px] border-[1.5px] border-secondary-700 rounded-lg text-label-l3 font-medium text-secondary-700 flex items-center justify-center gap-2 ${organizationType?.toLowerCase() !== "multiple" ? "opacity-50 cursor-not-allowed" : "hover:bg-secondary-50 transition-colors"}`}
              >
                <Image
                  src="/BusinessSetup/PlusIcon.svg"
                  alt="Add"
                  width={16}
                  height={16}
                />
                Add Location
              </button>
            </div>
          </div>
        </div>

        {/* <div>
          <div className="relative  w-[316px] h-[182px] border border-pneutral-100 rounded-lg bg-white p-3 flex flex-col gap-3">
            <div className="text-p2 font-semibold font-noto-sans text-pneutral-900">
              Application Status
            </div>
            <div className="text-p2 font-normal font-noto-sans text-pneutral-900">
              ABC Hospital - Main Branch
            </div>
            <div>
              <span className="inline-flex items-center h-[22px] px-3 rounded-lg bg-[#EAEFFF] text-[#2141B5] text-label-l2 font-medium">
                Under Review
              </span>
            </div>

            <div className="absolute right-4 top-[66px] rounded-full bg-[#F3EDFF] flex items-center justify-center">
              <Image
                src="/PharmacyDetails/PharmacyIcon.svg"
                alt="Status"
                width={52}
                height={52}
              />
            </div>

            <div className="text-p2">
              <span>Last Updated: </span>
              <span className="text-warning-500">12 Jan 2026</span>
            </div>
            <div>
              <button className="w-[292px] h-[36px] bg-secondary-700 text-label-l3 font-medium text-pneutral-50 rounded-lg">
                View Details
              </button>
            </div>
          </div>
        </div> */}

        <div className="grid grid-cols-3 gap-4">
          {loading ? (
            <div className="col-span-3 py-10 flex items-center justify-center text-pneutral-500">
              Loading applications...
            </div>
          ) : applicationCards.length === 0 ? (
            <div className="col-span-3 py-10 flex items-center justify-center text-pneutral-500">
              No applications found.
            </div>
          ) : applicationCards.map((card, index) => {
            const config =
              STATUS_CONFIG[card.status as keyof typeof STATUS_CONFIG] || STATUS_CONFIG.NOT_STARTED;

            return (
              <div
                key={index}
                className="relative w-[316px] h-[182px] border border-pneutral-100 rounded-lg bg-white p-3"
              >
                {/* Title */}
                <div className="text-p2 font-semibold font-noto-sans text-pneutral-900">
                  Application Status
                </div>

                {/* Hospital */}
                <div className="mt-2 text-p2 font-normal text-pneutral-900">
                  {card.hospitalName}
                </div>

                {/* Badge */}
                <div className="mt-3">
                  <span
                    className={`inline-flex items-center h-[22px] px-3 rounded-lg text-label-l2 font-medium ${config.badge}`}
                  >
                    {config.label}
                  </span>
                </div>

                {/* Floating Icon */}
                <div
                  className={`absolute right-4 top-[66px] rounded-full flex items-center justify-center ${config.iconBg}`}
                >
                  <Image
                    src={config.icon}
                    alt={config.label}
                    width={52}
                    height={52}
                  />
                </div>

                {/* Description / Last Updated */}
                {card.status === "NOT_STARTED" ? (
                  <div className="mt-4 text-p2 text-pneutral-700">
                    {card.description}
                  </div>
                ) : (
                  <div className="mt-4 text-p2">
                    <span>Last Updated: </span>
                    <span className="text-warning-500">{card.lastUpdated}</span>
                  </div>
                )}

                <button
                  onClick={() => handleViewDetails(card)}
                  disabled={detailsLoading}
                  className="absolute bottom-3 left-3 right-3 h-[36px] rounded-lg bg-secondary-700 text-label-l3 font-medium text-white disabled:opacity-50 flex items-center justify-center transition-colors hover:bg-secondary-800"
                >
                  View Details
                </button>
              </div>
            );
          })}
        </div>
      </div>

      <PharmacyDetailsModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setSelectedDetails(null);
          setSelectedCard(null);
        }}
        data={selectedDetails}
        status={selectedCard?.status}
        onEdit={handleEdit}
        onDelete={handleDelete}
        deleting={deleting}
      />

      <ConfirmDialog
        isOpen={confirmDeleteOpen}
        title="Delete Draft"
        message="Are you sure you want to delete this draft registration? This action cannot be undone."
        confirmLabel="Delete"
        cancelLabel="Cancel"
        destructive
        loading={deleting}
        onConfirm={confirmDelete}
        onCancel={() => setConfirmDeleteOpen(false)}
      />
    </>
  );
}
