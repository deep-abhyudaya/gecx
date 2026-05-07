import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { getAllUserServerEmojisAndStickers } from "@/actions/emoji-sticker.actions";

export async function GET() {
  const { userId } = auth();
  
  if (!userId) {
    return NextResponse.json({ emojis: [] }, { status: 401 });
  }

  try {
    // Get emojis from all servers the user is a member of
    const { emojis } = await getAllUserServerEmojisAndStickers();
    return NextResponse.json({ emojis });
  } catch (error) {
    console.error("Failed to fetch user emojis:", error);
    return NextResponse.json({ emojis: [] }, { status: 500 });
  }
}
