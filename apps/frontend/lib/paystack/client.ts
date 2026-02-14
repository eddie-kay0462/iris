type PaystackConfig = {
  email: string;
  amount: number;
  reference?: string;
};

export const PAYSTACK_PUBLIC_KEY =
  process.env.NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY ?? "";

export const createPaystackConfig = ({
  email,
  amount,
  reference,
}: PaystackConfig) => ({
  email,
  amount,
  currency: "GHS",
  reference: reference ?? `${Date.now()}`,
  publicKey: PAYSTACK_PUBLIC_KEY,
});
