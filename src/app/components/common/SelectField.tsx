import React from "react";
import AsyncSelect from "react-select/async";
import {
  FormatOptionLabelMeta,
  InputActionMeta,
  StylesConfig,
} from "react-select";

type OptionType = {
  label: string;
  value: string;
  firstName?: string;
  lastName?: string;
  phone?: number;
  patientName?: string;
};

interface SelectFieldProps {
  value: OptionType | null;
  onChange: (value: OptionType | null) => void;
  label: React.ReactNode;
  loadOptions: (
    inputValue: string,
    callback: (options: OptionType[]) => void
  ) => void;
  isClearable?: boolean;
  isDisabled?: boolean;
  defaultOptions?: OptionType[];
  formatOptionLabel?: (
    data: OptionType,
    context: FormatOptionLabelMeta<OptionType>
  ) => React.ReactNode;
  inputValue?: string;
  onInputChange?: (value: string, actionMeta: InputActionMeta) => void;
  // onAddNew?: () => void;
}

const customStyles: StylesConfig<OptionType, false> = {
  control: (base, state) => ({
    ...base,
    height: "49px",
    padding: "0.375rem 0.75rem",
    borderRadius: "0.5rem",
    borderColor: state.isFocused ? "#6B21A8" : "#B5B3B3",
    boxShadow: state.isFocused ? "#6B21A8" : "none",
    backgroundColor: "transparent",
    "&:hover": {
      borderColor: "#4B0082",
    },
  }),
  menu: (base) => ({
    ...base,
    overflowX: "hidden",
  }),
  menuList: (base) => ({
    ...base,
    overflowX: "hidden",
  }),
  placeholder: (base) => ({
    ...base,
    color: "#6B7280",
    fontSize: "0.875rem",
  }),
  input: (base) => ({
    ...base,
    color: "#000",
  }),
  singleValue: (base) => ({
    ...base,
    color: "#000",
  }),
  option: (base, state) => ({
    ...base,
    backgroundColor: state.isSelected || state.isFocused ? "#4B0082" : "#fff",
    color: state.isSelected || state.isFocused ? "#fff" : "#000",
    cursor: "pointer",
    borderRadius: "0.5rem",
    margin: "2px",
    ":active": {
      backgroundColor: "#4B0082",
      color: "#fff",
    },
  }),

  menuPortal: (base) => ({
    ...base,
    zIndex: 9999,
  }),
};

const SelectField: React.FC<SelectFieldProps> = ({
  value,
  onChange,
  label,
  loadOptions,
  isClearable = true,
  isDisabled = false,
  defaultOptions,
  formatOptionLabel,
  inputValue,
  onInputChange,
  // onAddNew,
}) => {
  const hasValue = Boolean(value) || Boolean(inputValue);

  return (
    <div className="relative w-full">
      <AsyncSelect
        cacheOptions
        loadOptions={loadOptions}
        defaultOptions={defaultOptions || []}
        value={value}
        onChange={onChange}
        inputValue={inputValue}
        onInputChange={onInputChange}
        isClearable={isClearable}
        isDisabled={isDisabled}
        placeholder=" "
        styles={customStyles}
        className="w-full peer"
        getOptionLabel={(e) => e.label}
        formatOptionLabel={formatOptionLabel ?? ((data) => data.label)}
        menuPortalTarget={document.body}
        menuPosition="fixed"
        // noOptionsMessage={() => (
        //   <div
        //     className="px-3 py-2 cursor-pointer text-sm text-white bg-[#4B0082] rounded-md mx-1 hover:bg-[#3a006b] transition-colors"
        //     onMouseDown={(e) => {
        //       e.preventDefault();
        //       onAddNew?.();
        //     }}
        //   >
        //     + Add New Patient
        //   </div>
        // )}
      />
      <label
        className={`absolute left-3 top-0 -translate-y-1/2 bg-white px-1 text-gray-500 text-xs transition-all
          ${
            hasValue
              ? "top-0 -translate-y-1/2 text-xs px-1 text-purple-950"
              : "peer-placeholder-shown:top-1/2 peer-placeholder-shown:-translate-y-1/2 peer-placeholder-shown:text-xs"
          }
        `}
      >
        {label}
      </label>
    </div>
  );
};

export default SelectField;
