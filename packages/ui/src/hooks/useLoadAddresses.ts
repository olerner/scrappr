import { useEffect, useState } from "react";
import { getAddresses } from "../api/client";
import type { Address } from "../data/types";
import { useStore } from "../store/useStore";

export function useLoadAddresses(accessToken: string | null) {
  const { addresses, addressesLoaded, setAddresses } = useStore();
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (addressesLoaded || !accessToken) return;
    setLoading(true);
    getAddresses(accessToken)
      .then((data) => {
        const mapped: Address[] = (data.addresses || []).map((item: Record<string, unknown>) => ({
          addressId: item.addressId as string,
          label: item.label as string,
          address: item.address as string,
          lat: item.lat as number,
          lng: item.lng as number,
          zipCode: item.zipCode as string,
          isDefault: item.isDefault as boolean,
          createdAt: item.createdAt as string,
        }));
        setAddresses(mapped);
      })
      .finally(() => setLoading(false));
  }, [accessToken, addressesLoaded, setAddresses]);

  return { addresses, loading };
}
