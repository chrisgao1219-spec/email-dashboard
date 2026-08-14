import { useState, useEffect, useCallback, useRef } from 'react';
import { cachedFetch } from '../cache';

export default function useApi(cacheKey, fetchFn, deps = []) {
  const [state, setState] = useState({ data: null, loading: true, error: null });
  const cancelledRef = useRef(false);
  const fetchFnRef = useRef(fetchFn);

  useEffect(() => {
    fetchFnRef.current = fetchFn;
  }, [fetchFn]);

  const execute = useCallback(() => {
    cancelledRef.current = false;
    setState(prev => ({ ...prev, loading: true, error: null }));
    cachedFetch(cacheKey, () => fetchFnRef.current())
      .then(data => { if (!cancelledRef.current) setState({ data, loading: false, error: null }); })
      .catch(err => { if (!cancelledRef.current) setState({ data: null, loading: false, error: err.message }); });
  }, [cacheKey, ...deps]);

  useEffect(() => {
    execute();
    return () => { cancelledRef.current = true; };
  }, [execute]);

  return { ...state, refetch: execute };
}
