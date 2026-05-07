"use server";

import prisma from "@/lib/prisma";
import { auth, currentUser } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";
import { recordKarmaEarned } from "./karma-tracking.actions";
import { getKarmaSettings } from "./karma-settings.actions";

const POSTS_PER_PAGE = 20;

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

// Create a new post
export async function createPost(content: string) {
  const { userId } = auth();
  if (!userId) throw new Error("Unauthorized");

  const { sessionClaims } = auth();
  const clerkUser = await currentUser();
  const role = ((sessionClaims?.metadata as { role?: string })?.role || "student").toLowerCase();

  const profile = await getOrCreateCommunityProfile(userId);

  const post = await prisma.communityPost.create({
    data: {
      content: content.slice(0, 2000),
      authorId: userId,
      authorType: role,
      authorName: profile.displayName || profile.username,
      authorImage: profile.avatar,
    },
  });

  // Update post count using raw SQL
  await prisma.$executeRaw`
    UPDATE "UserCommunityProfile" 
    SET "postCount" = "postCount" + 1, "updatedAt" = NOW()
    WHERE "userId" = ${userId}
  `;

  // Award karma for creating a post (use configurable settings)
  const settings = await getKarmaSettings();
  await recordKarmaEarned(userId, settings.postCreated, "post_created");

  // Create notification for followers (optional, can be added later)

  revalidatePath("/community");
  return post;
}

// Delete a post
export async function deletePost(postId: string) {
  const { userId } = auth();
  if (!userId) throw new Error("Unauthorized");

  // Validate postId is provided and is a valid UUID format
  if (!postId || typeof postId !== "string" || postId.trim() === "") {
    throw new Error("Invalid post ID");
  }

  const post = await prisma.communityPost.findUnique({
    where: { id: postId },
  });

  if (!post) throw new Error("Post not found");

  // Check if user is author or admin
  const { sessionClaims } = auth();
  const role = ((sessionClaims?.metadata as { role?: string })?.role || "").toLowerCase();

  if (post.authorId !== userId && role !== "admin") {
    throw new Error("Unauthorized to delete this post");
  }

  // Use Prisma's built-in update instead of raw SQL for safety
  await prisma.communityPost.update({
    where: { id: postId },
    data: { isDeleted: true },
  });

  // Decrement post count using raw SQL only for the specific author
  await prisma.$executeRaw`
    UPDATE "UserCommunityProfile" 
    SET "postCount" = "postCount" - 1, "updatedAt" = NOW()
    WHERE "userId" = ${post.authorId}
  `;

  revalidatePath("/community");
  revalidatePath(`/${post.authorId}`);
}

// Repost a post
export async function repostPost(postId: string) {
  const { userId } = auth();
  if (!userId) throw new Error("Unauthorized");

  const originalPost = await prisma.communityPost.findUnique({
    where: { id: postId, isDeleted: false },
  });

  if (!originalPost) throw new Error("Post not found");

  const { sessionClaims } = auth();
  const role = ((sessionClaims?.metadata as { role?: string })?.role || "student").toLowerCase();

  const profile = await getOrCreateCommunityProfile(userId);

  const post = await prisma.communityPost.create({
    data: {
      content: "",
      authorId: userId,
      authorType: role,
      authorName: profile.displayName || profile.username,
      authorImage: profile.avatar,
      isRepost: true,
      originalPostId: postId,
    },
  });

  // Update repost count using raw SQL
  await prisma.$executeRaw`
    UPDATE "CommunityPost" 
    SET "repostCount" = "repostCount" + 1
    WHERE "id" = ${postId}
  `;

  // Update post count for reposter using raw SQL
  await prisma.$executeRaw`
    UPDATE "UserCommunityProfile" 
    SET "postCount" = "postCount" + 1, "updatedAt" = NOW()
    WHERE "userId" = ${userId}
  `;

  // Award karma to original post author when their post is reposted
  if (originalPost.authorId !== userId) {
    const settings = await getKarmaSettings();
    await recordKarmaEarned(originalPost.authorId, settings.repostReceived, "repost_received");
  }

  revalidatePath("/community");
  return post;
}

// Like a post
export async function likePost(postId: string) {
  const { userId } = auth();
  if (!userId) throw new Error("Unauthorized");

  const existingLike = await prisma.communityPostLike.findUnique({
    where: {
      postId_userId: { postId, userId },
    },
  });

  if (existingLike) {
    // Unlike
    await prisma.communityPostLike.delete({
      where: { id: existingLike.id },
    });

    await prisma.$executeRaw`
      UPDATE "CommunityPost" 
      SET "likeCount" = "likeCount" - 1
      WHERE "id" = ${postId}
    `;

    return { liked: false };
  } else {
    // Like
    await prisma.communityPostLike.create({
      data: { postId, userId },
    });

    await prisma.$executeRaw`
      UPDATE "CommunityPost" 
      SET "likeCount" = "likeCount" + 1
      WHERE "id" = ${postId}
    `;

    // Award karma to post author when someone likes their post
    const post = await prisma.communityPost.findUnique({
      where: { id: postId },
      select: { authorId: true },
    });
    if (post && post.authorId !== userId) {
      const settings = await getKarmaSettings();
      await recordKarmaEarned(post.authorId, settings.likeReceived, "like_received");
    }

    return { liked: true };
  }
}

// Get feed posts (chronological)
export async function getFeed(cursor?: string) {
  const { userId } = auth();

  const posts = await prisma.communityPost.findMany({
    where: {
      isDeleted: false,
      OR: [
        { isRepost: false },
        { isRepost: true, originalPost: { isDeleted: false } },
      ],
    },
    include: {
      originalPost: {
        include: {
          author: {
            select: {
              userId: true,
              username: true,
              displayName: true,
              avatar: true,
              customAvatar: true,
              karmaPoints: true,
            },
          },
        },
      },
      author: {
        select: {
          userId: true,
          username: true,
          isPrivate: true,
          karmaPoints: true,
          displayName: true,
          avatar: true,
          customAvatar: true,
        },
      },
      likes: userId ? {
        where: { userId },
        select: { id: true },
      } : false,
      // Include first 2 comments for preview
      comments: {
        where: { isDeleted: false, parentId: null },
        orderBy: { createdAt: "desc" },
        take: 2,
        select: {
          id: true,
          content: true,
          authorName: true,
          authorId: true,
          // Note: CommunityComment doesn't have author relation
          // author info is stored directly in authorName, authorId fields
        },
      },
      _count: {
        select: { comments: { where: { isDeleted: false } } },
      },
    },
    orderBy: { createdAt: "desc" },
    take: POSTS_PER_PAGE + 1,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
  });

  let hasMore = false;
  if (posts.length > POSTS_PER_PAGE) {
    posts.pop();
    hasMore = true;
  }

  const nextCursor = hasMore && posts.length > 0 ? posts[posts.length - 1].id : null;

  // Get unique author IDs to fetch karma and equipped colors in batch
  const authorIds = Array.from(new Set(posts.map(p => p.authorId)));
  const [karmaProfiles, equippedColorsData] = await Promise.all([
    prisma.userCommunityProfile.findMany({
      where: { userId: { in: authorIds } },
      select: { userId: true, karmaPoints: true },
    }),
    prisma.userEquippedColors.findMany({
      where: { userId: { in: authorIds } },
      include: {
        usernameColorItem: true,
        nameplateItem: true,
      },
    }),
  ]);
  const karmaMap = new Map(karmaProfiles.map((p: { userId: string; karmaPoints: number }) => [p.userId, p.karmaPoints]));
  const equippedColorMap = new Map(equippedColorsData.map((e: { userId: string; usernameColorItem: { colorValue: string } | null }) => [e.userId, e.usernameColorItem?.colorValue || null]));
  const nameplateMap = new Map(equippedColorsData.map((e: { userId: string; nameplateItem: { colorValue: string } | null }) => [e.userId, e.nameplateItem?.colorValue || null]));

  return {
    posts: posts.map(post => ({
      ...post,
      hasLiked: post.likes && post.likes.length > 0,
      likes: undefined,
      // Add karmaPoints and equippedColor to author
      author: {
        ...post.author,
        userId: post.authorId,
        karmaPoints: karmaMap.get(post.authorId) ?? 0,
        equippedColor: equippedColorMap.get(post.authorId) || null,
        equippedNameplate: nameplateMap.get(post.authorId) || null,
      },
      // Add karmaPoints and equippedColor to originalPost author if exists
      originalPost: post.originalPost ? {
        ...post.originalPost,
        author: post.originalPost.author ? {
          ...post.originalPost.author,
          userId: post.originalPost.authorId,
          karmaPoints: karmaMap.get(post.originalPost.authorId) ?? 0,
          equippedColor: equippedColorMap.get(post.originalPost.authorId) || null,
          equippedNameplate: nameplateMap.get(post.originalPost.authorId) || null,
        } : undefined,
      } : null,
      // Use actual comment count from _count
      commentCount: post._count.comments,
      // Format preview comments
      previewComments: post.comments.map(comment => ({
        id: comment.id,
        content: comment.content,
        authorName: comment.authorName || "Unknown",
        authorUsername: comment.authorId, // Use authorId as username fallback
      })),
      comments: undefined,
      _count: undefined,
    })),
    nextCursor,
    hasMore,
  };
}

// Get single post with comments
export async function getPost(postId: string) {
  const { userId } = auth();

  const post = await prisma.communityPost.findUnique({
    where: { id: postId, isDeleted: false },
    include: {
      originalPost: {
        include: {
          author: {
            select: {
              userId: true,
              username: true,
              displayName: true,
              avatar: true,
              customAvatar: true,
              karmaPoints: true,
            },
          },
        },
      },
      author: {
        select: {
          userId: true,
          username: true,
          isPrivate: true,
          karmaPoints: true,
          displayName: true,
          avatar: true,
              customAvatar: true,
            },
          },
      likes: userId ? {
        where: { userId },
        select: { id: true },
      } : false,
    },
  });

  if (!post) return null;

  // Fetch equipped colors
  const authorIds = Array.from(new Set([post.authorId, post.originalPost?.authorId].filter(Boolean) as string[]));
  const equippedColorsData = await prisma.userEquippedColors.findMany({
    where: { userId: { in: authorIds } },
    include: { usernameColorItem: true, nameplateItem: true },
  });
  const colorMap = new Map(equippedColorsData.map((e: any) => [e.userId, e.usernameColorItem?.colorValue || null]));
  const nameplateMap = new Map(equippedColorsData.map((e: any) => [e.userId, e.nameplateItem?.colorValue || null]));

  return {
    ...post,
    author: {
      ...post.author,
      userId: post.authorId,
      equippedColor: colorMap.get(post.authorId) || null,
      equippedNameplate: nameplateMap.get(post.authorId) || null,
    },
    originalPost: post.originalPost ? {
      ...post.originalPost,
      author: post.originalPost.author ? {
        ...post.originalPost.author,
        userId: post.originalPost.authorId,
        equippedColor: colorMap.get(post.originalPost.authorId) || null,
        equippedNameplate: nameplateMap.get(post.originalPost.authorId) || null,
      } : undefined,
    } : null,
    hasLiked: post.likes && post.likes.length > 0,
    likes: undefined,
  };
}

// Get posts by user
export async function getUserPosts(username: string, cursor?: string) {
  // Use raw query to bypass PostgreSQL cached plan issue after schema changes
  const profiles = await prisma.$queryRaw`
    SELECT * FROM "UserCommunityProfile" 
    WHERE LOWER(username) = LOWER(${username})
    LIMIT 1
  `;
  const profile = (profiles as any[])[0] || null;

  if (!profile) return { posts: [], nextCursor: null, hasMore: false };

  const { userId } = auth();

  // Check if private and not followed
  if (profile.isPrivate && userId !== profile.userId) {
    const isFollowing = await prisma.communityFollow.findUnique({
      where: {
        followerId_followingId: { followerId: userId || "", followingId: profile.userId },
      },
    });
    if (!isFollowing) return { posts: [], nextCursor: null, hasMore: false, isPrivate: true };
  }

  const posts = await prisma.communityPost.findMany({
    where: {
      authorId: profile.userId,
      isDeleted: false,
      OR: [
        { isRepost: false },
        { isRepost: true, originalPost: { isDeleted: false } },
      ],
    },
    include: {
      originalPost: {
        include: {
          author: {
            select: {
              userId: true,
              username: true,
              displayName: true,
              avatar: true,
              customAvatar: true,
              karmaPoints: true,
            },
          },
        },
      },
      likes: userId ? {
        where: { userId },
        select: { id: true },
      } : false,
    },
    orderBy: { createdAt: "desc" },
    take: POSTS_PER_PAGE + 1,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
  });

  let hasMore = false;
  if (posts.length > POSTS_PER_PAGE) {
    posts.pop();
    hasMore = true;
  }

  const nextCursor = hasMore && posts.length > 0 ? posts[posts.length - 1].id : null;

  // Collect all unique user IDs we need colors for (profile user + original post authors)
  const originalAuthorIds = posts
    .filter(p => p.originalPost?.authorId)
    .map(p => p.originalPost!.authorId as string);
  const allUserIds = Array.from(new Set([profile.userId, ...originalAuthorIds]));

  const equippedColorsData = await prisma.userEquippedColors.findMany({
    where: { userId: { in: allUserIds } },
    include: { usernameColorItem: true, nameplateItem: true },
  });
  const colorMap = new Map(equippedColorsData.map((e: { userId: string; usernameColorItem: { colorValue: string } | null }) => [e.userId, e.usernameColorItem?.colorValue || null]));
  const nameplateMap = new Map(equippedColorsData.map((e: { userId: string; nameplateItem: { colorValue: string } | null }) => [e.userId, e.nameplateItem?.colorValue || null]));

  // Author info for the profile owner
  const authorInfo = {
    userId: profile.userId,
    username: profile.username,
    displayName: profile.displayName,
    avatar: profile.avatar,
    customAvatar: profile.customAvatar,
    karmaPoints: profile.karmaPoints,
    equippedColor: colorMap.get(profile.userId) || null,
    equippedNameplate: nameplateMap.get(profile.userId) || null,
  };

  return {
    posts: posts.map(post => ({
      ...post,
      author: authorInfo,
      hasLiked: post.likes && post.likes.length > 0,
      likes: undefined,
      originalPost: post.originalPost ? {
        ...post.originalPost,
        author: post.originalPost.author ? {
          ...post.originalPost.author,
          userId: post.originalPost.authorId,
          equippedColor: colorMap.get(post.originalPost.authorId) || null,
          equippedNameplate: nameplateMap.get(post.originalPost.authorId) || null,
        } : undefined,
      } : null,
    })),
    nextCursor,
    hasMore,
  };
}
