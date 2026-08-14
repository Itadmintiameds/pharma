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
  gstWithin,
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

    // Each figure is derived from the ones already rounded, rather than rounded
    // independently off the exact arithmetic. Rounding them all separately left
    // mrp - discount a paisa off net, and gross + gst a paisa off net again.
    const totalMrpAmountPerUnit = money(row.grossAmount);
    const discountAmount = money(row.discountAmount);
    // What the customer pays for the line.
    const netAmount = money(totalMrpAmountPerUnit - discountAmount);
    // The GST inside that net — extracted, never added to it.
    const gstAmount = money(gstWithin(netAmount, line.gstPercentage || 0));

    return {
      productId: line.productId,
      batchId: line.batchId,
      unit: String(line.unit || ''),
      billQuantity: line.quantity,
      // The line total: MRP x qty, before the discount. Named "PerUnit" by the
      // API, but it is the whole line.
      totalMrpAmountPerUnit,
      // grossAmount carries the *taxable* value, not MRP x qty: MRP is
      // tax-inclusive, so the pre-tax figure is what is worth storing.
      grossAmount: money(netAmount - gstAmount),
      discountPercentage: money(row.discountPercentage),
      discountAmount,
      gstAmount,
      netAmount,
    };
  });

  // Every total is a straight sum of the lines, so the header always reconciles
  // with the rows it was built from — and inherits their invariants:
  // totalMrpAmount - totalDiscountAmount = totalNetAmount, and
  // totalGrossAmount + totalGstAmount = totalNetAmount.
  const totalMrpAmount = billingDetails.reduce(
    (sum, d) => sum + d.totalMrpAmountPerUnit,
    0
  );
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
    totalMrpAmount > 0 ? (totalDiscountAmount / totalMrpAmount) * 100 : 0;
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

    totalMrpAmount: money(totalMrpAmount),
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
