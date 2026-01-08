import { NextRequest, NextResponse } from "next/server";
import puppeteer from "puppeteer-core";
import chromium from "@sparticuz/chromium";

export const maxDuration = 60; // Vercel function timeout

interface RenderPdfRequest {
  url: string;
  token?: string;
  options?: {
    format?: "A4" | "Letter" | "Legal";
    printBackground?: boolean;
    margin?: {
      top?: string;
      bottom?: string;
      left?: string;
      right?: string;
    };
  };
}

export async function POST(req: NextRequest) {
  try {
    const body: RenderPdfRequest = await req.json();
    const { url, token, options = {} } = body;

    if (!url) {
      return NextResponse.json({ error: "URL is required" }, { status: 400 });
    }

    // Configure Chromium for serverless environment
    const executablePath = await chromium.executablePath();

    // Launch headless browser
    const browser = await puppeteer.launch({
      args: chromium.args,
      executablePath,
      headless: true,
    });

    const page = await browser.newPage();

    // Set viewport for consistent rendering
    await page.setViewport({
      width: 1200,
      height: 800,
      deviceScaleFactor: 2,
    });

    // Navigate to the print page with token
    const targetUrl = token ? `${url}?token=${token}` : url;
    await page.goto(targetUrl, {
      waitUntil: "networkidle0",
      timeout: 30000,
    });

    // Wait for content to be fully rendered
    await page
      .waitForSelector(".print-container", {
        timeout: 10000,
      })
      .catch(() => {
        // Container might not exist if page failed to load
        console.warn("Print container not found, proceeding anyway");
      });

    // Additional wait for dynamic content (Mermaid, KaTeX, etc.)
    await new Promise((resolve) => setTimeout(resolve, 1000));

    // Generate PDF
    const pdf = await page.pdf({
      format: options.format || "A4",
      printBackground: options.printBackground ?? true,
      margin: options.margin || {
        top: "40px",
        bottom: "40px",
        left: "40px",
        right: "40px",
      },
      displayHeaderFooter: false,
    });

    await browser.close();

    // Return PDF as response
    return new NextResponse(Buffer.from(pdf), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="export.pdf"`,
      },
    });
  } catch (error) {
    console.error("PDF generation error:", error);

    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";

    return NextResponse.json(
      { error: "Failed to generate PDF", details: errorMessage },
      { status: 500 }
    );
  }
}
