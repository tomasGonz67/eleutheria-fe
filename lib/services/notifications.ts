import { clientApi } from '../api';

export interface Notification {
  id: number;
  type: string;
  post_id: number;
  parent_post_id: number;
  forum_id: number;
  from_username: string;
  from_discriminator: string;
  content_preview: string;
  is_read: boolean;
  created_at: string;
}

export async function getNotifications(): Promise<{ notifications: Notification[] }> {
  const { data } = await clientApi.get('/api/notifications');
  return data;
}

export async function markNotificationRead(id: number): Promise<{ success: boolean }> {
  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
  const res = await fetch(`${API_URL}/api/notifications/${id}/read`, {
    method: 'PUT',
    credentials: 'include',
    keepalive: true,
  });
  return res.json();
}

export async function markAllNotificationsRead(): Promise<{ success: boolean }> {
  const { data } = await clientApi.put('/api/notifications/read-all');
  return data;
}

export async function markAllNotificationsSeen(): Promise<{ success: boolean }> {
  const { data } = await clientApi.put('/api/notifications/seen-all');
  return data;
}
