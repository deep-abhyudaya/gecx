"use server";

import prisma from "@/lib/prisma";
import { auth, currentUser } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";
import { recordKarmaEarned } from "./karma-tracking.actions";
import { getKarmaSettings } from "./karma-settings.actions";

const COMMENTS_PER_PAGE = 20;

// Helper to get or create community profile
async function getOrCreateCommunityProfile(userId: string) {
  const { sessionClaims } = auth();
  const clerkUser = await currentUser();
  const role = ((sessionClaims?.metadata as { role?: string })?.role || "student").toLowerCase();

  let profile = await prisma.userCommunityProfile.findUnique({
    where: { userId },
  });

  if (!profile) {
    const username = clerkUser?.username || `user_${userId.slice(-8)}`;
    const displayName = clerkUser?.fullName || clerkUser?.username || "User";

    profile = await prisma.userCommunityProfile.create({
      data: {
        userId,
        userType: role,
        username: username.toLowerCase(),
        displayName,
        avatar: clerkUser?.imageUrl || null,
      },
    });
  }

  return profile;
}

// Create a comment
export async function createComment(postId: string, content: string, parentId?: string) {
  const { userId } = auth();
  if (!userId) throw new Error("Unauthorized");

  const { sessionClaims } = auth();
  const role = ((sessionClaims?.metadata as { role?: string })?.role || "student").toLowerCase();

  const profile = await getOrCreateCommunityProfile(userId);

  // Verify post exists
  const post = await prisma.communityPost.findUnique({
    where: { id: postId, isDeleted: false },
  });

  if (!post) throw new Error("Post not found");

  // If parentId provided, verify parent comment exists
  if (parentId) {
    const parentComment = await prisma.communityComment.findUnique({
      where: { id: parentId, postId, isDeleted: false },
    });
    if (!parentComment) throw new Error("Parent comment not found");
  }

  const comment = await prisma.communityComment.create({
    data: {
      content: content.slice(0, 2000),
      authorId: userId,
      authorType: role,
      authorName: profile.displayName || profile.username,
      authorImage: profile.avatar,
      postId,
      parentId: parentId || null,
    },
  });

  // Update comment count on post
  await prisma.communityPost.update({
    where: { id: postId },
    data: { commentCount: { increment: 1 } },
  });

  // Award karma to comment creator
  const settings = await getKarmaSettings();
  await recordKarmaEarned(userId, settings.commentCreated, "comment_created");
  
  // Award karma to post author when someone comments on their post
  if (post.authorId !== userId) {
    await recordKarmaEarned(post.authorId, settings.commentReceived, "comment_received");
  }

  revalidatePath(`/community/post/${postId}`);
  revalidatePath("/community");

  return comment;
}

// Delete a comment
export async function deleteComment(commentId: string) {
  const { userId } = auth();
  if (!userId) throw new Error("Unauthorized");

  const comment = await prisma.communityComment.findUnique({
    where: { id: commentId },
    include: { post: true },
  });

  if (!comment) throw new Error("Comment not found");

  // Check if user is author or admin
  const { sessionClaims } = auth();
  const role = ((sessionClaims?.metadata as { role?: string })?.role || "").toLowerCase();

  if (comment.authorId !== userId && role !== "admin") {
    throw new Error("Unauthorized to delete this comment");
  }

  await prisma.communityComment.update({
    where: { id: commentId },
    data: { isDeleted: true },
  });

  // Decrement comment count on post
  await prisma.communityPost.update({
    where: { id: comment.postId },
    data: { commentCount: { decrement: 1 } },
  });

  revalidatePath(`/community/post/${comment.postId}`);
  revalidatePath("/community");
}

// Like/unlike a comment
export async function likeComment(commentId: string) {
  const { userId } = auth();
  if (!userId) throw new Error("Unauthorized");

  const existingLike = await prisma.communityCommentLike.findUnique({
    where: {
      commentId_userId: { commentId, userId },
    },
  });

  if (existingLike) {
    // Unlike
    await prisma.communityCommentLike.delete({
      where: { id: existingLike.id },
    });

    await prisma.communityComment.update({
      where: { id: commentId },
      data: { likeCount: { decrement: 1 } },
    });

    return { liked: false };
  } else {
    // Like
    await prisma.communityCommentLike.create({
      data: { commentId, userId },
    });

    await prisma.communityComment.update({
      where: { id: commentId },
      data: { likeCount: { increment: 1 } },
    });

    // Award karma to comment author when someone likes their comment
    const comment = await prisma.communityComment.findUnique({
      where: { id: commentId },
      select: { authorId: true },
    });
    if (comment && comment.authorId !== userId) {
      const settings = await getKarmaSettings();
      await recordKarmaEarned(comment.authorId, settings.likeReceived, "comment_like_received");
    }

    return { liked: true };
  }
}

// Get comments for a post with all nested replies
export async function getComments(postId: string, cursor?: string) {
  const { userId } = auth();

  // Load comments for the post (capped to avoid unbounded slow queries)
  const allComments = await prisma.communityComment.findMany({
    where: {
      postId,
      isDeleted: false,
    },
    take: 200,
    include: {
      likes: userId ? {
        where: { userId },
        select: { id: true },
      } : false,
      _count: {
        select: { replies: { where: { isDeleted: false } } },
      },
    },
    orderBy: { createdAt: "asc" }, // Oldest first for proper nesting
  });

  // Get unique author IDs to fetch current profile avatars
  const authorIds = [...new Set(allComments.map(c => c.authorId))];
  const authorProfiles = await prisma.userCommunityProfile.findMany({
    where: { userId: { in: authorIds } },
    select: { userId: true, avatar: true, customAvatar: true },
  });
  const avatarMap = new Map(authorProfiles.map(p => [p.userId, p.avatar]));
  const customAvatarMap = new Map(authorProfiles.map(p => [p.userId, p.customAvatar]));

  // Build nested tree structure
  const commentMap = new Map();
  const rootComments: any[] = [];

  // First pass: create map and clean up data, using current profile avatar
  allComments.forEach((comment) => {
    const cleanComment = {
      ...comment,
      // Use custom avatar if set, otherwise fall back to regular avatar or static authorImage
      authorImage: customAvatarMap.get(comment.authorId) || avatarMap.get(comment.authorId) || comment.authorImage,
      hasLiked: comment.likes && comment.likes.length > 0,
      likes: undefined,
      replyCount: comment._count.replies,
      _count: undefined,
      replies: [],
    };
    commentMap.set(comment.id, cleanComment);
  });

  // Second pass: build tree
  allComments.forEach((comment) => {
    const cleanComment = commentMap.get(comment.id);
    if (comment.parentId && commentMap.has(comment.parentId)) {
      // Add to parent's replies
      const parent = commentMap.get(comment.parentId);
      parent.replies.push(cleanComment);
    } else {
      // Top-level comment
      rootComments.push(cleanComment);
    }
  });

  // Sort root comments by date (newest first)
  rootComments.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  // Pagination for root comments only
  let hasMore = false;
  let paginatedRoots = rootComments;
  let nextCursor = null;

  if (cursor) {
    const cursorIndex = rootComments.findIndex((c) => c.id === cursor);
    if (cursorIndex !== -1) {
      paginatedRoots = rootComments.slice(cursorIndex + 1, cursorIndex + 1 + COMMENTS_PER_PAGE);
    } else {
      paginatedRoots = rootComments.slice(0, COMMENTS_PER_PAGE);
    }
  } else {
    paginatedRoots = rootComments.slice(0, COMMENTS_PER_PAGE);
  }

  if (rootComments.length > (cursor ? rootComments.findIndex((c) => c.id === cursor) + 1 + COMMENTS_PER_PAGE : COMMENTS_PER_PAGE)) {
    hasMore = true;
    nextCursor = paginatedRoots[paginatedRoots.length - 1]?.id || null;
  }

  return {
    comments: paginatedRoots,
    nextCursor,
    hasMore,
  };
}

// Get replies for a specific comment
export async function getReplies(commentId: string, cursor?: string) {
  const { userId } = auth();

  const replies = await prisma.communityComment.findMany({
    where: {
      parentId: commentId,
      isDeleted: false,
    },
    include: {
      likes: userId ? {
        where: { userId },
        select: { id: true },
      } : false,
    },
    orderBy: { createdAt: "asc" },
    take: COMMENTS_PER_PAGE + 1,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
  });

  let hasMore = false;
  if (replies.length > COMMENTS_PER_PAGE) {
    replies.pop();
    hasMore = true;
  }

  const nextCursor = hasMore && replies.length > 0 ? replies[replies.length - 1].id : null;

  return {
    replies: replies.map(reply => ({
      ...reply,
      hasLiked: reply.likes && reply.likes.length > 0,
      likes: undefined,
    })),
    nextCursor,
    hasMore,
  };
}
