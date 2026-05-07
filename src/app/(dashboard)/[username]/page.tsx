import { auth, currentUser } from "@clerk/nextjs/server";
import { notFound } from "next/navigation";
import { getCommunityProfile } from "@/actions/community-profile.actions";
import { getUserPosts } from "@/actions/community.actions";
import { getEquippedColors } from "@/actions/color-shop.actions";
import { getPendingFollowRequest } from "@/actions/follow-request.actions";
import { checkDMAccess, getPendingDMRequest } from "@/actions/dm-access.actions";
import { PostCard } from "@/components/community/PostCard";
import { KarmaBreakdown } from "@/components/community/KarmaBreakdown";
import { FollowButton } from "@/components/follow-button";
import { DMRequestButton } from "@/components/dm-request-button";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, Lock, Users, FileText, Trophy, Settings, MessageCircle } from "lucide-react";
import { getKarmaTierGradient, getKarmaTier, getKarmaTierColor, getKarmaTierTextGradientStyle } from "@/lib/karma-tiers";
import { isLightColor } from "@/lib/color-catalog";
import { CustomAvatar } from "@/components/CustomAvatar";

interface ProfilePageProps {
  params: { username: string };
}

export async function generateMetadata({ params }: ProfilePageProps): Promise<Metadata> {
  const profile = await getCommunityProfile(params.username);
  return {
    title: profile ? `${profile.displayName || profile.username} | gecX` : "Profile | gecX",
    description: profile?.bio || `View ${params.username}'s profile on gecX`,
  };
}

export default async function CommunityProfilePage({ params }: ProfilePageProps) {
  const clerkUser = await currentUser();
  const { sessionClaims } = auth();
  const role = ((sessionClaims?.metadata as { role?: string })?.role || "student").toLowerCase();
  const isAdmin = role === "admin";

  const profile = await getCommunityProfile(params.username);
  if (!profile) {
    notFound();
  }

  const { posts, isPrivate: isPrivateAccount } = await getUserPosts(params.username);

  // Get equipped colors for this user
  const equippedColors = await getEquippedColors(profile.userId);

  const isOwnProfile = clerkUser?.id === profile.userId;
  const tier = getKarmaTier(profile.karmaPoints);

  const bgIsLight = equippedColors.profileBgColor ? isLightColor(equippedColors.profileBgColor) : false;

  // Text color utilities to apply throughout the profile based on profile bg
  const textClass = bgIsLight ? "text-gray-900" : equippedColors.profileBgColor ? "text-gray-100" : "";
  const mutedClass = bgIsLight ? "text-gray-500" : equippedColors.profileBgColor ? "text-gray-400" : "text-muted-foreground";
  const cardBgClass = bgIsLight ? "bg-white/70" : equippedColors.profileBgColor ? "bg-black/30" : "bg-muted/50";
  const cardTextClass = bgIsLight ? "text-gray-900" : equippedColors.profileBgColor ? "text-gray-100" : "";
  const borderClass = bgIsLight ? "border-black/10" : equippedColors.profileBgColor ? "border-white/10" : "border-border";
  const headerBgClass = bgIsLight ? "bg-white/90" : equippedColors.profileBgColor ? "bg-black/30" : "bg-background/95";


  // Get effective avatar URL (custom avatar takes priority over Clerk)
  const effectiveAvatar = profile.customAvatar || profile.avatar || "/noAvatar.png";

  // Use equipped profile background color if available, otherwise use karma gradient
  const bgStyle: React.CSSProperties = equippedColors.profileBgColor
    ? { backgroundColor: equippedColors.profileBgColor }
    : tier
      ? {
          background: `linear-gradient(135deg, ${tier.colorHex}40 0%, ${tier.colorHex}20 50%, ${tier.colorHex}30 100%)`,
        }
      : {};

  // Determine username color style
  const usernameStyle = equippedColors.usernameColor
    ? { color: equippedColors.usernameColor }
    : getKarmaTierTextGradientStyle(profile.karmaPoints) || { color: getKarmaTierColor(profile.karmaPoints) || undefined };

  return (
    <div className={`flex-1 flex flex-col w-full relative ${textClass}`} style={bgStyle}>
      {/* Header */}
      <div className={`sticky top-0 z-10 ${headerBgClass} backdrop-blur border-b ${borderClass}`}>
        <div className="px-4 py-3 flex items-center gap-4 max-w-2xl mx-auto">
          <Link
            href="/community"
            className={`p-2 hover:bg-black/10 rounded-full transition-colors`}
          >
            <ArrowLeft size={20} className={textClass} />
          </Link>
          <div>
            <h1 className={`text-lg font-semibold leading-tight ${textClass}`}>
              {profile.displayName || profile.username}
            </h1>
            <p className={`text-xs ${mutedClass}`}>
              {profile.postCount} posts
            </p>
          </div>
        </div>
      </div>

      {/* Content Container */}
      <div className="flex-1 max-w-2xl mx-auto w-full">
      {/* Banner - shown if set */}
      {profile.bannerUrl && (
        <div className="w-full sm:rounded-t-xl overflow-hidden">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={profile.bannerUrl}
            alt="Profile banner"
            className="w-full aspect-[2.5/1] sm:aspect-[3/1] object-cover"
          />
        </div>
      )}

      {/* Profile Info */}
      <div className={`px-4 pb-6 pt-4 border-b ${borderClass}`}>
        <div className="flex items-start justify-between">
          <div className="relative">
            {profile.customAvatar ? (
              /* Custom Avatar with GIF support */
              <div className={`w-24 h-24 sm:w-28 sm:h-28 rounded-full overflow-hidden border-[6px] ${bgIsLight ? "border-white" : equippedColors.profileBgColor ? "border-transparent" : "border-background"} bg-background ${profile.bannerUrl ? "-mt-14 sm:-mt-16" : ""}`} style={equippedColors.profileBgColor ? { borderColor: equippedColors.profileBgColor } : {}}>
                <CustomAvatar
                  src={effectiveAvatar}
                  alt={profile.username}
                  className="w-full h-full object-cover"
                />
              </div>
            ) : (
              /* Default Avatar with Next.js Image optimization */
              <Avatar className={`w-24 h-24 sm:w-28 sm:h-28 border-[6px] ${bgIsLight ? "border-white" : equippedColors.profileBgColor ? "border-transparent" : "border-background"} ${profile.bannerUrl ? "-mt-14 sm:-mt-16" : ""}`} style={equippedColors.profileBgColor ? { borderColor: equippedColors.profileBgColor } : {}}>
                <AvatarImage src={effectiveAvatar} alt={profile.username} />
                <AvatarFallback>{profile.username[0]?.toUpperCase()}</AvatarFallback>
              </Avatar>
            )}
          </div>

          {isOwnProfile ? (
            <Link href="/settings/community">
              {equippedColors.profileBgColor ? (
                <button
                  style={
                    bgIsLight
                      ? { backgroundColor: "rgba(0,0,0,0.08)", border: "1px solid rgba(0,0,0,0.18)", color: "#1a1a1a" }
                      : { backgroundColor: "rgba(255,255,255,0.12)", border: "1px solid rgba(255,255,255,0.25)", color: "#f1f1f1" }
                  }
                  className="inline-flex items-center gap-2 rounded-md text-sm font-medium h-9 px-3 transition-opacity hover:opacity-80"
                >
                  <Settings size={14} />
                  Edit Profile
                </button>
              ) : (
                <Button variant="outline" size="sm" className="gap-2">
                  <Settings size={14} />
                  Edit Profile
                </Button>
              )}
            </Link>
          ) : (
            <div className="flex items-center gap-2">
              <FollowButton
                targetUserId={profile.userId}
                initialIsFollowing={profile.isFollowing}
                username={profile.username}
                isPrivate={profile.isPrivate || profile.requireFollowApproval}
                bgIsLight={bgIsLight}
                hasCustomBg={!!equippedColors.profileBgColor}
              />
              <DMRequestButton
                targetUserId={profile.userId}
                username={profile.username}
                bgIsLight={bgIsLight}
                hasCustomBg={!!equippedColors.profileBgColor}
                isPublic={!profile.isPrivate && !profile.requireFollowApproval}
              />
            </div>
          )}
        </div>

        <div className="mt-4">
          <h2 className="text-xl font-bold" style={usernameStyle}>
            {profile.displayName || profile.username}
            {profile.isPrivate && (
              <Lock size={14} className={`inline ml-2 ${mutedClass}`} />
            )}
          </h2>
          <p className={mutedClass} style={equippedColors.usernameColor ? { color: equippedColors.usernameColor, opacity: 0.7 } : undefined}>@{profile.username}</p>

          {profile.bio && (
            <p className={`mt-3 text-sm whitespace-pre-wrap ${textClass}`}>{profile.bio}</p>
          )}

          {/* View Academic Profile Button */}
          {(profile.canViewAcademic || isOwnProfile) && (
            <Link href={`/profile?id=${profile.userId}`} className="inline-block mt-3">
              {equippedColors.profileBgColor ? (
                <button
                  style={
                    bgIsLight
                      ? { backgroundColor: "rgba(0,0,0,0.08)", border: "1px solid rgba(0,0,0,0.18)", color: "#1a1a1a" }
                      : { backgroundColor: "rgba(255,255,255,0.12)", border: "1px solid rgba(255,255,255,0.25)", color: "#f1f1f1" }
                  }
                  className="inline-flex items-center gap-2 rounded-md text-sm font-medium h-9 px-3 transition-opacity hover:opacity-80"
                >
                  <span className="text-lg">🎓</span>
                  View Academic Profile
                </button>
              ) : (
                <Button variant="outline" size="sm" className="gap-2">
                  <span className="text-lg">🎓</span>
                  View Academic Profile
                </Button>
              )}
            </Link>
          )}

          {/* Karma Breakdown */}
          {profile.karmaPoints > 0 && (
            <KarmaBreakdown
              userId={profile.userId}
              initialData={{
                today: 0,
                week: 0,
                month: 0,
                total: profile.karmaPoints,
              }}
              cardBgClass={cardBgClass}
              cardTextClass={cardTextClass}
              mutedClass={mutedClass}
              borderClass={borderClass}
            />
          )}

          {/* Stats */}
          <div className="flex items-center gap-6 mt-4">
            <div className="cursor-default">
              <span className={`font-semibold ${textClass}`}>{profile.postCount}</span>
              <span className={`${mutedClass} ml-1`}>posts</span>
            </div>
            
            {profile.isPrivate && !profile.isFollowing && !isOwnProfile ? (
              <div className="cursor-default flex items-center gap-1">
                <span className={`font-semibold ${textClass}`}>{profile.followingCount}</span>
                <span className={`${mutedClass} ml-1`}>following</span>
                <Lock size={12} className={`${mutedClass} ml-0.5`} />
              </div>
            ) : (
              <Link href={`/${profile.username}/following`} className="hover:underline">
                <span className={`font-semibold ${textClass}`}>{profile.followingCount}</span>
                <span className={`${mutedClass} ml-1`}>following</span>
              </Link>
            )}
            
            {profile.isPrivate && !profile.isFollowing && !isOwnProfile ? (
              <div className="cursor-default flex items-center gap-1">
                <span className={`font-semibold ${textClass}`}>{profile.followerCount}</span>
                <span className={`${mutedClass} ml-1`}>followers</span>
                <Lock size={12} className={`${mutedClass} ml-0.5`} />
              </div>
            ) : (
              <Link href={`/${profile.username}/followers`} className="hover:underline">
                <span className={`font-semibold ${textClass}`}>{profile.followerCount}</span>
                <span className={`${mutedClass} ml-1`}>followers</span>
              </Link>
            )}
            
            {profile.karmaPoints > 0 && (
              <Link href="/leaderboard" className="flex items-center gap-1 hover:opacity-80 transition-opacity" title="View Leaderboard">
                <Trophy size={14} className="text-yellow-500" />
                <span className={`font-semibold ${textClass}`}>{profile.karmaPoints.toLocaleString()}</span>
                <span className={mutedClass}>Karma</span>
              </Link>
            )}
          </div>
        </div>
      </div>

      {/* Posts */}
      <div>
        {isPrivateAccount && !profile.isFollowing && !isOwnProfile ? (
          <div className="text-center py-12 px-4">
            <Lock size={48} className={`mx-auto ${mutedClass} mb-4`} />
            <h3 className={`font-semibold text-lg ${textClass}`}>This account is private</h3>
            <p className={`${mutedClass} mt-1`}>
              Follow @{profile.username} to see their posts
            </p>
          </div>
        ) : posts.length === 0 ? (
          <div className={`text-center py-12 ${mutedClass}`}>
            <FileText size={48} className="mx-auto mb-4" />
            <p>No posts yet</p>
            {isOwnProfile && <p className="mt-1">Share your first post with the community!</p>}
          </div>
        ) : (
          posts.map((post) => (
            <PostCard
              key={post.id}
              post={{
                ...post,
                author: {
                  userId: profile.userId,
                  username: profile.username,
                  displayName: profile.displayName,
                  avatar: profile.avatar,
                  customAvatar: profile.customAvatar,
                  karmaPoints: profile.karmaPoints,
                  equippedColor: equippedColors.usernameColor || null,
                  equippedNameplate: equippedColors.nameplateBg || null,
                },
                originalPost: post.originalPost ? {
                  ...post.originalPost,
                  authorImage: post.originalPost.author?.avatar || null,
                  authorId: (post.originalPost.author as any)?.userId || "",
                  author: {
                    userId: (post.originalPost.author as any)?.userId || "",
                    username: post.originalPost.author?.username || "unknown",
                    displayName: post.originalPost.author?.displayName,
                    avatar: post.originalPost.author?.avatar,
                    customAvatar: (post.originalPost.author as any)?.customAvatar || null,
                    karmaPoints: post.originalPost.author?.karmaPoints || 0,
                    equippedColor: (post.originalPost.author as any)?.equippedColor || null,
                    equippedNameplate: (post.originalPost.author as any)?.equippedNameplate || null,
                  },
                } : null,
                isOwnPost: post.authorId === clerkUser?.id,
                isAdmin,
              }}
              bgIsLight={bgIsLight}
              hasCustomBg={!!equippedColors.profileBgColor}
            />
          ))
        )}
      </div>
      </div>
    </div>
  );
}
