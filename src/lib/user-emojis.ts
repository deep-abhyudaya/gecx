import { EmojiItem } from "@/components/messages/MediaPicker";

let emojiCache: EmojiItem[] | undefined;
let emojiPromise: Promise<EmojiItem[]> | undefined;

export async function fetchUserEmojis(): Promise<EmojiItem[]> {
  if (emojiCache !== undefined) return emojiCache;
  if (emojiPromise) return emojiPromise;

  emojiPromise = fetch("/api/user-emojis")
    .then((res) => res.json())
    .then((data) => {
      const emojis = data.emojis || [];
      emojiCache = emojis;
      return emojis;
    })
    .catch(() => {
      emojiCache = [];
      return [];
    });

  return emojiPromise;
}
