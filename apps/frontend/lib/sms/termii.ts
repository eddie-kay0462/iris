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
  waitlistConfirmation: (name: string) =>
    `Hi ${name}! You're on the 1NRI Inner Circle waitlist. We'll notify you when a spot opens. Welcome to the journey.`,
  invitation: (name: string, link: string) =>
    `${name}, your Inner Circle invitation is ready! Complete enrollment here: ${link} (expires in 48hrs)`,
  subscriptionConfirmed: (name: string, tier: string) =>
    `Welcome to Inner Circle, ${name}! Your ${tier} membership is active. Start shopping at inner-circle prices now.`,
  orderConfirmation: (orderNumber: string) =>
    `Order #${orderNumber} confirmed! We'll update you on shipping soon.`,
};
