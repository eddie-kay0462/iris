const LETSFISH_APP_ID = process.env.LETSFISH_APP_ID;
const LETSFISH_APP_SECRET = process.env.LETSFISH_APP_SECRET;
const LETSFISH_BASE_URL = process.env.LETSFISH_BASE_URL || "https://api.letsfish.africa/v1";
const SENDER_ID = process.env.LETSFISH_SENDER_ID || "1NRI";

export async function sendSMS(to: string, message: string) {
  if (!LETSFISH_APP_ID || !LETSFISH_APP_SECRET) {
    throw new Error("LETSFISH_APP_ID and LETSFISH_APP_SECRET must be set");
  }

  // LetsFish expects international format without +: e.g. 233241234567
  const normalizedPhone = to.trim().replace(/\s+/g, "").replace(/^\+/, "");

  const response = await fetch(`${LETSFISH_BASE_URL}/sms`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${LETSFISH_APP_ID}.${LETSFISH_APP_SECRET}`,
    },
    body: JSON.stringify({
      sender_id: SENDER_ID,
      message,
      recipients: [normalizedPhone],
    }),
  });

  if (!response.ok) {
    throw new Error(`LetsFish error: ${response.status}`);
  }

  const data = await response.json();
  if (!data.success) {
    throw new Error(`LetsFish error: ${data.message}`);
  }

  return data;
}

export const SMS_TEMPLATES = {
  orderConfirmation: (orderNumber: string) =>
    `Order #${orderNumber} confirmed! We'll update you on shipping soon.`,
};
