import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { api } from './api';

const AppContext = createContext(null);
export const useApp = () => useContext(AppContext);

/** Shared library state: papers, current paper selection, navigation. */
export function AppProvider({ go, children }) {
  const [papers, setPapers] = useState([]);
  const [paper, setPaper] = useState(''); // '' = none / all papers
  const [error, setError] = useState('');
  const [loaded, setLoaded] = useState(false);

  const refresh = useCallback(async () => {
    try {
      setPapers(await api.papers());
      setError('');
    } catch (e) {
      setError(e.message);
    } finally {
      setLoaded(true);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const value = useMemo(
    () => ({ papers, titles: papers.map((p) => p.title), paper, setPaper, error, loaded, refresh, go }),
    [papers, paper, error, loaded, refresh, go]
  );
  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

/** Backend reachability, polled. */
export function useHealth() {
  const [online, setOnline] = useState(null);
  useEffect(() => {
    let alive = true;
    const check = () =>
      api.health().then(() => alive && setOnline(true)).catch(() => alive && setOnline(false));
    check();
    const id = setInterval(check, 15000);
    return () => {
      alive = false;
      clearInterval(id);
    };
  }, []);
  return online;
}

export const copyText = (text) => navigator.clipboard?.writeText(text).catch(() => {});
