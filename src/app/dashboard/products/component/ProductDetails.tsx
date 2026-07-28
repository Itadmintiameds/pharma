import React, { forwardRef } from 'react';
import DrugProductDetails, { ProductDetailsRef } from './categories/DrugProductDetails';
import SupplementProductDetails from './categories/SupplementProductDetails';
import FoodInfantProductDetails from './categories/FoodInfantProductDetails';
import CosmeticProductDetails from './categories/CosmeticProductDetails';
import ConsumableProductDetails from './categories/ConsumableProductDetails';
import NonConsumableProductDetails from './categories/NonConsumableProductDetails';

interface ProductDetailsProps {
  categoryId?: number;
}

const ProductDetails = forwardRef<ProductDetailsRef, ProductDetailsProps>(({ categoryId = 1 }, ref) => {
  const renderCategoryContent = () => {
    switch (categoryId) {
      case 1:
        return <DrugProductDetails ref={ref} />;
      case 2:
        return <SupplementProductDetails ref={ref} />;
      case 3:
        return <FoodInfantProductDetails ref={ref} />;
      case 4:
        return <CosmeticProductDetails ref={ref} />;
      case 5:
        return <ConsumableProductDetails ref={ref} />;
      case 6:
        return <NonConsumableProductDetails ref={ref} />;
      default:
        return <DrugProductDetails ref={ref} />;
    }
  };

  return (
    <div className="flex h-full min-h-0 w-full flex-col gap-sm">
      <div className="flex min-h-0 w-full flex-1 flex-col">
        <div className="flex w-full flex-1 flex-col gap-xlg overflow-y-auto rounded-[12px] border border-pneutral-100 bg-white p-[14px] shadow-sm">
          <h3 className="shrink-0 text-h6 font-semibold text-pneutral-900">
            Product Details
          </h3>

          <div className="grid grid-cols-2 items-start gap-x-xlg gap-y-sm">
            {renderCategoryContent()}
          </div>
        </div>
      </div>
    </div>
  );
});

ProductDetails.displayName = 'ProductDetails';
export default ProductDetails;