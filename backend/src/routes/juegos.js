import { Router } from 'express';

const router = Router();
const CHEAPSHARK_BASE = 'https://www.cheapshark.com/api/1.0';

// Cache en memoria para la lista de tiendas (cambia raramente)
let storesCache = null;
let storesCacheTime = 0;
const STORES_TTL = 24 * 60 * 60 * 1000; // 24 h

async function getStoresMap() {
    if (storesCache && Date.now() - storesCacheTime < STORES_TTL) return storesCache;
    const res  = await fetch(`${CHEAPSHARK_BASE}/stores`);
    const list = await res.json();
    storesCache    = Object.fromEntries(list.map(s => [s.storeID, s.storeName]));
    storesCacheTime = Date.now();
    return storesCache;
}

/**
 * GET /api/juegos/tiendas
 * Devuelve la lista de tiendas de CheapShark con su ID y nombre.
 */
router.get('/tiendas', async (_req, res) => {
    try {
        const map = await getStoresMap();
        return res.status(200).json({ tiendas: map });
    } catch (error) {
        return res.status(500).json({ error: 'No se pudo obtener la lista de tiendas' });
    }
});

/**
 * GET /api/juegos/buscar?nombre=<titulo>
 *
 * Hace de proxy hacia la API de CheapShark y devuelve los juegos
 * que coinciden con el nombre buscado, junto con sus mejores precios actuales.
 */
router.get('/buscar', async (req, res) => {
    const { nombre } = req.query;

    if (!nombre || nombre.trim().length < 2) {
        return res.status(400).json({
            error: 'Parámetro inválido',
            message: 'El parámetro "nombre" es requerido y debe tener al menos 2 caracteres.',
        });
    }

    try {
        // CheapShark: buscar juegos por título
        const url = `${CHEAPSHARK_BASE}/games?title=${encodeURIComponent(nombre.trim())}&limit=20&exact=0`;
        const response = await fetch(url);

        if (!response.ok) {
            throw new Error(`CheapShark respondió con estado ${response.status}`);
        }

        const juegos = await response.json();

        if (!Array.isArray(juegos) || juegos.length === 0) {
            return res.status(200).json({
                resultados: [],
                mensaje: 'No se encontraron juegos con ese nombre.',
            });
        }

        // Normalizar la respuesta para el frontend
        const resultados = juegos.map((juego) => ({
            gameID: juego.gameID,
            titulo: juego.external,
            precio_mas_bajo: juego.cheapest,
            tienda_mas_barata: juego.cheapestDealID,
            portada: juego.thumb,
        }));

        return res.status(200).json({ resultados });
    } catch (error) {
        console.error('[GET /api/juegos/buscar] Error:', error.message);
        return res.status(500).json({
            error: 'Error al consultar CheapShark',
            message: 'No se pudo obtener la información de precios. Intenta nuevamente.',
        });
    }
});

/**
 * GET /api/juegos/:gameID/precios
 *
 * Devuelve todos los deals (ofertas por tienda) disponibles para un juego específico.
 */
router.get('/:gameID/precios', async (req, res) => {
    const { gameID } = req.params;

    if (!gameID || isNaN(Number(gameID))) {
        return res.status(400).json({
            error: 'ID inválido',
            message: 'El parámetro gameID debe ser un número válido.',
        });
    }

    try {
        const url = `${CHEAPSHARK_BASE}/games?id=${gameID}`;
        const response = await fetch(url);

        if (!response.ok) {
            throw new Error(`CheapShark respondió con estado ${response.status}`);
        }

        const data = await response.json();

        const stores = await getStoresMap().catch(() => ({}));

        const resultado = {
            gameID:                  data.info?.gameID,
            titulo:                  data.info?.title,
            portada:                 data.info?.thumb,
            precio_minimo_historico: data.cheapestPriceEver?.price,
            fecha_minimo_historico:  data.cheapestPriceEver?.date
                ? new Date(data.cheapestPriceEver.date * 1000).toISOString()
                : null,
            ofertas: (data.deals || [])
                .sort((a, b) => parseFloat(a.price) - parseFloat(b.price))
                .map((deal) => ({
                    tienda_id:     deal.storeID,
                    tienda_nombre: stores[deal.storeID] || `Tienda ${deal.storeID}`,
                    tienda_icono:  `https://www.cheapshark.com/img/stores/icons/${deal.storeID}.png`,
                    precio_actual: parseFloat(deal.price).toFixed(2),
                    precio_normal: parseFloat(deal.retailPrice).toFixed(2),
                    descuento:     Math.round(parseFloat(deal.savings)),
                    deal_id:       deal.dealID,
                    link_tienda:   `https://www.cheapshark.com/redirect?dealID=${deal.dealID}`,
                })),
        };

        return res.status(200).json(resultado);
    } catch (error) {
        console.error('[GET /api/juegos/:gameID/precios] Error:', error.message);
        return res.status(500).json({
            error: 'Error al obtener precios del juego',
            message: 'No se pudo obtener la información de precios. Intenta nuevamente.',
        });
    }
});

/**
 * GET /api/juegos/populares
 *
 * Devuelve los 50 deals mejor valorados en este momento (Metacritic ≥ 70),
 * precio > $0. Ideal para mostrar como catálogo de descubrimiento.
 */
router.get('/populares', async (req, res) => {
    try {
        // DealRating es el score compuesto de CheapShark (precio, descuento, reviews)
        const url = `${CHEAPSHARK_BASE}/deals?sortBy=DealRating&desc=1&pageSize=500&lowerPrice=1`;
        const response = await fetch(url);
        if (!response.ok) throw new Error(`CheapShark error ${response.status}`);

        const deals = await response.json();

        // Un juego → el deal con mejor DealRating (el primero en llegar gana,
        // ya que la lista viene ordenada por DealRating desc)
        const mejorPorJuego = new Map();
        for (const d of deals) {
            if (!d.gameID || mejorPorJuego.has(d.gameID)) continue;
            mejorPorJuego.set(d.gameID, d);
        }

        // Reordenar por steamRatingPercent desc para priorizar juegos bien valorados
        const ordenados = [...mejorPorJuego.values()]
            .sort((a, b) => parseInt(b.steamRatingPercent || 0) - parseInt(a.steamRatingPercent || 0))
            .slice(0, 50);

        const resultados = ordenados.map((d) => ({
            gameID:        d.gameID,
            titulo:        d.title,
            precio_oferta: parseFloat(d.salePrice).toFixed(2),
            precio_normal: parseFloat(d.normalPrice).toFixed(2),
            descuento:     Math.round(parseFloat(d.savings)),
            portada:       d.thumb,
            steam_rating:  parseInt(d.steamRatingPercent || 0),
            steam_texto:   d.steamRatingText || '',
            metacritic:    parseInt(d.metacriticScore || 0),
            deal_id:       d.dealID,
        }));

        return res.status(200).json({ resultados });
    } catch (error) {
        console.error('[GET /api/juegos/populares]', error.message);
        return res.status(500).json({ error: 'Error al obtener juegos populares' });
    }
});

export default router;
