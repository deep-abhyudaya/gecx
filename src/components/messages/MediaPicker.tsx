"use client";

import { useState, useEffect, useRef, useCallback, forwardRef } from "react";
import { Search, X, Loader2, Smile, Sticker, Film } from "lucide-react";
import { useTheme } from "next-themes";

export interface GifResult {
  id: string;
  title: string;
  url: string;
  preview: string;
  width: number;
  height: number;
}

export interface EmojiItem {
  id: string;
  name: string;
  imageUrl: string;
  packId: string;
}

export interface StickerItem {
  id: string;
  name: string;
  imageUrl: string;
  packId: string;
}

interface MediaPickerProps {
  onGifSelect: (gifUrl: string) => void;
  onEmojiSelect: (emojiSyntax: string) => void;
  onStickerSelect?: (stickerUrl: string) => void;
  serverEmojis?: EmojiItem[];
  serverStickers?: StickerItem[];
  onClose: () => void;
  hideStickers?: boolean;
  initialTab?: Tab;
}

type Tab = "gif" | "emoji" | "sticker";

export default function MediaPicker({
  onGifSelect,
  onEmojiSelect,
  onStickerSelect,
  serverEmojis = [],
  serverStickers = [],
  onClose,
  hideStickers = false,
  initialTab = "gif",
}: MediaPickerProps) {
  const [tab, setTab] = useState<Tab>(initialTab);
  const [query, setQuery] = useState("");
  const [gifs, setGifs] = useState<GifResult[]>([]);
  const [loadingGifs, setLoadingGifs] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";
  const searchRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  // Fetch GIFs
  const fetchGifs = useCallback(async (q: string) => {
    setLoadingGifs(true);
    try {
      const res = await fetch(`/api/giphy?q=${encodeURIComponent(q)}&limit=24`);
      const data = await res.json();
      setGifs(data.results || []);
    } catch {
      setGifs([]);
    } finally {
      setLoadingGifs(false);
    }
  }, []);

  // Initial trending load
  useEffect(() => {
    if (tab === "gif") {
      fetchGifs("");
    }
  }, [tab, fetchGifs]);

  // Debounced search
  useEffect(() => {
    if (tab !== "gif") return;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      fetchGifs(query);
    }, 400);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query, tab, fetchGifs]);

  // Focus search on open
  useEffect(() => {
    setTimeout(() => searchRef.current?.focus(), 50);
  }, []);

  // Reset selected index and item refs when tab or query changes
  useEffect(() => {
    itemRefs.current = [];
    setSelectedIndex(0);
  }, [tab, query]);

  // Use server emojis and stickers only
  const allEmojis = serverEmojis;
  const allStickers = serverStickers;

  const filteredEmojis = query
    ? allEmojis.filter((e) => e.name.includes(query.toLowerCase()))
    : allEmojis;
  const filteredStickers = query
    ? allStickers.filter((s) => s.name.includes(query.toLowerCase()))
    : allStickers;

  // Keyboard navigation inside picker
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const items = tab === "gif" ? gifs : tab === "emoji" ? filteredEmojis : filteredStickers;
      if (items.length === 0) return;

      if (e.key === "ArrowDown" || e.key === "ArrowRight") {
        e.preventDefault();
        setSelectedIndex((prev) => (prev + 1) % items.length);
      } else if (e.key === "ArrowUp" || e.key === "ArrowLeft") {
        e.preventDefault();
        setSelectedIndex((prev) => (prev - 1 + items.length) % items.length);
      } else if (e.key === "Enter") {
        e.preventDefault();
        const item = items[selectedIndex];
        if (!item) return;
        if (tab === "gif") {
          onGifSelect((item as GifResult).url);
          onClose();
        } else if (tab === "emoji") {
          onEmojiSelect(`:${(item as EmojiItem).name}:`);
          onClose();
        } else if (tab === "sticker") {
          onStickerSelect?.((item as StickerItem).imageUrl);
          onClose();
        }
      } else if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      }
    };

    const el = containerRef.current;
    if (!el) return;
    el.focus();
    el.addEventListener("keydown", handler);
    return () => el.removeEventListener("keydown", handler);
  }, [tab, gifs, filteredEmojis, filteredStickers, selectedIndex, onGifSelect, onEmojiSelect, onStickerSelect, onClose]);

  const tabs: { key: Tab; label: string; icon: React.ReactNode }[] = [
    { key: "gif", label: "GIFs", icon: <Film className="size-4" /> },
    { key: "emoji", label: "Emojis", icon: <Smile className="size-4" /> },
    ...(hideStickers ? [] : [{ key: "sticker" as Tab, label: "Stickers", icon: <Sticker className="size-4" /> }]),
  ];

  // Scroll selected item into view
  const itemRefs = useRef<(HTMLButtonElement | null)[]>([]);
  useEffect(() => {
    const el = itemRefs.current[selectedIndex];
    if (el) {
      el.scrollIntoView({ block: "nearest", behavior: "smooth" });
    }
  }, [selectedIndex]);

  return (
    <div
      ref={containerRef}
      tabIndex={-1}
      className="flex flex-col rounded-xl border border-border shadow-2xl overflow-hidden outline-none"
      style={{
        width: 360,
        height: 420,
        background: isDark ? "hsl(var(--background))" : "hsl(var(--background))",
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-3 pt-3 pb-2 border-b border-border shrink-0">
        {/* Tabs */}
        <div className="flex gap-1">
          {tabs.map((t) => (
            <button
              key={t.key}
              onClick={() => { setTab(t.key); setQuery(""); }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[12px] font-semibold transition-colors ${
                tab === t.key
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted"
              }`}
            >
              {t.icon}
              {t.label}
            </button>
          ))}
        </div>
        <button
          onClick={onClose}
          className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
        >
          <X className="size-4" />
        </button>
      </div>

      {/* Search */}
      <div className="px-3 py-2 border-b border-border shrink-0">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground pointer-events-none" />
          <input
            ref={searchRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={
              tab === "gif" ? "Search GIFs..." :
              tab === "emoji" ? "Search emojis..." :
              "Search stickers..."
            }
            className="w-full h-8 pl-8 pr-3 rounded-md text-[13px] bg-muted border-none outline-none text-foreground placeholder:text-muted-foreground"
          />
          {query && (
            <button
              onClick={() => setQuery("")}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="size-3" />
            </button>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">

        {/* GIFs Tab */}
        {tab === "gif" && (
          <div className="p-2">
            {loadingGifs ? (
              <div className="flex items-center justify-center h-32">
                <Loader2 className="size-6 animate-spin text-muted-foreground" />
              </div>
            ) : gifs.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-32 gap-2 text-muted-foreground">
                <Film className="size-8 opacity-40" />
                <p className="text-[12px]">
                  {query ? "No GIFs found" : "GIPHY API key not configured"}
                </p>
              </div>
            ) : (
              <div className="columns-2 gap-2 space-y-2">
                {gifs.map((gif, idx) => (
                  <button
                    key={gif.id}
                    ref={(el) => { itemRefs.current[idx] = el; }}
                    onClick={() => {
                      onGifSelect(gif.url);
                      onClose();
                    }}
                    className={`block w-full rounded-lg overflow-hidden hover:opacity-80 hover:scale-[1.02] transition-all duration-150 bg-muted ${
                      selectedIndex === idx ? "ring-2 ring-primary ring-offset-1" : ""
                    }`}
                    title={gif.title}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={gif.preview || gif.url}
                      alt={gif.title}
                      className="w-full object-cover"
                      loading="lazy"
                    />
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Emojis Tab */}
        {tab === "emoji" && (
          <div className="p-2">
            {allEmojis.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-32 gap-2 text-muted-foreground">
                <Smile className="size-8 opacity-40" />
                <p className="text-[12px] text-center px-4">
                  No custom emojis yet.
                </p>
              </div>
            ) : filteredEmojis.length === 0 ? (
              <div className="flex items-center justify-center h-24 text-muted-foreground text-[12px]">
                No emojis match &quot;{query}&quot;
              </div>
            ) : (
              <>
                <div className="grid grid-cols-7 gap-1">
                  {filteredEmojis.map((emoji, idx) => (
                    <EmojiButton
                      key={emoji.id}
                      emoji={emoji}
                      isSelected={selectedIndex === idx}
                      ref={(el) => { itemRefs.current[idx] = el; }}
                      onClick={() => {
                        onEmojiSelect(`:${emoji.name}:`);
                        onClose();
                      }}
                    />
                  ))}
                </div>
              </>
            )}
          </div>
        )}

        {/* Stickers Tab */}
        {tab === "sticker" && (
          <div className="p-2">
            {allStickers.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-32 gap-2 text-muted-foreground">
                <Sticker className="size-8 opacity-40" />
                <p className="text-[12px] text-center px-4">
                  No custom stickers yet.
                </p>
              </div>
            ) : filteredStickers.length === 0 ? (
              <div className="flex items-center justify-center h-24 text-muted-foreground text-[12px]">
                No stickers match &quot;{query}&quot;
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-2">
                {filteredStickers.map((sticker, idx) => (
                  <button
                    key={sticker.id}
                    ref={(el) => { itemRefs.current[idx] = el; }}
                    onClick={() => {
                      onStickerSelect?.(sticker.imageUrl);
                      onClose();
                    }}
                    className={`group relative aspect-square rounded-xl overflow-hidden bg-muted hover:bg-muted/80 hover:scale-105 transition-all duration-150 p-2 flex items-center justify-center border ${
                      selectedIndex === idx ? "border-primary ring-1 ring-primary" : "border-border"
                    }`}
                    title={sticker.name}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={sticker.imageUrl}
                      alt={sticker.name}
                      className="w-full h-full object-contain"
                      loading="lazy"
                    />
                    <span className="absolute bottom-0 left-0 right-0 text-[9px] text-center text-muted-foreground bg-background/80 py-0.5 opacity-0 group-hover:opacity-100 transition-opacity truncate px-1">
                      :{sticker.name}:
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="px-3 py-2 border-t border-border shrink-0 flex items-center justify-between">
        {tab === "gif" && (
          <p className="text-[10px] text-muted-foreground">
            Powered by <span className="font-semibold">GIPHY</span>
          </p>
        )}
        {(tab === "emoji" || tab === "sticker") && (
          <p className="text-[10px] text-muted-foreground">
            Get more in the <span className="font-semibold text-primary">Shop</span>
          </p>
        )}
        <div />
      </div>
    </div>
  );
}

const EmojiButton = forwardRef<HTMLButtonElement, { emoji: EmojiItem; onClick: () => void; isSelected?: boolean }>(
  function EmojiButton({ emoji, onClick, isSelected }, ref) {
    return (
      <button
        ref={ref}
        onClick={onClick}
        className={`group relative flex items-center justify-center w-full aspect-square rounded-lg hover:bg-muted transition-colors p-0.5 ${
          isSelected ? "ring-2 ring-primary ring-offset-1 bg-muted" : ""
        }`}
        title={`:${emoji.name}:`}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={emoji.imageUrl}
          alt={emoji.name}
          className="w-full h-full object-contain"
          loading="lazy"
        />
        <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 bg-foreground text-background text-[9px] px-1.5 py-0.5 rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50">
          :{emoji.name}:
        </div>
      </button>
    );
  }
);
