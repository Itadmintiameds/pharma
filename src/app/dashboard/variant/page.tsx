"use client";

import Button from "@/app/components/common/Button";
import Drawer from "@/app/components/common/Drawer";
import Input from "@/app/components/common/Input";
import PaginationTable from "@/app/components/common/PaginationTable";
import Loader from "@/app/components/common/Loader";
import { VariantData } from "@/app/types/VariantData";
import { Plus, Search} from "lucide-react";
import React, { useEffect, useState} from "react";
import AddVariant from "./components/Addvariant";
import { getVariant, deleteVariant } from "@/app/services/VariantService";
import { BsThreeDotsVertical } from "react-icons/bs";
import Modal from "@/app/components/common/Modal";
import { toast } from "react-toastify";

// Type for action modes (edit or delete)
type Action = "edit" | "delete";

const Page = () => {
  // State management for various component states
  const [searchText, setSearchText] = useState<string>("");
  const [variantData, setVariantData] = useState<VariantData[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [showVariant, setShowVariant] = useState(false);
  const [, setShowDrawer] = useState<boolean>(false);
  const [currentVariantId, setCurrentVariantId] = useState<string | null>(null);
  const [action, setAction] = useState<Action | undefined>(undefined);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [variantToDelete, setVariantToDelete] = useState<VariantData | null>(null);

  // Toggle action menu for individual variants
  const toggleMenu = (variantId?: string) => {
    setOpenMenuId((prev) => (prev === variantId ? null : variantId || null));
  };

  // Close menu when clicking outside
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

  // Table columns configuration for Variant Master
  const columns = [
    {
      header: "Variant Name",
      accessor: "variantName" as keyof VariantData,
    },
    {
      header: "Units",
      accessor: (row: VariantData) => (
        <div>
          {row.unitDtos?.map(unit => unit.unitName).join(", ") || "No units"}
        </div>
      ),
    },
    {
      header: "Action",
      accessor: (row: VariantData) => (
        <div className="relative menu-container">
          <button
            className="p-2 rounded-full hover:bg-gray-200 cursor-pointer"
            onClick={() => toggleMenu(row.variantId)}
          >
            <BsThreeDotsVertical size={18} />
          </button>

          {openMenuId === row.variantId && (
            <div className="absolute right-0 mt-2 w-full bg-white shadow-xl rounded-lg z-10">
              <button
                onClick={() => {
                  if (row.variantId) {
                    handleVariantDrawer(row.variantId, "edit");
                  }
                  setOpenMenuId(null);
                }}
                className="block w-full px-4 py-2 text-left text-gray-700 cursor-pointer hover:bg-purple-950 hover:text-white hover:rounded-lg"
              >
                Edit
              </button>
              <button
                onClick={() => {
                  if (row.variantId) {
                    handleDeleteClick(row);
                  }
                  setOpenMenuId(null);
                }}
                className="block w-full px-4 py-2 text-left text-gray-700 cursor-pointer hover:bg-purple-950 hover:text-white hover:rounded-lg"
              >
                Delete
              </button>
            </div>
          )}
        </div>
      ),
    },
  ];

  // Handle delete click - show confirmation modal
  const handleDeleteClick = (variant: VariantData) => {
    setVariantToDelete(variant);
    setShowModal(true);
  };

  // Handle delete confirmation
  const handleDeleteConfirm = async () => {
    if (!variantToDelete) return;

    try {
      await deleteVariant(variantToDelete.variantId);
      toast.success("Variant deleted successfully", { autoClose: 3000 });
      setShowModal(false);
      setVariantToDelete(null);
      fetchVariants(); // Refresh the list
    } catch (error) {
      console.error("Error deleting variant:", error);
      if (error instanceof Error) {
        toast.error(error.message || "Failed to delete variant", { autoClose: 3000 });
      } else {
        toast.error("Failed to delete variant", { autoClose: 3000 });
      }
    }
  };

  // Handle modal cancel
  const handleModalCancel = () => {
    setShowModal(false);
    setVariantToDelete(null);
  };

  // Filter data based on search text
  const filteredData = variantData.filter((variant) => {
    const search = searchText.toLowerCase();
    return (
      variant.variantName?.toLowerCase().includes(search) ||
      variant.unitDtos?.some(unit => 
        unit.unitName?.toLowerCase().includes(search)
      )
    );
  });

  // Fetch variants
  const fetchVariants = async () => {
    setLoading(true);
    setError(null);
    try {
      const variants = await getVariant();
      setVariantData(variants);
    } catch (error) {
      console.error("Failed to fetch variants:", error);
      setError("Failed to load variant data");
    } finally {
      setLoading(false);
    }
  };

  // Fetch variants on component mount
  useEffect(() => {
    fetchVariants();
  }, []);

  // Open drawer for adding/editing variants
  const handleVariantDrawer = (variantId?: string, action?: Action) => {
    if (variantId) {
      setCurrentVariantId(variantId);
    } else {
      setCurrentVariantId(null);
    }

    setAction(action);
    setShowVariant(true);
    setShowDrawer(true);
  };

  // Close drawer and refresh data
  const handleCloseDrawer = () => {
    setShowDrawer(false);
    setShowVariant(false);
    fetchVariants();
  };

  // Main component return
  return (
    <>
      {/* Delete Confirmation Modal */}
      {showModal && variantToDelete && (
        <Modal
          message= "Are you sure you want to delete it ?"
          secondaryMessage="Confirm Deletion"
          bgClassName="bg-darkPurple"
          onConfirm={handleDeleteConfirm}
          onCancel={handleModalCancel}
        />
      )}

      {/* Drawer for adding/editing variants */}
      {showVariant && (
        <Drawer setShowDrawer={handleCloseDrawer} title={"Variant Master"}>
          <AddVariant
            setShowDrawer={handleCloseDrawer}
            variantId={currentVariantId}
            action={action}
            onSuccess={fetchVariants}
          />
        </Drawer>
      )}

      {/* Main content area */}
      <main className="space-y-10">
        <div className="flex justify-between">
          <div className="justify-start text-darkPurple text-3xl font-medium leading-10">
            Variant List
          </div>

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

            <div className="flex space-x-4">
              <Button
                onClick={() => handleVariantDrawer()}
                label="Add Variant"
                value=""
                className="w-36 bg-darkPurple text-white"
                icon={<Plus size={15} />}
              />
            </div>
          </div>
        </div>

        {/* Loading, error, or data display */}
        {loading ? (
          <div className="flex justify-center items-center h-64">
            <Loader
              type="spinner"
              size="md"
              text="loading ..."
              fullScreen={false}
            />
          </div>
        ) : error ? (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
            <strong>Error!</strong> {error}
          </div>
        ) : (
          <PaginationTable
            data={filteredData}
            columns={columns}
            noDataMessage="No variants found"
          />
        )}
      </main>
    </>
  );
};

export default Page;