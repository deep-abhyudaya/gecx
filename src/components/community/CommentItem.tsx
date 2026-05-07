"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import Image from "next/image";
import { Heart, MessageCircle, Trash2, MoreHorizontal } from "lucide-react";
import { formatDistanceToNow } from "@/lib/utils";
import { likeComment, deleteComment } from "@/actions/community-comment.actions";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "react-toastify";
import { cn } from "@/lib/utils";
import { extractImageUrls } from "@/lib/image-detection";
import ImageEmbed from "@/components/ImageEmbed";
import EmojiRenderer, { buildEmojiMap } from "@/components/messages/EmojiRenderer";
import { UserCardTrigger } from "@/components/user";
import { fetchUserEmojis } from "@/lib/user-emojis";

interface CommentItemProps {
  comment: {
    id: string;
    content: string;
    authorId: string;
    authorName: string;
    authorUsername?: string;
    authorImage: string | null;
    likeCount: number;
    createdAt: Date;
    hasLiked?: boolean;
    isOwnComment?: boolean;
    isAdmin?: boolean;
  };
  onReply?: () => void;
  onDelete?: () => void;
}

export function CommentItem({ comment, onReply, onDelete }: CommentItemProps) {
  const [isLiked, setIsLiked] = useState(comment.hasLiked || false);
  const [likeCount, setLikeCount] = useState(comment.likeCount);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [userEmojis, setUserEmojis] = useState<Array<{ name: string; imageUrl: string }>>([]);

  // Fetch user's server emojis for rendering (cached)
  useEffect(() => {
    fetchUserEmojis()
      .then((emojis) => {
        if (emojis.length > 0) setUserEmojis(emojis);
      })
      .catch(() => {});
  }, []);

  const emojiMap = useMemo(() => buildEmojiMap(userEmojis, []), [userEmojis]);

  const handleLike = async () => {
    try {
      const result = await likeComment(comment.id);
      setIsLiked(result.liked);
      setLikeCount(prev => result.liked ? prev + 1 : prev - 1);
    } catch (error) {
      toast.error("Failed to like comment");
    }
  };

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      await deleteComment(comment.id);
      toast.success("Comment deleted");
      onDelete?.();
    } catch (error) {
      toast.error("Failed to delete comment");
    } finally {
      setIsDeleting(false);
      setShowDeleteDialog(false);
    }
  };

  return (
    <div className="flex gap-3 py-3">
      <UserCardTrigger userId={comment.authorId}>
        <div className="relative w-8 h-8 rounded-full overflow-hidden bg-muted shrink-0 cursor-pointer">
          <Image
            src={comment.authorImage || "/noAvatar.png"}
            alt={comment.authorName}
            fill
            className="object-cover"
          />
        </div>
      </UserCardTrigger>

      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1">
            <div className="flex items-center gap-1.5 flex-wrap">
              <UserCardTrigger userId={comment.authorId}>
                <span className="font-semibold text-sm cursor-pointer hover:underline">{comment.authorName}</span>
              </UserCardTrigger>
              <span className="text-muted-foreground text-sm">
                · {formatDistanceToNow(new Date(comment.createdAt))}
              </span>
            </div>
            <p className="text-sm mt-1 whitespace-pre-wrap break-words">
              <EmojiRenderer content={comment.content} emojiMap={emojiMap} />
            </p>

            {/* Image Embeds */}
            {(() => {
              const imageUrls = extractImageUrls(comment.content);
              if (imageUrls.length === 0) return null;
              return (
                <div className="mt-2 space-y-2">
                  {imageUrls.map((url, idx) => (
                    <ImageEmbed key={`${comment.id}-img-${idx}`} src={url} className="rounded-lg" size="small" />
                  ))}
                </div>
              );
            })()}

            {/* Actions */}
            <div className="flex items-center gap-4 mt-2">
              <button
                onClick={handleLike}
                className={cn(
                  "flex items-center gap-1 text-muted-foreground hover:text-red-500 transition-colors",
                  isLiked && "text-red-500"
                )}
              >
                <Heart size={14} className={cn(isLiked && "fill-current")} />
                <span className="text-xs">{likeCount > 0 && likeCount}</span>
              </button>

              <button
                onClick={onReply}
                className="flex items-center gap-1 text-muted-foreground hover:text-blue-500 transition-colors"
              >
                <MessageCircle size={14} />
                <span className="text-xs">Reply</span>
              </button>
            </div>
          </div>

          {/* Menu */}
          {(comment.isOwnComment || comment.isAdmin) && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0 -mr-2">
                  <MoreHorizontal size={14} />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem
                  onClick={() => setShowDeleteDialog(true)}
                  className="text-destructive focus:text-destructive"
                >
                  <Trash2 size={14} className="mr-2" />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>

      {/* Delete Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Comment?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
