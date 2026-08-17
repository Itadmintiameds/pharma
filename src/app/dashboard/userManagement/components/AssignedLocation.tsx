import React from "react";
import { UserWarehouse, warehouseLabel } from "@/types/UserData";

interface AssignedLocationProps {
  pharmacyCities: string[];
  warehouses?: UserWarehouse[];
}

const AssignedLocation = ({
  pharmacyCities,
  warehouses,
}: AssignedLocationProps) => {
  // A user is mapped either to warehouses (a Warehouse Manager) or to
  // pharmacies, so whichever list has entries is the one worth naming.
  const hasWarehouses = (warehouses?.length ?? 0) > 0;

  return (
    <div className="flex flex-col gap-2 text-pneutral-900">
      <div className="text-p5 font-semibold font-noto-sans">
        {hasWarehouses ? "Assigned Warehouses" : "Assigned Location"}
      </div>

      <div className="flex flex-wrap gap-2">
        {hasWarehouses ? (
          warehouses!.map((warehouse) => (
            <div
              key={warehouse.warehouseId}
              className="inline-flex w-fit items-center justify-center px-4 h-8 bg-pneutral-300 rounded-full text-p4 font-medium font-noto-sans"
            >
              {warehouseLabel(warehouse)}
            </div>
          ))
        ) : pharmacyCities.length > 0 ? (
          pharmacyCities.map((city, index) => (
            <div
              key={`${city}-${index}`}
              className="inline-flex w-fit items-center justify-center px-4 h-8 bg-pneutral-300 rounded-full text-p4 font-medium font-noto-sans"
            >
              {city}
            </div>
          ))
        ) : (
          <div className="text-p4 text-pneutral-500">
            No Assigned Locations
          </div>
        )}
      </div>
    </div>
  );
};

export default AssignedLocation;
