// Shared types for the Team Chat page.

export type Email = {
  id: string;
  from: string;
  fromEmail: string;
  subject: string;
  snippet: string;
  date: string;
  unread: boolean;
  starred: boolean;
  hasAttachment: boolean;
};

export type DmConversation = { id: string; memberId: string; memberName: string; memberAvatar: string; lastMessage?: string; lastTime?: string; unread: number };
