import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";

const PAYSTACK_SECRET_KEY = process.env.PAYSTACK_SECRET_KEY;
const PAYSTACK_BASE_URL = "https://api.paystack.co";
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

interface PaystackVerifyResponse {
  status: boolean;
  message: string;
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
    customer: {
      id: number;
      email: string;
      customer_code: string;
    };
    authorization: {
      authorization_code: string;
      card_type: string;
      last4: string;
      bank: string;
    };
    plan?: {
      id: number;
      name: string;
      plan_code: string;
    };
    metadata: {
      userId?: string;
    };
  };
}

// GET handler for callback redirect from Paystack
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const reference = searchParams.get("reference");
    const trxref = searchParams.get("trxref");

    const paymentReference = reference || trxref;

    if (!paymentReference) {
      return NextResponse.redirect(
        `${APP_URL}/dashboard?payment=error&message=No reference provided`
      );
    }

    // Verify the transaction with Paystack
    const verifyResponse = await verifyTransaction(paymentReference);

    if (!verifyResponse.status) {
      return NextResponse.redirect(
        `${APP_URL}/dashboard?payment=error&message=${encodeURIComponent(verifyResponse.message)}`
      );
    }

    const { data } = verifyResponse;

    if (data.status === "success") {
      // Payment successful - redirect to dashboard with success message
      return NextResponse.redirect(
        `${APP_URL}/dashboard?payment=success&plan=${data.plan?.name || "Scholar"}`
      );
    } else if (data.status === "abandoned") {
      return NextResponse.redirect(
        `${APP_URL}/dashboard?payment=cancelled&message=Payment was abandoned`
      );
    } else {
      return NextResponse.redirect(
        `${APP_URL}/dashboard?payment=error&message=${encodeURIComponent(data.gateway_response || "Payment failed")}`
      );
    }
  } catch (error) {
    console.error("Payment verification error:", error);
    return NextResponse.redirect(
      `${APP_URL}/dashboard?payment=error&message=Verification failed`
    );
  }
}

// POST handler for API verification requests
export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { reference } = body;

    if (!reference) {
      return NextResponse.json(
        { error: "Reference is required" },
        { status: 400 }
      );
    }

    const verifyResponse = await verifyTransaction(reference);

    if (!verifyResponse.status) {
      return NextResponse.json(
        {
          success: false,
          error: verifyResponse.message,
        },
        { status: 400 }
      );
    }

    const { data } = verifyResponse;

    return NextResponse.json({
      success: data.status === "success",
      status: data.status,
      amount: data.amount / 100, // Convert from kobo to main unit
      currency: data.currency,
      customer: {
        email: data.customer.email,
        customerCode: data.customer.customer_code,
      },
      plan: data.plan
        ? {
            name: data.plan.name,
            planCode: data.plan.plan_code,
          }
        : null,
      paidAt: data.paid_at,
    });
  } catch (error) {
    console.error("Payment verification error:", error);
    return NextResponse.json(
      { error: "Verification failed" },
      { status: 500 }
    );
  }
}

async function verifyTransaction(
  reference: string
): Promise<PaystackVerifyResponse> {
  if (!PAYSTACK_SECRET_KEY) {
    throw new Error("PAYSTACK_SECRET_KEY not configured");
  }

  const response = await fetch(
    `${PAYSTACK_BASE_URL}/transaction/verify/${encodeURIComponent(reference)}`,
    {
      method: "GET",
      headers: {
        Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
        "Content-Type": "application/json",
      },
    }
  );

  return response.json();
}
