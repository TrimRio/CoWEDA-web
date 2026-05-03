import { useState, useEffect, useCallback } from 'react';
import { API, useAuth } from '../context/AuthContext';

function authHeaders() {
  const token = localStorage.getItem('coweda_token');
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

export function useEnsembles() {
  const [ensembles, setEnsembles] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError]         = useState(null);

  const { token } = useAuth();

  const fetchEnsembles = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API}/ensembles`, { headers: authHeaders() });
      if (!res.ok) throw new Error(`Failed to load ensembles (${res.status})`);
      const data = await res.json();
      setEnsembles(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (token) fetchEnsembles();
  }, [token, fetchEnsembles]);

  const createEnsemble = useCallback(async (name, items) => {
    const res = await fetch(`${API}/ensembles`, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({ name, items }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to create ensemble');
    setEnsembles(prev => [...prev, data]);
    return data;
  }, []);

  const updateEnsemble = useCallback(async (id, name, items) => {
    const res = await fetch(`${API}/ensembles/${id}`, {
      method: 'PUT',
      headers: authHeaders(),
      body: JSON.stringify({ name, items }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to update ensemble');
    setEnsembles(prev => prev.map(e => e.id === id ? { ...e, name, items } : e));
    return data;
  }, []);

  const deleteEnsemble = useCallback(async (id) => {
    const res = await fetch(`${API}/ensembles/${id}`, {
      method: 'DELETE',
      headers: authHeaders(),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to delete ensemble');
    setEnsembles(prev => prev.filter(e => e.id !== id));
  }, []);

  return {
    ensembles,
    isLoading,
    error,
    fetchEnsembles,
    createEnsemble,
    updateEnsemble,
    deleteEnsemble,
  };
}
