import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { whiteboards } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function GET(request: NextRequest) {
  // Extract UUID from the pathname
  const url = new URL(request.url);
  const segments = url.pathname.split("/");
  const uuid = segments[segments.length - 1]; // last segment is the uuid

  try {
    const whiteboard = await db.query.whiteboards.findFirst({
      where: eq(whiteboards.id, uuid),
    });

    if (!whiteboard) {
      return NextResponse.json(
        { error: "Whiteboard not found" },
        { status: 404 },
      );
    }

    return NextResponse.json({
      encryptedData: whiteboard.encryptedData,
      updatedAt: whiteboard.updatedAt,
    });
  } catch (error) {
    console.error("Error fetching whiteboard:", error);
    return NextResponse.json(
      { error: "Failed to fetch whiteboard" },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  const url = new URL(request.url);
  const segments = url.pathname.split("/");
  const uuid = segments[segments.length - 1];

  try {
    const { encryptedData } = await request.json();

    if (!encryptedData || typeof encryptedData !== "string") {
      return NextResponse.json(
        { error: "Invalid encrypted data" },
        { status: 400 },
      );
    }

    const now = new Date();

    const existing = await db.query.whiteboards.findFirst({
      where: eq(whiteboards.id, uuid),
    });

    if (existing) {
      await db
        .update(whiteboards)
        .set({ encryptedData, updatedAt: now })
        .where(eq(whiteboards.id, uuid));
    } else {
      await db.insert(whiteboards).values({
        id: uuid,
        encryptedData,
        createdAt: now,
        updatedAt: now,
      });
    }

    return NextResponse.json({ success: true, updatedAt: now });
  } catch (error) {
    console.error("Error saving whiteboard:", error);
    return NextResponse.json(
      { error: "Failed to save whiteboard" },
      { status: 500 },
    );
  }
}
