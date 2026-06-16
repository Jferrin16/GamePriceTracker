const IS_LOCAL = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
const API_BASE = IS_LOCAL ? 'http://localhost:3001/api' : '/api';

async function fetchConAuth(url, options = {}, token) {
    const headers = {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...options.headers,
    };
    const response = await fetch(url, { ...options, headers });
    const data = await response.json();
    if (!response.ok) throw new Error(data.message || `Error HTTP ${response.status}`);
    return data;
}

export async function buscarJuegos(nombre) {
    const data = await fetchConAuth(`${API_BASE}/juegos/buscar?nombre=${encodeURIComponent(nombre)}`);
    return data.resultados;
}

export async function obtenerPrecios(gameID) {
    return fetchConAuth(`${API_BASE}/juegos/${gameID}/precios`);
}

export async function obtenerTiendas() {
    const data = await fetchConAuth(`${API_BASE}/juegos/tiendas`);
    return data.tiendas;
}

export async function obtenerFavoritos(token) {
    const data = await fetchConAuth(`${API_BASE}/favoritos`, {}, token);
    return data.favoritos;
}

export async function guardarFavorito(token, payload) {
    return fetchConAuth(`${API_BASE}/favoritos`, { method: 'POST', body: JSON.stringify(payload) }, token);
}

export async function eliminarFavorito(token, favoritoId) {
    return fetchConAuth(`${API_BASE}/favoritos/${favoritoId}`, { method: 'DELETE' }, token);
}

export async function obtenerPopulares() {
    const data = await fetchConAuth(`${API_BASE}/juegos/populares`);
    return data.resultados;
}

export async function enviarAlertaEmail(token, payload) {
    return fetchConAuth(`${API_BASE}/alertas/email`, {
        method: 'POST',
        body:   JSON.stringify(payload),
    }, token);
}

// Tasas de cambio desde USD (sin API key necesaria)
let _tasasCache = null;
export async function obtenerTasas() {
    if (_tasasCache) return _tasasCache;
    try {
        const r = await fetch('https://open.er-api.com/v6/latest/USD');
        const d = await r.json();
        _tasasCache = d.rates || { USD: 1 };
    } catch {
        _tasasCache = { USD: 1 };
    }
    return _tasasCache;
}
