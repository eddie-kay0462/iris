const TERMII_API_KEY = process.env.SMS_PROVIDER_API_KEY;
const SENDER_ID = process.env.SMS_SENDER_ID;

type TermiiResponse = {
  message: string;
  message_id?: string;
  code?: string;
  balance?: number;
  user?: string;
};

export async function sendSMS(to: string, message: string) {
  if (!TERMII_API_KEY || !SENDER_ID) {
    throw new Error("SMS_PROVIDER_API_KEY and SMS_SENDER_ID must be set");
  }

  const response = await fetch("https://api.ng.termii.com/api/sms/send", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      to,
      from: SENDER_ID,
      sms: message,
      type: "plain",
      channel: "generic",
      api_key: TERMII_API_KEY,
    }),
  });

  if (!response.ok) {
    throw new Error(`Termii error: ${response.status}`);
  }

  return (await response.json()) as TermiiResponse;
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
