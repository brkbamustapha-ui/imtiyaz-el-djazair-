import { NextResponse, type NextRequest } from "next/server";
import { PREVIEW_COOKIE } from "@/lib/preview";

export async function GET(request: NextRequest) {
  const response = NextResponse.redirect(new URL("/", request.url));
  response.cookies.delete(PREVIEW_COOKIE);
  return response;
}
