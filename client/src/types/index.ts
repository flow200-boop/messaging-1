export type StatusState = 'online' | 'away' | 'busy' | 'offline';

export interface User {
  id: string;
  username: string;
  displayName: string;
  email: string;
  avatarUrl: string;
  statusText?: string;
  statusState?: StatusState;
  lastSeenAt?: string;
  createdAt?: string;
}

export interface ReactionSummary {
  emoji: string;
  count: number;
  users: { id: string; name: string }[];
  hasReacted: boolean;
}

export interface ReplyToPreview {
  id: string;
  content: string;
  senderId: string;
  senderDisplayName: string;
  messageType?: 'text' | 'image' | 'audio' | 'file';
}

export interface Message {
  id: string;
  channelId: string;
  senderId: string;
  senderUsername?: string;
  senderDisplayName?: string;
  senderAvatar?: string;
  senderStatus?: StatusState;
  replyToId?: string | null;
  replyTo?: ReplyToPreview | null;
  content: string;
  messageType: 'text' | 'image' | 'audio' | 'file';
  fileUrl?: string | null;
  fileName?: string | null;
  fileSize?: number | null;
  isEdited: number;
  isPinned: number;
  reactions: ReactionSummary[];
  createdAt: string;
  updatedAt?: string;
}

export interface ChannelMember extends User {
  role?: string;
}

export interface Channel {
  id: string;
  name: string;
  isGroup: number; // 1 = group, 0 = dm
  isPrivate: number;
  description?: string;
  avatarUrl?: string | null;
  createdBy: string;
  createdAt: string;
  userRole?: string;
  lastReadAt?: string;
  unreadCount?: number;
  lastMessage?: {
    id: string;
    content: string;
    messageType: string;
    fileName?: string;
    createdAt: string;
    senderId: string;
    senderName: string;
  } | null;
  dmRecipient?: User | null;
  memberCount?: number;
  members?: ChannelMember[];
  pinnedMessages?: Message[];
}

export type CallType = 'audio' | 'video';
export type CallStatus = 'idle' | 'calling' | 'incoming' | 'connected' | 'ended';

export interface ActiveCall {
  channelId?: string;
  partner: {
    id: string;
    displayName: string;
    avatarUrl: string;
  };
  callType: CallType;
  status: CallStatus;
  isIncoming: boolean;
  startTime?: number;
  isMuted: boolean;
  isCameraOff: boolean;
  isScreenSharing: boolean;
}

export type ThemeMode = 'dark' | 'light' | 'midnight' | 'emerald';
