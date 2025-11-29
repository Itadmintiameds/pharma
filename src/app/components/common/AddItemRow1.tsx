import React from "react";
import Button from "./Button";
import { Plus } from "lucide-react";

interface AddItemRowProps {
  onClick?: (event: React.MouseEvent<HTMLButtonElement>) => void;
  label?: string;
  className?: string;
  disabled?: boolean;
  title?: string;
}

const AddItemRow1: React.FC<AddItemRowProps> = ({
  onClick,
  label = "Add Item",
  className = "",
  disabled = false,
  title = "Add new item",
}) => {
  return (
    <Button
      type="button"
      onClick={onClick}
      label={label}
      className={`w-36 bg-gray ${className}`}
      icon={<Plus size={15} />}
      disabled={disabled}
      title={title}
    />
  );
};

export default AddItemRow1;