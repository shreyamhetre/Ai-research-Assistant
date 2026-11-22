import { useCallback, useEffect, useState } from 'react';
import { api } from './api';

export function useTitles() {
  const [titles, setTitles] = useState([]);
  const [error, setError] = useState('');

  const refresh = useCallback(async () => {
    try {
      setTitles(await api.titles());
      setError('');
    } catch (e) {
      setError(e.message);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { titles, error, refresh };
}
