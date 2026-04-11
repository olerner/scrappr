import { useEffect, useState } from "react";
import { getProfile } from "../api/client";
import { useStore } from "../store/useStore";

export function useLoadProfile(accessToken: string | null) {
  const { profile, profileLoaded, setProfile } = useStore();
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (profileLoaded || !accessToken) return;
    setLoading(true);
    getProfile(accessToken)
      .then((data) => {
        setProfile(data.profile);
      })
      .finally(() => setLoading(false));
  }, [accessToken, profileLoaded, setProfile]);

  return { profile, loading };
}
