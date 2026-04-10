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
): Promise<{ uploadUrl: string; fields: Record<string, string>; photoUrl: string; key: string }> {
  const res = await apiRequest("/photos/presign", accessToken, {
    method: "POST",
    body: JSON.stringify({ contentType }),
  });
  if (!res.ok) throw new Error("Failed to get presigned URL");
  return res.json();
}

export async function uploadPhoto(
  uploadUrl: string,
  file: File,
  fields: Record<string, string>,
): Promise<void> {
  const formData = new FormData();
  for (const [k, v] of Object.entries(fields)) {
    formData.append(k, v);
  }
  formData.append("file", file); // must be last per S3 presigned POST spec
  const res = await fetch(uploadUrl, { method: "POST", body: formData });
  if (!res.ok) throw new Error("Failed to upload photo");
}

interface CreateListingPayload {
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

interface UpdateListingPayload {
  category?: string;
  description?: string;
  photoUrl?: string;
  lat?: number;
  lng?: number;
  address?: string;
  zipCode?: string;
  estimatedValue?: string;
}

export async function updateListing(
  accessToken: string,
  listingId: string,
  payload: UpdateListingPayload,
): Promise<void> {
  const res = await apiRequest(`/listings/${listingId}`, accessToken, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error((data as { error?: string }).error || "Failed to update listing");
  }
}

export async function getMyListings(
  accessToken: string,
): Promise<{ listings: Record<string, unknown>[] }> {
  const res = await apiRequest("/listings?mine=true", accessToken);
  if (!res.ok) throw new Error("Failed to fetch listings");
  return res.json();
}

// ── Addresses ────────────────────────────────────────────────────────────

interface CreateAddressPayload {
  label: string;
  address: string;
  lat: number;
  lng: number;
  zipCode: string;
  isDefault?: boolean;
}

interface UpdateAddressPayload {
  label?: string;
  address?: string;
  lat?: number;
  lng?: number;
  zipCode?: string;
  isDefault?: boolean;
}

export async function getAddresses(
  accessToken: string,
): Promise<{ addresses: Record<string, unknown>[] }> {
  const res = await apiRequest("/addresses", accessToken);
  if (!res.ok) throw new Error("Failed to fetch addresses");
  return res.json();
}

export async function createAddress(
  accessToken: string,
  payload: CreateAddressPayload,
): Promise<Record<string, unknown>> {
  const res = await apiRequest("/addresses", accessToken, {
    method: "POST",
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error("Failed to create address");
  return res.json();
}

export async function updateAddress(
  accessToken: string,
  addressId: string,
  payload: UpdateAddressPayload,
): Promise<void> {
  const res = await apiRequest(`/addresses/${addressId}`, accessToken, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error("Failed to update address");
}

export async function deleteAddress(accessToken: string, addressId: string): Promise<void> {
  const res = await apiRequest(`/addresses/${addressId}`, accessToken, {
    method: "DELETE",
  });
  if (!res.ok) throw new Error("Failed to delete address");
}

export async function deleteListing(accessToken: string, listingId: string): Promise<void> {
  const res = await apiRequest(`/listings/${listingId}`, accessToken, {
    method: "DELETE",
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error((data as { error?: string }).error || "Failed to delete listing");
  }
}

export async function browseListings(
  accessToken: string,
  category?: string,
  cursor?: string,
): Promise<{ listings: Record<string, unknown>[]; nextCursor: string | null }> {
  const params = new URLSearchParams();
  if (category) params.set("category", category);
  if (cursor) params.set("cursor", cursor);
  const qs = params.toString() ? `?${params.toString()}` : "";
  const res = await apiRequest(`/listings/available${qs}`, accessToken);
  if (!res.ok) throw new Error("Failed to browse listings");
  return res.json();
}

export async function claimListing(accessToken: string, listingId: string): Promise<void> {
  const res = await apiRequest(`/listings/${listingId}/claim`, accessToken, {
    method: "POST",
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error((data as { error?: string }).error || "Failed to claim listing");
  }
}

export async function unclaimListing(accessToken: string, listingId: string): Promise<void> {
  const res = await apiRequest(`/listings/${listingId}/unclaim`, accessToken, {
    method: "POST",
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error((data as { error?: string }).error || "Failed to unclaim listing");
  }
}

export async function getClaimedListings(
  accessToken: string,
): Promise<{ listings: Record<string, unknown>[] }> {
  const res = await apiRequest("/listings/claimed", accessToken);
  if (!res.ok) throw new Error("Failed to fetch claimed listings");
  return res.json();
}

export async function completeListing(accessToken: string, listingId: string): Promise<void> {
  const res = await apiRequest(`/listings/${listingId}/complete`, accessToken, {
    method: "POST",
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error((data as { error?: string }).error || "Failed to complete listing");
  }
}
