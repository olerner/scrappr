import { useEffect, useState } from "react";
import { getAddresses } from "../api/client";
import { useStore } from "../store/useStore";

export function useLoadAddresses(accessToken: string | null) {
  const { addresses, addressesLoaded, setAddresses } = useStore();
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (addressesLoaded || !accessToken) return;
    setLoading(true);
    getAddresses(accessToken)
      .then((data) => {
        setAddresses(data.addresses || []);
      })
      .finally(() => setLoading(false));
  }, [accessToken, addressesLoaded, setAddresses]);

  return { addresses, loading };
}
