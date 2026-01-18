import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { ConvexHttpClient } from "convex/browser";
import { api } from "@/convex/_generated/api";

const PAYSTACK_SECRET_KEY = process.env.PAYSTACK_SECRET_KEY;
const CONVEX_URL = process.env.NEXT_PUBLIC_CONVEX_URL;

// Initialize Convex client for server-side mutations
const convex = new ConvexHttpClient(CONVEX_URL!);

// Paystack webhook event types
type PaystackEvent =
  | "charge.success"
  | "subscription.create"
  | "subscription.disable"
  | "subscription.not_renew"
  | "invoice.create"
  | "invoice.payment_failed"
  | "invoice.update"
  | "transfer.success"
  | "transfer.failed";

interface PaystackWebhookPayload {
  event: PaystackEvent;
  data: {
    id: number;
    domain: string;
    status: string;
    reference: string;
    amount: number;
    message: string | null;
    gateway_response: string;
    paid_at: string;
    created_at: string;
    channel: string;
    currency: string;
    ip_address: string;
    metadata: {
      userId?: string;
      custom_fields?: Array<{
        display_name: string;
        variable_name: string;
        value: string;
      }>;
    };
    customer: {
      id: number;
      first_name: string | null;
      last_name: string | null;
      email: string;
      customer_code: string;
      phone: string | null;
      metadata: Record<string, unknown> | null;
      risk_action: string;
    };
    authorization?: {
      authorization_code: string;
      bin: string;
      last4: string;
      exp_month: string;
      exp_year: string;
      channel: string;
      card_type: string;
      bank: string;
      country_code: string;
      brand: string;
      reusable: boolean;
      signature: string;
    };
    plan?: {
      id: number;
      name: string;
      plan_code: string;
      description: string | null;
      amount: number;
      interval: string;
      send_invoices: boolean;
      send_sms: boolean;
      currency: string;
    };
    subscription_code?: string;
    email_token?: string;
  };
}

// Verify Paystack webhook signature
function verifyPaystackSignature(
  body: string,
  signature: string | null
): boolean {
  if (!signature || !PAYSTACK_SECRET_KEY) {
    return false;
  }

  const hash = crypto
    .createHmac("sha512", PAYSTACK_SECRET_KEY)
    .update(body)
    .digest("hex");

  return hash === signature;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.text();
    const signature = request.headers.get("x-paystack-signature");

    // Verify webhook signature
    if (!verifyPaystackSignature(body, signature)) {
      console.error("Invalid Paystack webhook signature");
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }

    const payload: PaystackWebhookPayload = JSON.parse(body);
    const { event, data } = payload;

    console.log(`Received Paystack webhook: ${event}`, {
      reference: data.reference,
      customerEmail: data.customer?.email,
    });

    switch (event) {
      case "charge.success":
        await handleChargeSuccess(data);
        break;

      case "subscription.create":
        await handleSubscriptionCreate(data);
        break;

      case "subscription.disable":
        await handleSubscriptionDisable(data);
        break;

      case "subscription.not_renew":
        await handleSubscriptionNotRenew(data);
        break;

      case "invoice.payment_failed":
        await handlePaymentFailed(data);
        break;

      default:
        console.log(`Unhandled webhook event: ${event}`);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("Webhook processing error:", error);
    return NextResponse.json(
      { error: "Webhook processing failed" },
      { status: 500 }
    );
  }
}

async function handleChargeSuccess(data: PaystackWebhookPayload["data"]) {
  const userId = getUserIdFromMetadata(data.metadata);
  const customerCode = data.customer.customer_code;
  const authorizationCode = data.authorization?.authorization_code;

  if (!userId) {
    console.error("No userId found in charge.success metadata");
    return;
  }

  // Determine if this is a subscription payment
  const isSubscription = !!data.plan;
  const tier = isSubscription ? "scholar" : "free";

  // Calculate subscription end date (1 month from now for monthly plan)
  const subscriptionEndDate = new Date();
  subscriptionEndDate.setMonth(subscriptionEndDate.getMonth() + 1);

  try {
    await convex.mutation(api.subscriptions.updateSubscription, {
      tokenIdentifier: userId,
      tier,
      status: "active",
      paystackCustomerId: customerCode,
      paystackSubscriptionCode: data.subscription_code,
      paystackAuthorizationCode: authorizationCode,
      subscriptionStartDate: Date.now(),
      subscriptionEndDate: subscriptionEndDate.getTime(),
    });

    console.log(`Subscription activated for user: ${userId}`);
  } catch (error) {
    console.error("Failed to update subscription:", error);
  }
}

async function handleSubscriptionCreate(data: PaystackWebhookPayload["data"]) {
  const customerCode = data.customer.customer_code;

  try {
    // Update subscription status
    await convex.mutation(api.subscriptions.updateSubscriptionByCustomerId, {
      paystackCustomerId: customerCode,
      status: "active",
      paystackSubscriptionCode: data.subscription_code,
    });

    console.log(`Subscription created for customer: ${customerCode}`);
  } catch (error) {
    console.error("Failed to handle subscription.create:", error);
  }
}

async function handleSubscriptionDisable(data: PaystackWebhookPayload["data"]) {
  const customerCode = data.customer.customer_code;

  try {
    await convex.mutation(api.subscriptions.updateSubscriptionByCustomerId, {
      paystackCustomerId: customerCode,
      status: "cancelled",
    });

    console.log(`Subscription disabled for customer: ${customerCode}`);
  } catch (error) {
    console.error("Failed to handle subscription.disable:", error);
  }
}

async function handleSubscriptionNotRenew(
  data: PaystackWebhookPayload["data"]
) {
  const customerCode = data.customer.customer_code;

  try {
    await convex.mutation(api.subscriptions.updateSubscriptionByCustomerId, {
      paystackCustomerId: customerCode,
      status: "cancelled",
    });

    console.log(`Subscription will not renew for customer: ${customerCode}`);
  } catch (error) {
    console.error("Failed to handle subscription.not_renew:", error);
  }
}

async function handlePaymentFailed(data: PaystackWebhookPayload["data"]) {
  const customerCode = data.customer.customer_code;

  try {
    await convex.mutation(api.subscriptions.updateSubscriptionByCustomerId, {
      paystackCustomerId: customerCode,
      status: "past_due",
    });

    console.log(`Payment failed for customer: ${customerCode}`);
  } catch (error) {
    console.error("Failed to handle invoice.payment_failed:", error);
  }
}

function getUserIdFromMetadata(
  metadata: PaystackWebhookPayload["data"]["metadata"]
): string | null {
  if (metadata.userId) {
    return metadata.userId;
  }

  // Check custom_fields
  const userIdField = metadata.custom_fields?.find(
    (f) => f.variable_name === "user_id"
  );
  if (userIdField) {
    return userIdField.value;
  }

  return null;
}
