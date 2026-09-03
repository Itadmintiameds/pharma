import { useRef, useState } from "react";
import Image from "next/image";

type Props = {
  onFileSelect: (file: File | null) => void;
  existingFile?: string;
  label?: string;
  placeholder?: string;
  accept?: string;
  hasError?: boolean;
  required?: boolean;
};

export default function UploadInput({
  onFileSelect,
  existingFile,
  label = "Upload Document",
  placeholder = "Upload the File",
  accept = "application/pdf",
  hasError = false,
  required = false,
}: Props) {
  const [file, setFile] = useState<File | null>(null);
  const [removedExisting, setRemovedExisting] = useState(false);
  const [error, setError] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

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
    // The input outlives the removal now (it used to be unmounted along with
    // the picker), and a file input fires no change event when the same file is
    // chosen again — so re-attaching the one just removed would do nothing.
    if (fileInputRef.current) fileInputRef.current.value = "";
    onFileSelect(null);
  };

  const hasFile = !!file || (!!existingFile && !removedExisting);

  const openPicker = () => fileInputRef.current?.click();

  return (
    <div className="flex flex-col gap-1">
      {label && (
        <label className="text-label-l4 font-medium text-pneutral-900 font-heading">
          {label} {required && <span className="text-warning-500">*</span>}
        </label>
      )}

      {/*
        The whole field is the control, the way an Input's is: one focus stop
        that Tab lands on, showing the focus ring around the entire field, and
        one click target the full width of it. It used to be a <label> — which
        is not a focus stop at all, so Tab skipped the field outright — with the
        only affordance a small icon at the right end.

        Once a file is attached the field stops being a picker: the only action
        left is the ✕ on the chip, which is then the tab stop. Same as before —
        a second file has to replace the first through Remove.
      */}
      <div
        role={hasFile ? undefined : "button"}
        tabIndex={hasFile ? undefined : 0}
        aria-label={hasFile ? undefined : `${label}: ${placeholder}`}
        onClick={hasFile ? undefined : openPicker}
        onKeyDown={(e) => {
          if (hasFile) return;
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            openPicker();
          }
        }}
        className={`flex items-center w-full h-13 rounded-lg border bg-white overflow-hidden transition-all ${
          hasError ? "border-2 border-red-500" : "border-pneutral-300"
        } ${
          hasFile
            ? ""
            : "cursor-pointer focus:outline-none focus:border-secondary-300 focus:ring-1 focus:ring-secondary-300"
        }`}
      >
        <div className="flex items-center justify-center h-full px-4 bg-secondary-700 rounded-md">
          <Image
            src="/PharmacyDetails/UploadIcon.svg"
            alt=""
            width={20}
            height={20}
          />
        </div>

        <div className="flex-1 flex items-center gap-2 px-4 overflow-hidden">
          {hasFile ? (
            <div className="flex items-center bg-sneutral-800 text-white text-p2 px-3 py-2 rounded-lg max-w-full">
              <span className="truncate">
                {file ? file.name : existingFile?.split("/").pop()}
              </span>
              {/* type="button", or inside a form this would submit it. */}
              <button
                type="button"
                aria-label={`Remove ${label}`}
                onClick={removeFile}
                className="ml-2"
              >
                ✕
              </button>
            </div>
          ) : (
            <span className="text-[#969793]">{placeholder}</span>
          )}
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept={accept}
          className="hidden"
          onChange={handleFileChange}
        />
      </div>

      {error && <p className="text-sm text-red-500 mt-1">{error}</p>}
    </div>
  );
}
