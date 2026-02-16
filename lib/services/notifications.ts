import { clientApi } from '../api';

export interface Notification {
  id: number;
  type: string;
  post_id: number;
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
  const { data } = await clientApi.put(`/api/notifications/${id}/read`);
  return data;
}

export async function markAllNotificationsRead(): Promise<{ success: boolean }> {
  const { data } = await clientApi.put('/api/notifications/read-all');
  return data;
}
