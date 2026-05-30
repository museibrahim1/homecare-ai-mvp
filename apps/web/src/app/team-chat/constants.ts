// Shared constants for the Team Chat page.

export const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
export const defaultChannels: { id: string; name: string; unread: number }[] = [];
export const defaultTeamMembers: { id: string; name: string; status: string; role: string; email?: string }[] = [];
