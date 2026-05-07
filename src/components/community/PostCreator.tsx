"use client";

import { useState, useRef, useEffect } from "react";
import Image from "next/image";
import { Send, Loader2, Smile } from "lucide-react";
import { Button } from "@/components/ui/button";
import { createPost } from "@/actions/community.actions";
import { toast } from "react-toastify";
import { useRouter } from "next/navigation";
import MediaPicker, { EmojiItem } from "@/components/messages/MediaPicker";
import { fetchUserEmojis } from "@/lib/user-emojis";

interface PostCreatorProps {
  userImage?: string | null;
  onPostCreated?: () => void;
}

export function PostCreator({ userImage, onPostCreated }: PostCreatorProps) {
  const [content, setContent] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showMediaPicker, setShowMediaPicker] = useState(false);
  const [userEmojis, setUserEmojis] = useState<EmojiItem[]>([]);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const router = useRouter();

  // Fetch user's global emojis (cached)
  useEffect(() => {
    fetchUserEmojis()
      .then((emojis) => {
        if (emojis.length > 0) setUserEmojis(emojis);
      })
      .catch(() => {});
  }, []);

  const charCount = content.length;
  const maxChars = 2000;

  const handleSubmit = async () => {
    if (!content.trim() || isSubmitting) return;

    setIsSubmitting(true);
    try {
      await createPost(content.trim());
      setContent("");
      toast.success("Post created!");
      onPostCreated?.();
      router.refresh();
    } catch (error) {
      toast.error("Failed to create post");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
      handleSubmit();
    }
  };

  return (
    <div className="border-b border-border p-4 relative">
      <div className="flex gap-3">
        <div className="relative w-10 h-10 rounded-full overflow-hidden bg-muted shrink-0">
          <Image
            src={userImage || "/noAvatar.png"}
            alt="Your avatar"
            fill
            className="object-cover"
          />
        </div>

        <div className="flex-1 relative">
          <textarea
            ref={textareaRef}
            value={content}
            onChange={(e) => setContent(e.target.value.slice(0, maxChars))}
            onKeyDown={handleKeyDown}
            placeholder="What's happening?"
            className="w-full min-h-[80px] bg-transparent border-none resize-none focus:outline-none focus:ring-0 text-sm placeholder:text-muted-foreground"
            disabled={isSubmitting}
          />

          <div className="flex items-center justify-between mt-2 pt-2 border-t border-border/50">
            <div className="text-xs text-muted-foreground">
              <span className={charCount > maxChars * 0.9 ? "text-yellow-500" : ""}>
                {charCount}
              </span>
              <span> / {maxChars}</span>
              <span className="ml-2 hidden sm:inline">· Ctrl+Enter to post</span>
            </div>

            <div className="flex items-center gap-2">
              {/* Emoji/GIF Picker Button */}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowMediaPicker(!showMediaPicker)}
                className="gap-1.5 text-muted-foreground hover:text-foreground"
              >
                <Smile size={16} />
              </Button>

              <Button
                onClick={handleSubmit}
                disabled={!content.trim() || isSubmitting || charCount > maxChars}
                size="sm"
                className="gap-1.5"
              >
                {isSubmitting ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : (
                  <Send size={14} />
                )}
                Post
              </Button>
            </div>
          </div>

          {/* Media Picker Popover - Fixed positioning with backdrop */}
          {showMediaPicker && (
            <>
              {/* Backdrop to close picker when clicking outside */}
              <div 
                className="fixed inset-0 z-40" 
                onClick={() => setShowMediaPicker(false)}
              />
              <div className="absolute z-50 mt-2 right-0">
                <MediaPicker
                  onGifSelect={(gifUrl) => {
                    insertText(gifUrl);
                    setShowMediaPicker(false);
                  }}
                  onEmojiSelect={(emojiSyntax) => {
                    insertText(emojiSyntax);
                    setShowMediaPicker(false);
                  }}
                  serverEmojis={userEmojis}
                  onClose={() => setShowMediaPicker(false)}
                  hideStickers={true}
                />
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );

  function insertText(text: string) {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const newContent = content.slice(0, start) + text + " " + content.slice(end);
    setContent(newContent.slice(0, maxChars));

    // Focus and set cursor position after inserted text
    setTimeout(() => {
      textarea.focus();
      const newPosition = start + text.length + 1;
      textarea.setSelectionRange(newPosition, newPosition);
    }, 0);
  }
}
