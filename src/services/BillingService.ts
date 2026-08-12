import api from '@/utils/api';
import { handleApiError } from '@/utils/errorHandler';
import {
  BillLine,
  BillingRecord,
  CreateBillingPayload,
  CustomerInfo,
  PaymentDetails,
  SettlePaymentPayload,
} from '@/types/BillingData';
import {
  billDiscountBothWays,
  lineBreakdown,
  type DiscountType,
} from '@/utils/billingTotals';

/** Amounts go over the wire at two decimals. */
const money = (value: number) => Number((value || 0).toFixed(2));

interface BuildPayloadArgs {
  customer: CustomerInfo;
  lines: BillLine[];
  payment: PaymentDetails;
  /** The bill level discount as entered on the billing screen. */
  billDiscountValue: number;
  discountType: DiscountType;
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
  // An amount is converted against the cart's MRP total, then every line
  // carries that same percentage on top of its own discount.
  const cartMrpTotal = lines.reduce(
    (sum, line) => sum + line.quantity * (line.mrpPerUnit ?? 0),
    0
  );
  const billDiscount = billDiscountBothWays(
    cartMrpTotal,
    billDiscountValue,
    discountType
  );

  const billingDetails = lines.map((line) => {
    const row = lineBreakdown(line, billDiscount.percentage);

    // (MRP x qty) - discount, which is what the customer pays, and the GST
    // extracted from inside it — never added to it.
    const netAmount = money(row.netAmount);
    const gstAmount = money(row.gstAmount);

    return {
      productId: line.productId,
      batchId: line.batchId,
      unit: String(line.unit || ''),
      billQuantity: line.quantity,
      // grossAmount carries the *taxable* value, not MRP x qty: MRP is
      // tax-inclusive, so the pre-tax figure is what is worth storing. It is
      // derived from the two rounded figures rather than rounded on its own —
      // rounding all three independently left gross + gst a paisa off net.
      grossAmount: money(netAmount - gstAmount),
      discountPercentage: money(row.discountPercentage),
      discountAmount: money(row.discountAmount),
      gstAmount,
      netAmount,
    };
  });

  // Every total is a straight sum of the lines, so the header always reconciles
  // with the rows it was built from.
  const totalGrossAmount = billingDetails.reduce((sum, d) => sum + d.grossAmount, 0);
  const totalGstAmount = billingDetails.reduce((sum, d) => sum + d.gstAmount, 0);
  const totalDiscountAmount = billingDetails.reduce(
    (sum, d) => sum + d.discountAmount,
    0
  );
  // Taxable + GST. Identical to the sum of the line nets, by construction.
  const totalNetAmount = totalGrossAmount + totalGstAmount;
  // The discount as a share of what it was actually taken off: the MRP total.
  const totalDiscountPercentage =
    cartMrpTotal > 0 ? (totalDiscountAmount / cartMrpTotal) * 100 : 0;
  const pendingAmount = Math.max(0, totalNetAmount - (payment.amountReceived || 0));

  return {
    // An existing customer is referenced by id alone; a new one is created from
    // the name and phone the counter typed. `patientNumber` only travels when
    // it isn't already on the record — the billing screen clears it otherwise.
    ...(customer.customerId
      ? { customerId: customer.customerId }
      : {
          customerName: customer.customerName,
          customerPhoneNo: customer.mobileNo,
        }),
    ...(customer.patientNumber ? { patientNumber: customer.patientNumber } : {}),
    ...(customer.visitNumber ? { opIpNumber: customer.visitNumber } : {}),
    customerType: (customer.customerType || 'WALK_IN') as CreateBillingPayload['customerType'],
    ...(customer.doctorId ? { doctorId: customer.doctorId } : {}),
    ...(customer.address ? { customerAddress: customer.address } : {}),
    // PAID when nothing is owed, UNPAID when nothing was handed over, and
    // PARTIAL in between.
    paymentType:
      pendingAmount <= 0
        ? 'PAID'
        : (payment.amountReceived || 0) > 0
          ? 'PARTIAL'
          : 'UNPAID',

    totalGrossAmount: money(totalGrossAmount),
    totalDiscountPercentage: money(totalDiscountPercentage),
    totalDiscountAmount: money(totalDiscountAmount),
    totalGstAmount: money(totalGstAmount),
    totalNetAmount: money(totalNetAmount),

    billingDetails,
    billingPayments: [
      {
        paymentMode: payment.paymentMode,
        // Cash has no reference of its own.
        transactionId: payment.referenceNo || null,
        receivedAmount: money(payment.amountReceived),
        pendingAmount: money(pendingAmount),
      },
    ],
  };
};

/** Prescriptions are capped at 5 MB. */
export const PRESCRIPTION_MAX_BYTES = 5 * 1024 * 1024;

/**
 * Attaches the prescription to a saved bill. Multipart, one field named `file`.
 */
export const uploadPrescription = async (
  billingId: number | string,
  file: File
): Promise<{ billingId: number; prescriptionUrl: string }> => {
  if (file.size > PRESCRIPTION_MAX_BYTES) {
    throw new Error('Prescription must be 5 MB or smaller.');
  }

  const form = new FormData();
  form.append('file', file);

  try {
    // Let the browser set the multipart boundary.
    const response = await api.post(`/billing/${billingId}/prescription`, form, {
      headers: { 'Content-Type': undefined },
    });
    return response.data;
  } catch (error) {
    throw handleApiError(error, 'Failed to upload the prescription.');
  }
};

/** Settles what is still owed on a saved bill. */
export const settleBillingPayment = async (
  billingId: number | string,
  payload: SettlePaymentPayload
) => {
  try {
    const response = await api.post(`/billing/${billingId}/payment`, payload);
    return response.data;
  } catch (error) {
    throw handleApiError(error, 'Failed to record the payment.');
  }
};

export const createBilling = async (payload: CreateBillingPayload) => {
  try {
    const response = await api.post('/billing/create', payload);
    return response.data;
  } catch (error) {
    throw handleApiError(error, 'Failed to create the bill.');
  }
};

/** Every bill for the selected pharmacy (X-Pharmacy-Id header). */
export const getAllBillings = async (): Promise<BillingRecord[]> => {
  try {
    const response = await api.get('/billing/allBilling');
    return response.data ?? [];
  } catch (error) {
    throw handleApiError(error, 'Failed to fetch bills.');
  }
};

/** One bill with its lines and payments. */
export const getBillingById = async (
  billingId: number | string
): Promise<BillingRecord> => {
  try {
    const response = await api.get(`/billing/${billingId}`);
    return response.data;
  } catch (error) {
    throw handleApiError(error, 'Failed to fetch the bill.');
  }
};
