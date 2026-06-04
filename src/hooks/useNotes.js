import { useState, useEffect, useCallback } from 'react';
import { getNotes } from '../services/firebase/firestore';

export function useNotes(customerId) {
  const [notes, setNotes]     = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!customerId) {
      setNotes([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const data = await getNotes(customerId);
      setNotes(data);
    } finally {
      setLoading(false);
    }
  }, [customerId]);

  useEffect(() => { load(); }, [load]);

  return { notes, loading, reload: load };
}
