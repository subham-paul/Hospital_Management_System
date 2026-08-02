import { useCallback, useEffect, useState } from 'react';
import client from '../api/client';

/** Fetches a paginated Laravel resource list. */
export default function useList(endpoint, params = {}) {
  const [rows, setRows] = useState([]);
  const [page, setPage] = useState(1);
  const [lastPage, setLastPage] = useState(1);
  const [loading, setLoading] = useState(true);

  const key = JSON.stringify(params);

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await client.get(endpoint, { params: { page, ...JSON.parse(key) } });
      setRows(data.data ?? data);
      setLastPage(data.last_page ?? 1);
    } finally {
      setLoading(false);
    }
  }, [endpoint, page, key]);

  useEffect(() => { reload(); }, [reload]);

  return { rows, page, setPage, lastPage, loading, reload };
}
