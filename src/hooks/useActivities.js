import { useState, useEffect, useCallback } from 'react';
import { getActivities } from '../services/firebase/firestore';

export function useActivities(customerId) {
  const [activities, setActivities] = useState([]);
  const [loading, setLoading]       = useState(true);

  const load = useCallback(async () => {
    if (!customerId) {
      setActivities([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const data = await getActivities(customerId);
      setActivities(data);
    } finally {
      setLoading(false);
    }
  }, [customerId]);

  useEffect(() => { load(); }, [load]);

  return { activities, loading, reload: load };
}
