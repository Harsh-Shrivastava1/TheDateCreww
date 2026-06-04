import { useState, useEffect, useCallback } from 'react';
import { getCustomerById } from '../services/firebase/firestore';

export function useCustomer(id) {
  const [customer, setCustomer] = useState(null);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState(null);

  const load = useCallback(async () => {
    if (!id) {
      setCustomer(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const data = await getCustomerById(id);
      setCustomer(data);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { load(); }, [load]);

  return { customer, loading, error, reload: load };
}
