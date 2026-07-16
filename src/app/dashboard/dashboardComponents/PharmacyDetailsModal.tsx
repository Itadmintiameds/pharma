import React from "react";
import Image from "next/image";

interface PharmacyDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  data: any | null;
}

export default function PharmacyDetailsModal({
  isOpen,
  onClose,
  data,
}: PharmacyDetailsModalProps) {
  if (!isOpen || !data) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
      <div className="relative h-[85vh] w-full max-w-3xl rounded-2xl bg-white p-6 shadow-2xl flex flex-col">
        {/* Header */}
        <div className="flex justify-between items-center border-b border-gray-200 pb-4 shrink-0">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">
              {data.pharmacyName || "Pharmacy Details"}
            </h2>
            <p className="text-sm text-gray-500 mt-1">
              Req ID: {data.pharmacyRegistrationId} • {data.pharmacyType}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <Image
              src="/PharmacyDetails/CloseIcon.svg"
              alt="Close"
              width={16}
              height={16}
            />
          </button>
        </div>

        {/* Content (Scrollable) */}
        <div className="flex-1 overflow-y-auto py-4 pr-2 space-y-8">
          
          {/* Section: Business Details */}
          <section>
            <h3 className="text-lg font-semibold text-gray-800 mb-3">
              Business Details
            </h3>
            <div className="grid grid-cols-2 gap-4 text-sm text-gray-600">
              <div>
                <span className="font-medium text-gray-900">Branch: </span>
                {data.pharmacyBranch || "-"}
              </div>
              <div>
                <span className="font-medium text-gray-900">City: </span>
                {data.pharmacyCity || "-"}
              </div>
              <div>
                <span className="font-medium text-gray-900">State: </span>
                {data.pharmacyState || "-"}
              </div>
              <div>
                <span className="font-medium text-gray-900">Pincode: </span>
                {data.pharmacyPincode || "-"}
              </div>
              <div>
                <span className="font-medium text-gray-900">Phone: </span>
                {data.pharmacyPhone || "-"}
              </div>
              <div>
                <span className="font-medium text-gray-900">Email: </span>
                {data.pharmacyEmail || "-"}
              </div>
            </div>
          </section>

          {/* Section: Organization Details */}
          <section>
            <h3 className="text-lg font-semibold text-gray-800 mb-3">
              Organization Details
            </h3>
            <div className="grid grid-cols-2 gap-4 text-sm text-gray-600">
              <div>
                <span className="font-medium text-gray-900">Name: </span>
                {data.organizationName || "-"}
              </div>
              <div>
                <span className="font-medium text-gray-900">Type: </span>
                {data.organizationType || "-"}
              </div>
              <div>
                <span className="font-medium text-gray-900">Ownership: </span>
                {data.ownershipType || "-"}
              </div>
              <div>
                <span className="font-medium text-gray-900">PAN Number: </span>
                {data.panNumber || "-"}
              </div>
              <div>
                <span className="font-medium text-gray-900">GST Number: </span>
                {data.gstNumber || "-"}
              </div>
            </div>
          </section>

          {/* Section: Documents */}
          {data.pharmacyRegistrationDocuments && data.pharmacyRegistrationDocuments.length > 0 && (
            <section>
              <h3 className="text-lg font-semibold text-gray-800 mb-3">
                Uploaded Documents
              </h3>
              <div className="flex flex-col gap-3">
                {data.pharmacyRegistrationDocuments.map((doc: any, index: number) => (
                  <div key={index} className="flex flex-col border border-gray-200 rounded-lg p-3 bg-gray-50">
                    <div className="flex justify-between items-center">
                      <span className="font-medium text-gray-900 text-sm">
                        {doc.documentType}
                      </span>
                      {doc.verified ? (
                        <span className="text-xs font-semibold text-green-700 bg-green-100 px-2 py-1 rounded-full">
                          Verified
                        </span>
                      ) : (
                        <span className="text-xs font-semibold text-yellow-700 bg-yellow-100 px-2 py-1 rounded-full">
                          Pending Verification
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-gray-500 mt-1">
                      Doc No: {doc.documentNumber} • Authority: {doc.issueAuthority}
                    </div>
                    {doc.documentUrl && (
                      <a 
                        href={doc.documentUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-blue-600 mt-2 hover:underline"
                      >
                        View Document ↗
                      </a>
                    )}
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Section: Review History */}
          {data.pharmacyStatusReviews && data.pharmacyStatusReviews.length > 0 && (
            <section>
              <h3 className="text-lg font-semibold text-gray-800 mb-3">
                Status History
              </h3>
              <div className="relative border-l border-gray-200 ml-3 space-y-6">
                {data.pharmacyStatusReviews.map((review: any, index: number) => {
                  const date = new Date(review.statusDate).toLocaleString('en-GB', {
                    day: '2-digit', month: 'short', year: 'numeric',
                    hour: '2-digit', minute: '2-digit'
                  });
                  return (
                    <div key={index} className="ml-6 relative">
                      <div className="absolute -left-[31px] top-1 h-3 w-3 rounded-full bg-blue-500 ring-4 ring-white" />
                      <div className="flex flex-col">
                        <span className="text-sm font-bold text-gray-900">
                          {review.status}
                        </span>
                        <span className="text-xs text-gray-400 mt-0.5">
                          {date}
                        </span>
                        <span className="text-sm text-gray-600 mt-1">
                          {review.remark || "No remark provided"}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          )}

        </div>
      </div>
    </div>
  );
}
