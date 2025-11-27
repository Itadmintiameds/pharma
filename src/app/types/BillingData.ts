export interface BillingItemData {
    billItemId: string;
    itemId: string;
    itemName: string;
    batchNo: string;
    expiryDate: Date | null;
    packageQuantity: number;
    availableQuantity: number;
    discountPercentage: number;
    discountAmount: number;
    mrpSalePricePerUnit: number;
    gstPercentage: number;
    gstAmount: number;
    netTotal: number;
    grossTotal: number;  

  }
  
  export interface BillingData {
    billId: string;
    billId1?: string;
    pharmacyId: string;
    billDateTime: Date;
    patientId: string;
    patientId1?: string;
    patientName?: string;
    patientAddress?: string;
    patientCity?: string;
  gender?: string;
    doctorId: string;
    doctorName?: string;
    patientType:string;
    subTotal: number;
    totalGst: number;
    totalDiscount: number;
    grandTotal: number;
    paymentStatus:string;
    paymentType:string; 
    receivedAmount:number;
    balanceAmount:number;
    upi:number;
    cash:number;
    phone?:number;
    
    billItemDtos: BillingItemData[]; 
  }