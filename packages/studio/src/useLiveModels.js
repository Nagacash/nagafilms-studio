import { useState, useEffect } from 'react';

export function useLiveModels(category, { enabled = true } = {}) {
  const [models, setModels] = useState([]);
  const [loading, setLoading] = useState(Boolean(enabled));
  const [error, setError] = useState(null);
  const [source, setSource] = useState(null);

  useEffect(() => {
    if (!enabled || !category) return undefined;

    let cancelled = false;
    setLoading(true);
    setError(null);

    fetch(`/api/models?category=${encodeURIComponent(category)}`, {
      credentials: 'include',
    })
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
        return data;
      })
      .then((data) => {
        if (cancelled) return;
        setModels(data.models || []);
        setSource(data.source || null);
        setLoading(false);
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err);
        setModels([]);
        setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [category, enabled]);

  return { models, loading, error, source };
}

export function creditLabel(model) {
  if (!model) return null;
  if (model.dynamicPricing) {
    if (model.costCredits != null) return `from ~${model.costCredits} cr`;
    return 'dynamic';
  }
  if (model.costCredits != null) return `${model.costCredits} cr`;
  return null;
}
