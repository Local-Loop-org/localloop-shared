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

export interface NearbyGroup {
  id: string;
  name: string;
  description: string | null;
  anchorType: AnchorType;
  anchorLabel: string;
  distanceMeters: number;
  privacy: GroupPrivacy;
  memberCount: number;
}
