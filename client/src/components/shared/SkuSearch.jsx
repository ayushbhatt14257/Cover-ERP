import { useState, useRef, useEffect } from 'react';
import api from '../../utils/api';

export default function SkuSearch({ value, onChange, placeholder = 'Search model name...' }) {
  const [query, setQuery] = useState(value?.name || '');
  const [results, setResults] = useState([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const debounce = useRef(null);
  const wrapRef = useRef(null);

  useEffect(() => {
    if (!value) setQuery('');
    else setQuery(value.name);
  }, [value]);

  useEffect(() => {
    const handleClick = (e) => { if (!wrapRef.current?.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const handleInput = (e) => {
    const q = e.target.value;
    setQuery(q);
    onChange(null); // clear selection on typing
    if (q.length < 2) { setResults([]); setOpen(false); return; }

    clearTimeout(debounce.current);
    setLoading(true);
    debounce.current = setTimeout(async () => {
      try {
        const { data } = await api.get(`/skus/search?q=${encodeURIComponent(q)}`);
        setResults(data);
        setOpen(true);
      } finally {
        setLoading(false);
      }
    }, 200);
  };

  const select = (sku) => {
    setQuery(sku.name);
    setOpen(false);
    setResults([]);
    onChange(sku);
  };

  return (
    <div ref={wrapRef} style={{ position: 'relative' }}>
      <div className="search-wrap" style={{ marginBottom: 0 }}>
        <span className="search-icon">⌕</span>
        <input
          className="form-input"
          style={{ paddingLeft: 36 }}
          value={query}
          onChange={handleInput}
          placeholder={placeholder}
          autoComplete="off"
        />
      </div>
      {open && results.length > 0 && (
        <div className="search-dropdown">
          {results.map(sku => (
            <div key={sku._id} className="search-option" onMouseDown={() => select(sku)}>
              <strong>{sku.name}</strong>
              {sku.brand && <span style={{ color: '#9ca3af', fontSize: 12, marginLeft: 8 }}>{sku.brand}</span>}
            </div>
          ))}
        </div>
      )}
      {open && results.length === 0 && !loading && query.length >= 2 && (
        <div className="search-dropdown">
          <div className="search-option" style={{ color: '#9ca3af' }}>No models found for "{query}"</div>
        </div>
      )}
    </div>
  );
}
