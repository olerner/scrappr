const API_URL = import.meta.env.VITE_API_URL;

async function apiRequest(
  path: string,
  accessToken: string,
  options: RequestInit = {},
): Promise<Response> {
  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
      ...options.headers,
    },
  });
  return res;
}

export async function getPresignedUrl(
  accessToken: string,
  contentType: string,
): Promise<{ uploadUrl: string; photoUrl: string; key: string }> {
  const res = await apiRequest("/photos/presign", accessToken, {
    method: "POST",
    body: JSON.stringify({ contentType }),
  });
  if (!res.ok) throw new Error("Failed to get presigned URL");
  return res.json();
}

export async function uploadPhoto(uploadUrl: string, file: File): Promise<void> {
  const res = await fetch(uploadUrl, {
    method: "PUT",
    body: file,
    headers: { "Content-Type": file.type },
  });
  if (!res.ok) throw new Error("Failed to upload photo");
}

export interface CreateListingPayload {
  category: string;
  description: string;
  photoUrl: string;
  lat: number;
  lng: number;
  address: string;
  zipCode: string;
  estimatedValue: string;
}

export async function createListing(
  accessToken: string,
  payload: CreateListingPayload,
): Promise<Record<string, unknown>> {
  const res = await apiRequest("/listings", accessToken, {
    method: "POST",
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error("Failed to create listing");
  return res.json();
}

export async function getMyListings(
  accessToken: string,
): Promise<{ listings: Record<string, unknown>[] }> {
  const res = await apiRequest("/listings?mine=true", accessToken);
  if (!res.ok) throw new Error("Failed to fetch listings");
  return res.json();
}
