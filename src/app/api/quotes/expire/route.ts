import { NextRequest, NextResponse } from "next/server";
import { processExpiredQuotes } from "@/lib/quote-expiration";

export async function POST(request: NextRequest) {
  try {
    // Optional: Add authentication/authorization here for security
    // For now, anyone can trigger this endpoint
    
    const result = await processExpiredQuotes();
    
    return NextResponse.json({
      success: true,
      message: `Processed ${result.processed} expired quotes`,
      processed: result.processed,
      expiredQuotes: result.expired,
    });
  } catch (error: any) {
    console.error("Failed to process expired quotes:", error);
    return NextResponse.json(
      { 
        success: false,
        error: "Failed to process expired quotes",
        details: error.message 
      },
      { status: 500 }
    );
  }
}

// Allow GET requests for easy testing
export async function GET() {
  return POST(new NextRequest("http://localhost"));
}