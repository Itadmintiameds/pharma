import { useState } from "react";
import Image from "next/image";

type Props = {
  onFileSelect: (file: File | null) => void;
  existingFile?: string;
  label?: string;
  placeholder?: string;
  accept?: string;
  hasError?: boolean;
};

export default function UploadInput({
  onFileSelect,
  existingFile,
  label = "Upload Drug Licence Number",
  placeholder = "Upload the File",
  accept = "application/pdf",
  hasError = false,
}: Props) {
  const [file, setFile] = useState<File | null>(null);
  const [removedExisting, setRemovedExisting] = useState(false);
  const [error, setError] = useState("");

  const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    setError("");

    if (
      accept === "application/pdf" &&
      selectedFile.type !== "application/pdf"
    ) {
      alert("Only PDF allowed");
      return;
    }

    if (selectedFile.size > MAX_FILE_SIZE) {
      setError("File size should not exceed 5MB");
      return;
    }

    setFile(selectedFile);
    setRemovedExisting(false);
    onFileSelect(selectedFile);
  };

  const removeFile = () => {
    setFile(null);
    setRemovedExisting(true);
    setError("");
    onFileSelect(null);
  };

  return (
    <div className="flex flex-col gap-1">
      {label && (
        <label className="text-label-l4 font-medium text-pneutral-900 font-heading">
          {label}
        </label>
      )}

      <label className="cursor-pointer">
        <div
          className={`flex items-center w-full h-13 rounded-lg border bg-white overflow-hidden ${hasError ? "border-2 border-red-500" : "border-pneutral-300"}`}
        >
          <div className="flex items-center justify-center h-full px-4 bg-secondary-700 rounded-md">
           <Image
                src="/PharmacyDetails/UploadIcon.svg"
                alt="Upload File"
                width={20}
                height={20}
              />
          </div>

          <div className="flex-1 flex items-center gap-2 px-4 overflow-hidden">
            {file || (existingFile && !removedExisting) ? (
              <div className="flex items-center bg-sneutral-800 text-white text-p2 px-3 py-2 rounded-lg max-w-full">
                <span className="truncate">
                  {file ? file.name : existingFile?.split("/").pop()}
                </span>
                <button onClick={removeFile} className="ml-2">
                  ✕
                </button>
              </div>
            ) : (
              <span className="text-[#969793]">{placeholder}</span>
            )}
          </div>

          {!file && (!existingFile || removedExisting) && (
            <label className="cursor-pointer px-4">
              <Image
                src="/PharmacyDetails/UploadIcon.svg"
                alt="Upload File"
                width={20}
                height={20}
              />
              <input
                type="file"
                accept={accept}
                className="hidden"
                onChange={handleFileChange}
              />
            </label>
          )}
        </div>
      </label>

      {error && <p className="text-sm text-red-500 mt-1">{error}</p>}
    </div>
  );
}
