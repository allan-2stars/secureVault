import { NextResponse } from "next/server";

// Some browsers still request /favicon.ico even when the app icon is provided as SVG.
// Redirect that legacy path to the existing SVG app icon so the request stops 404ing.
export function GET(request: Request) {
  return NextResponse.redirect(new URL("/icon.svg", request.url), 307);
}
