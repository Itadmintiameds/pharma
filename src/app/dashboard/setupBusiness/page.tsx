"use client";

import React, { useState, useEffect, Suspense } from 'react';
import SetupBusinessView from './components/SetupBusiness';
import SetupPharmacy from './components/SetupPharmacy';
import { EMPTY_WAREHOUSE, WarehouseDetails } from '@/types/SetupWarehouseData';
import { getUserOrganization, getPharmacyRegistrations, getPharmacyRegistrationDetails } from '@/services/SetupBusinessService';
import { getWarehousesByOrganizationId } from '@/services/SetupWarehouseService';
import Button from '@/app/components/common/Button';
import { useRouter, useSearchParams } from 'next/navigation';

function SetupBusinessContent() {
  const [businessName, setBusinessName] = useState("");
  const [ownershipType, setOwnershipType] = useState("");
  const [panNumber, setPanNumber] = useState("");
  const [gstNumber, setGstNumber] = useState("");
  const [locationType, setLocationType] = useState<"single" | "multiple">("single");
  const [manageCentrally, setManageCentrally] = useState<boolean | null>(null);
  const [warehouse, setWarehouse] = useState<WarehouseDetails>(EMPTY_WAREHOUSE);
  const [showProductManagement, setShowProductManagement] = useState(false);
  const [hasOrganization, setHasOrganization] = useState(false);
  const [existingOrg, setExistingOrg] = useState<any>(null);
  const [isSingleLocationRegistered, setIsSingleLocationRegistered] = useState(false);
  const [loading, setLoading] = useState(true);
  const [prefillData, setPrefillData] = useState<any>(null);
  const router = useRouter();
  const searchParams = useSearchParams();
  const reqId = searchParams.get("reqId");

  useEffect(() => {
    const fetchOrgAndRegistrations = async () => {
      try {
        const userRes = await fetch("/api/user-info");
        if (!userRes.ok) {
          setLoading(false);
          return;
        }
        const { accessToken } = await userRes.json();

        // Edit mode: fetch existing registration details and autofill the form
        let details: any = null;
        if (reqId) {
          details = await getPharmacyRegistrationDetails(reqId, accessToken);
          if (details && details.data) {
            setPrefillData(details.data);
          }
        }

        const org = await getUserOrganization();
        if (org && org.organizationId) {
          setHasOrganization(true);
          setExistingOrg(org);
          setBusinessName(org.organizationName || "");
          setOwnershipType(org.ownershipType || "");
          setPanNumber(org.panNumber || "");
          setGstNumber(org.gstNumber || "");
          setLocationType(org.organizationType?.toLowerCase() === "multiple" ? "multiple" : "single");

          // Existing org may already own a central warehouse — fetch it instead
          // of showing the "add warehouse" step, so new registrations carry it
          // forward automatically.
          const orgWarehouses = await getWarehousesByOrganizationId(org.organizationId);
          if (orgWarehouses.length > 0) {
            const wh = orgWarehouses[0];
            setManageCentrally(true);
            setWarehouse({
              warehouseName: wh.warehouseName || "",
              warehouseCode: wh.warehouseCode || "",
              warehouseAddress: wh.warehouseAddress || "",
              contactPersonName: wh.contactPersonName || "",
              mobileNumber: wh.mobileNumber || "",
            });
          }

          // Fetch registrations from admin backend
          const regRes = await getPharmacyRegistrations(accessToken);
          if (regRes && regRes.data) {
            const existingRegs = regRes.data.filter(
              (r: any) => Number(r.organizationId) === Number(org.organizationId)
            );

            if (existingRegs.length > 0) {
              const isSingle = existingRegs.some(
                (r: any) => r.organizationType === "Single"
              );

              if (isSingle) {
                setIsSingleLocationRegistered(true);
                setLocationType("single");
              } else {
                setLocationType("multiple");
              }
            }
          }
        } else if (details?.data) {
          // First-time registration (no organization yet): the org + central
          // warehouse details only live on the draft, so restore them here.
          // If an organization already exists we skip this and use its details.
          const d = details.data;
          setBusinessName(d.organizationName || "");
          setOwnershipType(d.ownershipType || "");
          setPanNumber(d.organizationPanNumber || "");
          setGstNumber(d.organizationGstNumber || "");
          setLocationType(
            d.organizationType?.toLowerCase() === "multiple" ? "multiple" : "single"
          );
          setManageCentrally(
            d.centralizedInventory === true
              ? true
              : d.centralizedInventory === false
                ? false
                : null
          );
          const wh = d.pharmacyRegistrationWareHouses?.[0];
          if (wh) {
            setWarehouse({
              warehouseName: wh.warehouseName || "",
              warehouseCode: wh.warehouseCode || "",
              warehouseAddress: wh.warehouseAddress || "",
              contactPersonName: wh.contactPersonName || "",
              mobileNumber: wh.mobileNumber || "",
            });
          }
        }
      } catch (err) {
        console.error("Failed to initialize setup page:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchOrgAndRegistrations();
  }, [reqId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 w-full">
      {isSingleLocationRegistered && !reqId ? (
        <div className="flex items-center justify-center w-full py-8">
          <div 
            className="bg-white rounded-2xl p-8 shadow-sm border border-pneutral-100 flex flex-col items-center justify-center gap-6 text-center shrink-0"
            style={{ width: '100%', maxWidth: '450px' }}
          >
            <div className="h-16 w-16 bg-[#FFFBEB] rounded-full flex items-center justify-center text-[#D97706] mb-1">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-10 h-10">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m0-10.036A11.959 11.959 0 0 1 3.598 6 11.99 11.99 0 0 0 3 9.75c0 5.592 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.57-.598-3.75h-.152c-3.196 0-6.1-1.249-8.25-3.286Zm0 13.036h.008v.008H12v-.008Z" />
              </svg>
            </div>
            <div className="flex flex-col gap-3 w-full">
              <h2 className="text-[20px] font-bold text-pneutral-900 font-work-sans">Setup Already Completed</h2>
              <p className="text-p4 text-pneutral-500 font-noto-sans leading-relaxed w-full">
                Your organization is configured as a <strong>Single Location</strong> type, and a location/pharmacy registration has already been submitted. Multiple locations are not permitted under this profile.
              </p>
              <div className="bg-pneutral-50 text-[13px] font-medium text-pneutral-600 font-noto-sans p-3.5 rounded-lg border border-pneutral-200 mt-2 w-full leading-relaxed">
                💡 <strong>Note:</strong> To add more entities or locations, please edit your organization profile type to <strong>Multiple Location</strong>.
              </div>
            </div>
            <Button variant="primary" className="w-full mt-2" onClick={() => router.push("/dashboard")}>
              Go to Dashboard
            </Button>
          </div>
        </div>
      ) : (
        <>
          {!hasOrganization && !showProductManagement && (
            <SetupBusinessView
              businessName={businessName}
              setBusinessName={setBusinessName}
              ownershipType={ownershipType}
              setOwnershipType={setOwnershipType}
              panNumber={panNumber}
              setPanNumber={setPanNumber}
              gstNumber={gstNumber}
              setGstNumber={setGstNumber}
              locationType={locationType}
              setLocationType={setLocationType}
            />
          )}
          <SetupPharmacy
            businessName={businessName}
            ownershipType={ownershipType}
            panNumber={panNumber}
            gstNumber={gstNumber}
            locationType={locationType}
            manageCentrally={manageCentrally}
            setManageCentrally={setManageCentrally}
            warehouse={warehouse}
            setWarehouse={setWarehouse}
            showProductManagement={showProductManagement}
            setShowProductManagement={setShowProductManagement}
            hasOrganization={hasOrganization}
            existingOrg={existingOrg}
            prefillData={prefillData}
          />
        </>
      )}
    </div>
  );
}

export default function SetupBusinessPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
        </div>
      }
    >
      <SetupBusinessContent />
    </Suspense>
  );
}
