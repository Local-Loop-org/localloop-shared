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

export type PushConversationKey = `group:${string}` | `dm:${string}`;

export interface GroupMessagePushNotificationData {
  type: 'group_message';
  conversationKey: `group:${string}`;
  groupId: string;
  groupName: string;
  anchorType: AnchorType;
  messageId: string;
  senderId: string;
  senderName: string;
  senderAvatarUrl: string | null;
}

export interface DirectMessagePushNotificationData {
  type: 'direct_message';
  conversationKey: `dm:${string}`;
  peerId: string;
  peerName: string;
  peerAvatarUrl: string | null;
  messageId: string;
}

export type ChatPushNotificationData =
  | GroupMessagePushNotificationData
  | DirectMessagePushNotificationData;

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
  WATCH_DM_PRESENCE: 'watch_dm_presence',
  UNWATCH_DM_PRESENCE: 'unwatch_dm_presence',
  WATCH_DM_INBOX: 'watch_dm_inbox',
  UNWATCH_DM_INBOX: 'unwatch_dm_inbox',
  MARK_DM_READ: 'mark_dm_read',
  NEW_MESSAGE: 'new_message',
  NEW_DIRECT_MESSAGE: 'new_direct_message',
  MESSAGE_DELETED: 'message_deleted',
  DIRECT_MESSAGE_DELETED: 'direct_message_deleted',
  DM_PRESENCE_UPDATE: 'dm_presence_update',
  DM_READ_RECEIPT: 'dm_read_receipt',
  DM_REQUEST_SENT: 'dm_request_sent',
  DM_REQUEST_ACCEPTED: 'dm_request_accepted',
  PRESENCE_UPDATE: 'presence_update',
  GROUP_SUMMARY_UPDATE: 'group_summary_update',
  DM_SUMMARY_UPDATE: 'dm_summary_update',
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

export interface DmPresenceUpdate {
  peerId: string;
  online: boolean;
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

export interface ChatMessageReplyTo {
  id: string;
  authorId: string;
  snippet: string | null;
  isDeleted: boolean;
}

export interface ChatMessage {
  id: string;
  senderId: string;
  senderName: string;
  senderAvatarUrl: string | null;
  content: string | null;
  mediaUrl: string | null;
  mediaType: MediaType | null;
  createdAt: string;
  replyTo: ChatMessageReplyTo | null;
  isDeleted: boolean;
  editedAt: string | null;
}

export type GroupMessage = ChatMessage;

export interface GroupMessageHistoryResponse {
  data: GroupMessage[];
  next_cursor: string | null;
}

export type DirectMessage = ChatMessage & {
  recipientId: string;
};

export type DirectMessageStatus = 'sending' | 'sent' | 'read' | 'error';

export type DirectMessageWithStatus = DirectMessage & {
  status: DirectMessageStatus;
};

export interface DirectMessageHistoryResponse {
  data: DirectMessage[];
  lastReadAt: string | null;
  peerLastReadAt: string | null;
  next_cursor: string | null;
}

export interface DmReadReceipt {
  readerId: string;
  peerId: string;
  lastReadAt: string;
}

export interface MessageDeleted {
  messageId: string;
  groupId: string;
  deletedBy: string;
}

export interface DirectMessageDeleted {
  messageId: string;
  senderId: string;
  recipientId: string;
  deletedBy: string;
}

export interface DmLastMessage {
  content: string | null;
  senderName: string;
  createdAt: string;
}

export interface DmSummaryUpdate {
  peerId: string;
  lastActivityAt: string;
  lastMessage: DmLastMessage | null;
  lastReadAt: string | null;
  unreadCount: number;
  archived: boolean;
}

export interface DmExceptionCandidate {
  userId: string;
  displayName: string;
  avatarUrl: string | null;
}

export interface ListDmExceptionCandidatesResponse {
  data: DmExceptionCandidate[];
  next_cursor: string | null;
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
