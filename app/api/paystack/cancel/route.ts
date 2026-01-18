import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";

const PAYSTACK_SECRET_KEY = process.env.PAYSTACK_SECRET_KEY;
const PAYSTACK_BASE_URL = "https://api.paystack.co";

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!PAYSTACK_SECRET_KEY) {
      return NextResponse.json(
        { error: "Payment system not configured" },
        { status: 500 }
      );
    }

    const body = await request.json();
    const { subscriptionCode, emailToken } = body;

    if (!subscriptionCode) {
      return NextResponse.json(
        { error: "Subscription code is required" },
        { status: 400 }
      );
    }

    // Disable the subscription with Paystack
    const response = await fetch(
      `${PAYSTACK_BASE_URL}/subscription/disable`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          code: subscriptionCode,
          token: emailToken,
        }),
      }
    );

    const data = await response.json();

    if (!data.status) {
      console.error("Paystack subscription cancellation failed:", data);
      return NextResponse.json(
        { error: data.message || "Failed to cancel subscription" },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Subscription cancelled successfully",
    });
  } catch (error) {
    console.error("Subscription cancellation error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
