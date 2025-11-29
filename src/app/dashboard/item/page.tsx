"use client";

import Button from "@/app/components/common/Button";
import Drawer from "@/app/components/common/Drawer";
import Input from "@/app/components/common/Input";
import PaginationTable from "@/app/components/common/PaginationTable";
import Loader from "@/app/components/common/Loader";
import { ItemData } from "@/app/types/ItemData";
import { Plus, Search, Upload, X } from "lucide-react";
import React, { useEffect, useState, useRef, useCallback } from "react";
import AddItem from "./components/AddItem";
import { getItem, uploadItemsCsv } from "@/app/services/ItemService";
import { getVariantById } from "@/app/services/VariantService";
import { BsThreeDotsVertical } from "react-icons/bs";
import { FaCloudUploadAlt } from "react-icons/fa";
import { toast } from "react-toastify";

// Interface for validation errors from CSV upload
interface ValidationError {
  row?: number;
  column?: string;
  message: string;
}

// Type for action modes (edit or delete)
type Action = "edit" | "delete";

const Page = () => {
  // State management for various component states
  const [searchText, setSearchText] = useState<string>("");
  const [itemData, setItemData] = useState<ItemData[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [uploadLoading, setUploadLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [showItem, setShowItem] = useState(false);
  const [, setShowDrawer] = useState<boolean>(false);
  const [currentItemId, setCurrentItemId] = useState<string | null>(null);
  const [action, setAction] = useState<Action | undefined>(undefined);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [validationErrors, setValidationErrors] = useState<ValidationError[]>(
    []
  );
  const [isDragging, setIsDragging] = useState(false);
  const [showLoader, setShowLoader] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dropAreaRef = useRef<HTMLDivElement>(null);

  // Handle CSV file upload with minimum loading time
  const handleFileUpload = useCallback(
    async (file: File) => {
      setUploadLoading(true);
      setShowLoader(true);

      const startTime = Date.now();
      const MIN_LOADING_TIME = 5000; // 5 seconds

      try {
        const response = await uploadItemsCsv(file);

        // Calculate remaining time to ensure minimum 5 seconds loading
        const elapsedTime = Date.now() - startTime;
        const remainingTime = Math.max(0, MIN_LOADING_TIME - elapsedTime);

        if (remainingTime > 0) {
          await new Promise((resolve) => setTimeout(resolve, remainingTime));
        }

        toast.success(response.message || "CSV file uploaded successfully!", {
          autoClose: 3000,
        });

        setShowUploadModal(false);
        setValidationErrors([]);

        setTimeout(() => {
          fetchItemsWithVariants();
        }, 2000);
      } catch (error: unknown) {
        console.error("Upload error:", error);

        const elapsedTime = Date.now() - startTime;
        const remainingTime = Math.max(0, MIN_LOADING_TIME - elapsedTime);

        if (remainingTime > 0) {
          await new Promise((resolve) => setTimeout(resolve, remainingTime));
        }

        if (error instanceof Error) {
          try {
            const errorData = JSON.parse(error.message);
            if (
              errorData.validationErrors &&
              Array.isArray(errorData.validationErrors)
            ) {
              const parsedErrors: ValidationError[] =
                errorData.validationErrors.map((err: string) => {
                  const rowMatch = err.match(/Row (\d+)/);
                  const columnMatch = err.match(/Column '([^']+)'/);
                  const messageMatch = err.match(/: (.+)$/);

                  return {
                    row: rowMatch ? parseInt(rowMatch[1]) : undefined,
                    column: columnMatch ? columnMatch[1] : undefined,
                    message: messageMatch ? messageMatch[1] : err,
                  };
                });

              setValidationErrors(parsedErrors);
            } else {
              toast.error(
                errorData.message ||
                  "An error occurred while uploading the file."
              );
            }
          } catch {
            toast.error(
              error.message || "An error occurred while uploading the file."
            );
          }
        } else {
          toast.error("An unknown error occurred while uploading the file.");
        }
      } finally {
        setUploadLoading(false);
        setShowLoader(false);

        if (fileInputRef.current && validationErrors.length === 0) {
          fileInputRef.current.value = "";
        }
      }
    },
    [validationErrors.length]
  );

  // Handle file selection with validation
  const handleFileSelect = useCallback(
    (file: File) => {
      if (
        file.type === "text/csv" ||
        file.name.toLowerCase().endsWith(".csv")
      ) {
        handleFileUpload(file);
      } else {
        toast.error("Please upload a valid CSV file");

        if (fileInputRef.current) {
          fileInputRef.current.value = "";
        }
      }
    },
    [handleFileUpload]
  );

  // Drag and drop event handlers
  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.dataTransfer.files) {
      setIsDragging(true);
    }
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);

      const files = e.dataTransfer.files;
      if (files.length > 0) {
        const file = files[0];
        handleFileSelect(file);
      }
    },
    [handleFileSelect]
  );

  // Download CSV template with required headers
  const downloadCSVTemplate = () => {
    const headers = [
      "item_name",
      "generic_name",
      "gst_percentage",
      "hsn_no",
      "manufacturer",
      "mrp_sale_price",
      "mrp_sale_price_per_unit",
      "purchase_price",
      "purchase_price_per_unit",
      "purchase_unit",
      "unit_name",
      "variant_name",
    ];

    const csvContent = "data:text/csv;charset=utf-8," + headers.join(",");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "pharma_items_template.csv");
    document.body.appendChild(link);

    link.click();
    document.body.removeChild(link);

    toast.info(
      <div>
        <p>Template downloaded with required columns:</p>
        <ul className="list-disc pl-5 mt-2 text-sm">
          <li>All fields are required</li>
          <li>
            Numeric fields must contain only numbers (gst_percentage, prices,
            purchase_unit)
          </li>
          <li>Do not modify the column names</li>
        </ul>
      </div>,
      { autoClose: 5000 }
    );
  };

  // Toggle action menu for individual items
  const toggleMenu = (orderId?: string) => {
    setOpenMenuId((prev) => (prev === orderId ? null : orderId || null));
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

  // Table columns configuration
  const columns = [
    {
      header: "Item Name",
      accessor: "itemName" as keyof ItemData,
    },
    {
      header: "HSN No.",
      accessor: "hsnNo" as keyof ItemData,
    },
    {
      header: "Variant Name",
      accessor: "variantName" as keyof ItemData,
    },
    {
      header: "Unit Name",
      accessor: "unitName" as keyof ItemData,
    },
    {
      header: "Purchase Price",
      accessor: "purchasePrice" as keyof ItemData,
    },
    {
      header: "MRP",
      accessor: "mrpSalePrice" as keyof ItemData,
    },
    {
      header: "Action",
      accessor: (row: ItemData) => (
        <div className="relative menu-container">
          <button
            className="p-2 rounded-full hover:bg-gray-200 cursor-pointer"
            onClick={() => toggleMenu(row.itemId)}
          >
            <BsThreeDotsVertical size={18} />
          </button>

          {openMenuId === row.itemId && (
            <div className="absolute right-0 mt-2 w-full bg-white shadow-xl rounded-lg z-10">
              <button
                onClick={() => {
                  if (row.itemId) {
                    handleSupplierDrawer(row.itemId, "edit");
                  }
                  setOpenMenuId(null);
                }}
                className="block w-full px-4 py-2 text-left text-gray-700 cursor-pointer hover:bg-purple-950 hover:text-white hover:rounded-lg"
              >
                Edit
              </button>
            </div>
          )}
        </div>
      ),
    },
  ];

  // Filter data based on search text
  const filteredData = itemData.filter((item) => {
    const search = searchText.toLowerCase();

    return (
      item.itemName?.toLowerCase().includes(search) ||
      item.manufacturer?.toLowerCase().includes(search) ||
      item.variantName?.toLowerCase().includes(search) ||
      item.unitName?.toLowerCase().includes(search)
    );
  });

  // Fetch items with their variant information
//  const fetchItemsWithVariants = async () => {
//     setLoading(true);
//     setError(null);
//     try {
//       const items = await getItem();
//       const itemsWithVariants = await Promise.all(
//         items.map(async (item: ItemData) => {
//           if (!item.variantId || !item.unitId) return item;
//           try {
//             const variantData = await getVariantById(item.variantId);
//             const matchingUnit = variantData.unitDtos?.find(
//               (unit: ItemData) => unit.unitId === item.unitId
//             );
//             return {
//               ...item,
//               variantName: variantData.variantName,
//               unitName: matchingUnit?.unitName || "N/A",
//             };
//           } catch (err) {
//             console.error("Error fetching variant for item:", item.itemId, err);
//             return item;
//           }
//         })
//       );
//       setItemData(itemsWithVariants);
//     } catch (error) {
//       console.error("Failed to fetch items:", error);
//       setError("Failed to load item data");
//     } finally {
//       setLoading(false);
//     }
//   };




const fetchItemsWithVariants = async () => {
  setLoading(true);
  setError(null);

  try {
    const items = await getItem();

    const itemsWithVariants = await Promise.all(
      items.map(async (item: ItemData) => {
        if (!item.variantId || !item.unitId) return item;

        try {
          const variantData = await getVariantById(item.variantId);

          const matchingUnit = variantData.unitDtos?.find(
            (unit) => unit.unitId === item.unitId
          );

          return {
            ...item,
            variantName: variantData.variantName,
            unitName: matchingUnit?.unitName || "N/A",
          };
        } catch (err) {
          console.error(
            "Error fetching variant for item:",
            item.itemId,
            err
          );
          return item;
        }
      })
    );

    setItemData(itemsWithVariants);
  } catch (error) {
    console.error("Failed to fetch items:", error);
    setError("Failed to load item data");
  } finally {
    setLoading(false);
  }
};

  // Fetch items on component mount
  useEffect(() => {
    fetchItemsWithVariants();
  }, []);

  // Open drawer for adding/editing items
  const handleSupplierDrawer = (itemId?: string, action?: Action) => {
    if (itemId) {
      setCurrentItemId(itemId);
    } else {
      setCurrentItemId(null);
    }

    setAction(action);
    setShowItem(true);
    setShowDrawer(true);
  };

  // Close drawer and refresh data
  const handleCloseDrawer = () => {
    setShowDrawer(false);
    setShowItem(false);
    fetchItemsWithVariants();
  };

  // Open upload modal
  const handleUploadClick = () => {
    setShowUploadModal(true);
    setValidationErrors([]);
  };

  // Handle file input change
  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  // Handle click on drop area to trigger file input
  const handleDropAreaClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      fileInputRef.current?.click();
    }
  };

  // Main component return
  return (
    <>
      {/* Drawer for adding/editing items */}
      {showItem && (
        <Drawer setShowDrawer={handleCloseDrawer} title={"Item Master"}>
          <AddItem
            setShowDrawer={handleCloseDrawer}
            itemId={currentItemId}
            action={action}
            onSuccess={fetchItemsWithVariants}
          />
        </Drawer>
      )}

      {/* Upload modal for CSV files */}
      {showUploadModal && (
        <div className="fixed inset-0 backdrop-blur flex items-center justify-center z-50">
          <div className="bg-white shadow-lg rounded-lg p-6 w-full max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
            {/* Loading state */}
            {showLoader ? (
              <div className="flex flex-col items-center justify-center py-8">
                <Loader
                  type="spinner"
                  size="md"
                  text="Uploading CSV file..."
                  fullScreen={false}
                />
                <p className="mt-4 text-sm text-gray-500">
                  Please wait while we process your file.
                </p>
              </div>
            ) : validationErrors.length > 0 ? (
              // Validation errors display
              <div className="flex flex-col h-full">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-xl font-semibold text-red-600">
                    Upload Failed
                  </h2>
                  <button
                    onClick={() => setShowUploadModal(false)}
                    className="text-gray-500 hover:text-gray-700"
                  >
                    <X size={20} />
                  </button>
                </div>
                <p className="text-gray-700 mb-4">
                  Please correct the following errors and try again:
                </p>
                <div className="overflow-y-auto flex-grow mb-4 max-h-96">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50 sticky top-0">
                      <tr>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Row
                        </th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Column
                        </th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Error
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {validationErrors.map((error, index) => (
                        <tr key={index}>
                          <td className="px-4 py-2 whitespace-nowrap">
                            {error.row || "N/A"}
                          </td>
                          <td className="px-4 py-2 whitespace-nowrap">
                            {error.column || "N/A"}
                          </td>
                          <td className="px-4 py-2">{error.message}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="flex justify-end space-x-3">
                  <button
                    className="bg-gray-200 text-gray-600 py-2 px-6 rounded-md text-sm font-medium"
                    onClick={() => {
                      setShowUploadModal(false);
                      setValidationErrors([]);
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    className="bg-darkPurple text-white py-2 px-6 rounded-md text-sm font-medium"
                    onClick={() => {
                      setValidationErrors([]);
                      if (fileInputRef.current) {
                        fileInputRef.current.value = "";
                      }
                    }}
                  >
                    Try Again
                  </button>
                </div>
              </div>
            ) : (
              // Upload interface with drag and drop
              <>
                <div className="flex justify-between items-center mb-4">
                  <h1 className="text-xl font-semibold text-gray-700">
                    Upload CSV File
                  </h1>
                  <button
                    onClick={() => setShowUploadModal(false)}
                    className="text-gray-500 hover:text-gray-700"
                  >
                    <X size={20} />
                  </button>
                </div>
                <div className="flex justify-between text-gray-500 text-sm mb-6">
                  <p className=" text-sm mb-6 ">
                    Supported Format: CSV file only
                  </p>
                  <p className=" text-sm mb-6">Max size: 5 MB</p>
                </div>

                <div
                  ref={dropAreaRef}
                  className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
                    isDragging
                      ? "border-darkPurple bg-purple-50"
                      : "border-gray-300 hover:border-darkPurple hover:bg-purple-50"
                  }`}
                  onDragEnter={handleDragEnter}
                  onDragLeave={handleDragLeave}
                  onDragOver={handleDragOver}
                  onDrop={handleDrop}
                  onClick={handleDropAreaClick}
                >
                  <FaCloudUploadAlt
                    size={48}
                    className="mx-auto text-darkPurple mb-4"
                  />
                  <p className="text-lg font-medium text-gray-700 mb-2">
                    {isDragging
                      ? "Drop your CSV file here"
                      : "Drag & Drop your CSV file here"}
                  </p>
                  <p className="text-sm text-gray-500 mb-4">or</p>

                  <label
                    htmlFor="file-upload"
                    className="inline-block bg-darkPurple text-white py-2 px-6 rounded-md text-sm font-medium cursor-pointer"
                    onClick={(e) => e.stopPropagation()} // Prevent click from bubbling to parent
                  >
                    <Upload className="inline-block mr-2" size={15} />
                    Browse Files
                    <input
                      id="file-upload"
                      type="file"
                      accept=".csv"
                      className="hidden"
                      onChange={handleFileInputChange}
                      ref={fileInputRef}
                      disabled={uploadLoading}
                    />
                  </label>
                </div>

                <div className="bg-primaryPurple border border-darkPurple rounded-md p-4 mt-6">
                  <h3 className="text-sm font-medium text-grey mb-2">
                    Important Notes:
                  </h3>
                  <ul className="text-xs text-grey list-disc pl-5">
                    <li>All fields are required</li>
                    <li>
                      Numeric fields (gst_percentage, prices, purchase_unit)
                      must contain only numbers
                    </li>
                    <li>Download the template to ensure correct format</li>
                  </ul>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Main content area */}
      <main className="space-y-10">
        <div className="flex justify-between">
          <div className="justify-start text-darkPurple text-3xl font-medium leading-10">
            Item List
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
              <div className="flex flex-col">
                <Button
                  onClick={handleUploadClick}
                  label="Upload CSV File"
                  value=""
                  className="w-52 bg-darkPurple text-white h-11"
                  icon={<Upload size={15} />}
                />
                <button
                  onClick={downloadCSVTemplate}
                  className="text-xs text-gray-500 mt-1 hover:underline text-gray-700 text-left px-6"
                >
                  Show CSV Format
                </button>
              </div>

              <Button
                onClick={() => handleSupplierDrawer()}
                label="Add New Item"
                value=""
                className="w-52 bg-darkPurple text-white h-11"
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
              text="Item List is loading ..."
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
            noDataMessage="No records found"
          />
        )}
      </main>
    </>
  );
};

export default Page;
