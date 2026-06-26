const PAYSTACK_SECRET_KEY = process.env.PAYSTACK_SECRET_KEY!;
const PAYSTACK_BASE_URL = "https://api.paystack.co";

export interface PaystackInitializeParams {
  email: string;
  amount: number; // in kobo (Naira × 100)
  reference?: string;
  callback_url?: string;
  metadata?: Record<string, unknown>;
}

export interface PaystackInitializeResponse {
  status: boolean;
  message: string;
  data: {
    authorization_url: string;
    access_code: string;
    reference: string;
  };
}

export interface PaystackVerifyResponse {
  status: boolean;
  message: string;
  data: {
    status: "success" | "failed" | "abandoned";
    reference: string;
    amount: number;
    currency: string;
    metadata: Record<string, unknown>;
  };
}

export interface PaystackTransferRecipientParams {
  type?: "nuban";
  name: string;
  account_number: string;
  bank_code: string;
  currency?: "NGN";
  description?: string;
  metadata?: Record<string, unknown>;
}

export interface PaystackTransferRecipientResponse {
  status: boolean;
  message: string;
  data: {
    recipient_code: string;
    type: string;
    name: string;
    currency: string;
    details?: {
      account_number?: string;
      account_name?: string | null;
      bank_code?: string;
      bank_name?: string;
    };
  };
}

export interface PaystackBank {
  name: string;
  slug: string;
  code: string;
  longcode?: string | null;
  active: boolean;
  country: string;
  currency: string;
  type?: string | null;
}

export interface PaystackListBanksResponse {
  status: boolean;
  message: string;
  data: PaystackBank[];
}

export interface PaystackInitiateTransferParams {
  amount: number; // in kobo (Naira × 100)
  recipient: string;
  reference: string;
  reason?: string;
  currency?: "NGN";
}

export interface PaystackTransferResponse {
  status: boolean;
  message: string;
  data: {
    amount: number;
    currency: string;
    reference: string;
    source: string;
    reason: string | null;
    status:
      | "pending"
      | "success"
      | "reversed"
      | "failed"
      | "otp"
      | "abandoned"
      | "blocked"
      | "rejected"
      | "received";
    transfer_code: string;
    transferred_at: string | null;
  };
}

export async function initializeTransaction(
  params: PaystackInitializeParams
): Promise<PaystackInitializeResponse> {
  const res = await fetch(`${PAYSTACK_BASE_URL}/transaction/initialize`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(params),
  });

  if (!res.ok) {
    throw new Error(`Paystack initialization failed: ${res.statusText}`);
  }

  return res.json();
}

export async function createTransferRecipient(
  params: PaystackTransferRecipientParams
): Promise<PaystackTransferRecipientResponse> {
  const res = await fetch(`${PAYSTACK_BASE_URL}/transferrecipient`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      type: params.type ?? "nuban",
      currency: params.currency ?? "NGN",
      ...params,
    }),
  });

  if (!res.ok) {
    throw new Error(`Paystack recipient creation failed: ${res.statusText}`);
  }

  return res.json();
}

export async function initiateTransfer(
  params: PaystackInitiateTransferParams
): Promise<PaystackTransferResponse> {
  const res = await fetch(`${PAYSTACK_BASE_URL}/transfer`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      source: "balance",
      currency: params.currency ?? "NGN",
      ...params,
    }),
  });

  if (!res.ok) {
    throw new Error(`Paystack transfer failed: ${res.statusText}`);
  }

  return res.json();
}

export async function listBanks(): Promise<PaystackListBanksResponse> {
  const params = new URLSearchParams({
    country: "nigeria",
    currency: "NGN",
    perPage: "100",
  });

  const res = await fetch(`${PAYSTACK_BASE_URL}/bank?${params.toString()}`, {
    headers: {
      Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
    },
    next: { revalidate: 60 * 60 * 24 },
  });

  if (!res.ok) {
    throw new Error(`Paystack bank list failed: ${res.statusText}`);
  }

  return res.json();
}

export async function verifyTransaction(
  reference: string
): Promise<PaystackVerifyResponse> {
  const res = await fetch(
    `${PAYSTACK_BASE_URL}/transaction/verify/${reference}`,
    {
      headers: {
        Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
      },
    }
  );

  if (!res.ok) {
    throw new Error(`Paystack verification failed: ${res.statusText}`);
  }

  return res.json();
}

export function generateReference(prefix: string = "cge"): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}
