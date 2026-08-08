import api from '@/utils/api';
import { handleApiError } from '@/utils/errorHandler';
import {
  BillLine,
  CreateBillingPayload,
  CustomerInfo,
  PaymentDetails,
} from '@/types/BillingData';
import { billDiscountAsPercentage, lineBreakdown } from '@/utils/billingTotals';

/** Amounts go over the wire at two decimals. */
const money = (value: number) => Number((value || 0).toFixed(2));

interface BuildPayloadArgs {
  customer: CustomerInfo;
  lines: BillLine[];
  payment: PaymentDetails;
  /** The bill level discount as entered on the billing screen. */
  billDiscountValue: number;
  discountType: 'PERCENTAGE' | 'AMOUNT';
}

/**
 * Shapes the cart for billing/create. The bill level discount is spread across
 * the lines first, so every line carries its own share and the totals are just
 * the sum of the lines.
 */
export const buildBillingPayload = ({
  customer,
  lines,
  payment,
  billDiscountValue,
  discountType,
}: BuildPayloadArgs): CreateBillingPayload => {
  const extraDiscount = billDiscountAsPercentage(
    lines,
    billDiscountValue,
    discountType
  );

  const billingDetails = lines.map((line) => {
    const row = lineBreakdown(line, extraDiscount);
    return {
      productId: line.productId,
      batchId: line.batchId,
      unit: String(line.unit || ''),
      billQuantity: line.quantity,
      grossAmount: money(row.grossAmount),
      discountPercentage: money(row.discountPercentage),
      discountAmount: money(row.discountAmount),
      gstAmount: money(row.gstAmount),
      netAmount: money(row.netAmount),
    };
  });

  const totalGrossAmount = billingDetails.reduce((sum, d) => sum + d.grossAmount, 0);
  const totalDiscountAmount = billingDetails.reduce((sum, d) => sum + d.discountAmount, 0);
  const totalGstAmount = billingDetails.reduce((sum, d) => sum + d.gstAmount, 0);
  const totalNetAmount = billingDetails.reduce((sum, d) => sum + d.netAmount, 0);

  return {
    // An existing customer is referenced by id; a new one is created from the
    // name and phone the counter typed.
    ...(customer.customerId
      ? { customerId: customer.customerId }
      : {
          customerName: customer.customerName,
          customerPhoneNo: customer.mobileNo,
        }),
    customerType: (customer.customerType || 'WALK_IN') as CreateBillingPayload['customerType'],
    ...(customer.doctorId ? { doctorId: customer.doctorId } : {}),
    ...(customer.address ? { customerAddress: customer.address } : {}),

    totalGrossAmount: money(totalGrossAmount),
    totalDiscountPercentage: money(
      totalGrossAmount > 0 ? (totalDiscountAmount / totalGrossAmount) * 100 : 0
    ),
    totalDiscountAmount: money(totalDiscountAmount),
    totalGstAmount: money(totalGstAmount),
    totalNetAmount: money(totalNetAmount),

    billingDetails,
    billingPayments: [
      {
        paymentMode: payment.paymentMode,
        transactionId: payment.referenceNo || '',
        receivedAmount: money(payment.amountReceived),
        paymentType: payment.paymentMode === 'CREDIT' ? 'PENDING' : 'PAID',
      },
    ],
  };
};

export const createBilling = async (payload: CreateBillingPayload) => {
  try {
    const response = await api.post('/billing/create', payload);
    return response.data;
  } catch (error) {
    throw handleApiError(error, 'Failed to create the bill.');
  }
};
