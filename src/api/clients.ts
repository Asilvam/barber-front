import { apiClient } from "./client";
export interface BookingAccessEvent {
  blocked: boolean;
  reason: string;
  actorId: string;
  actorName: string;
  at: string;
}
export interface Client {
  _id: string;
  name: string;
  email: string;
  createdAt?: string;
  isBookingBlocked?: boolean;
  bookingAccessHistory?: BookingAccessEvent[];
}
export async function fetchClients(): Promise<Client[]> {
  const { data } = await apiClient.get<Client[]>("/clients");
  return data;
}
export async function setBookingAccess(
  id: string,
  blocked: boolean,
  reason: string,
): Promise<Client> {
  const { data } = await apiClient.patch<Client>(
    `/clients/${id}/booking-access`,
    { blocked, reason },
  );
  return data;
}
