export enum Provider {
  GOOGLE = 'google',
  APPLE = 'apple',
}

export enum DmPermission {
  NOBODY = 'nobody',
  MEMBERS = 'members',
  EVERYONE = 'everyone',
}

export enum AnchorType {
  ESTABLISHMENT = 'establishment',
  NEIGHBORHOOD = 'neighborhood',
  CONDO = 'condo',
  EVENT = 'event',
  CITY = 'city',
}

export enum GroupPrivacy {
  OPEN = 'open',
  APPROVAL_REQUIRED = 'approval_required',
}

export enum MemberRole {
  OWNER = 'owner',
  MODERATOR = 'moderator',
  MEMBER = 'member',
}

export enum MemberStatus {
  ACTIVE = 'active',
  PENDING = 'pending',
  BANNED = 'banned',
}

export enum MediaType {
  IMAGE = 'image',
  VIDEO = 'video',
}

export enum RequestStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  REJECTED = 'rejected',
}

export enum PushProvider {
  EXPO = 'expo',
}

export enum PushPermissionStatus {
  GRANTED = 'granted',
  DENIED = 'denied',
  DISABLED = 'disabled',
}

export enum DevicePlatform {
  IOS = 'ios',
  ANDROID = 'android',
}

export enum MessagePermission {
  ADMIN_ONLY = 'admin_only',
  MEMBERS_IN_RADIUS = 'members_in_radius',
  ALL_MEMBERS = 'all_members',
}

export const ChatSocketEvents = {
  JOIN_GROUP: 'join_group',
  LEAVE_GROUP: 'leave_group',
  SEND_MESSAGE: 'send_message',
  WATCH_PRESENCE: 'watch_presence',
  UNWATCH_PRESENCE: 'unwatch_presence',
  WATCH_GROUP_SUMMARIES: 'watch_group_summaries',
  UNWATCH_GROUP_SUMMARIES: 'unwatch_group_summaries',
  MARK_GROUP_READ: 'mark_group_read',
  JOIN_DM: 'join_dm',
  LEAVE_DM: 'leave_dm',
  SEND_DM: 'send_dm',
  NEW_MESSAGE: 'new_message',
  NEW_DIRECT_MESSAGE: 'new_direct_message',
  PRESENCE_UPDATE: 'presence_update',
  GROUP_SUMMARY_UPDATE: 'group_summary_update',
  ERROR: 'error',
} as const;

export type ChatSocketEvent =
  (typeof ChatSocketEvents)[keyof typeof ChatSocketEvents];

export interface NearbyGroup {
  id: string;
  name: string;
  description: string | null;
  anchorType: AnchorType;
  anchorLabel: string;
  distanceMeters: number;
  privacy: GroupPrivacy;
  memberCount: number;
  /** null unless the caller is an ACTIVE member of this group */
  myRole: MemberRole | null;
  /** null when the caller has no row in group_members; banned groups are never returned */
  memberStatus: MemberStatus | null;
}

export interface PresenceUpdate {
  groupId: string;
  count: number;
}

export interface MyGroupLastMessage {
  content: string | null;
  senderName: string;
  createdAt: string;
}

export interface MyGroup {
  id: string;
  name: string;
  anchorType: AnchorType;
  anchorLabel: string;
  memberCount: number;
  myRole: MemberRole;
  lastActivityAt: string;
  lastMessage: MyGroupLastMessage | null;
  lastReadAt: string | null;
  unreadCount: number;
}

export interface GroupSummaryUpdate {
  groupId: string;
  lastActivityAt: string;
  lastMessage: MyGroupLastMessage | null;
  lastReadAt: string | null;
  unreadCount: number;
}

export interface DirectMessage {
  id: string;
  senderId: string;
  senderName: string;
  senderAvatar: string | null;
  recipientId: string;
  content: string | null;
  mediaUrl: string | null;
  mediaType: MediaType | null;
  createdAt: string;
}

export interface UserSummary {
  id: string;
  displayName: string;
  avatarUrl: string | null;
  dmPermission: DmPermission;
  /** null means the app has not asked this user for notification permission yet. */
  pushPermissionStatus: PushPermissionStatus | null;
  provider: Provider;
  createdAt: string;
}
