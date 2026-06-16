import { Router } from 'express';
import { supabaseAdmin } from '../config/supabase.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

// Todos los endpoints de favoritos requieren autenticación
router.use(requireAuth);

/**
 * GET /api/favoritos
 *
 * Devuelve la lista de juegos favoritos del usuario autenticado.
 */
router.get('/', async (req, res) => {
    try {
        const { data, error } = await supabaseAdmin
            .from('favoritos')
            .select('id, juego_api_id, titulo, precio_alerta, fecha_guardado')
            .eq('usuario_id', req.user.id)
            .order('fecha_guardado', { ascending: false });

        if (error) {
            console.error('[GET /api/favoritos] Error Supabase:', error.message);
            return res.status(500).json({
                error: 'Error al consultar favoritos',
                message: 'No se pudieron recuperar los favoritos. Intenta nuevamente.',
            });
        }

        return res.status(200).json({ favoritos: data });
    } catch (error) {
        console.error('[GET /api/favoritos] Error inesperado:', error.message);
        return res.status(500).json({
            error: 'Error interno del servidor',
            message: 'Ocurrió un error inesperado.',
        });
    }
});

/**
 * POST /api/favoritos
 *
 * Guarda un juego en favoritos para el usuario autenticado.
 *
 * Body esperado (JSON):
 * {
 *   "juego_api_id": "128",
 *   "titulo": "Half-Life 2",
 *   "precio_alerta": 4.99
 * }
 */
router.post('/', async (req, res) => {
    const { juego_api_id, titulo, precio_alerta } = req.body;

    // Validaciones de entrada
    if (!juego_api_id || typeof juego_api_id !== 'string') {
        return res.status(400).json({
            error: 'Campo requerido',
            message: '"juego_api_id" es requerido y debe ser un string.',
        });
    }
    if (!titulo || typeof titulo !== 'string' || titulo.trim().length === 0) {
        return res.status(400).json({
            error: 'Campo requerido',
            message: '"titulo" es requerido y no puede estar vacío.',
        });
    }
    const alertaNum = parseFloat(precio_alerta);
    if (isNaN(alertaNum) || alertaNum < 0) {
        return res.status(400).json({
            error: 'Campo inválido',
            message: '"precio_alerta" debe ser un número mayor o igual a 0.',
        });
    }

    try {
        // Verificar si el usuario ya tiene este juego en favoritos
        const { data: existente } = await supabaseAdmin
            .from('favoritos')
            .select('id')
            .eq('usuario_id', req.user.id)
            .eq('juego_api_id', juego_api_id)
            .maybeSingle();

        if (existente) {
            return res.status(409).json({
                error: 'Duplicado',
                message: 'Este juego ya está en tu lista de favoritos.',
            });
        }

        const { data, error } = await supabaseAdmin
            .from('favoritos')
            .insert({
                usuario_id: req.user.id,
                juego_api_id: juego_api_id.trim(),
                titulo: titulo.trim(),
                precio_alerta: alertaNum,
            })
            .select()
            .single();

        if (error) {
            console.error('[POST /api/favoritos] Error Supabase:', error.message);
            return res.status(500).json({
                error: 'Error al guardar favorito',
                message: 'No se pudo guardar el juego. Intenta nuevamente.',
            });
        }

        return res.status(201).json({
            mensaje: 'Juego guardado en favoritos correctamente.',
            favorito: data,
        });
    } catch (error) {
        console.error('[POST /api/favoritos] Error inesperado:', error.message);
        return res.status(500).json({
            error: 'Error interno del servidor',
            message: 'Ocurrió un error inesperado.',
        });
    }
});

/**
 * DELETE /api/favoritos/:id
 *
 * Elimina un favorito específico del usuario autenticado por su UUID.
 */
router.delete('/:id', async (req, res) => {
    const { id } = req.params;

    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(id)) {
        return res.status(400).json({
            error: 'ID inválido',
            message: 'El parámetro id debe ser un UUID válido.',
        });
    }

    try {
        const { data, error } = await supabaseAdmin
            .from('favoritos')
            .delete()
            .eq('id', id)
            .eq('usuario_id', req.user.id)
            .select()
            .single();

        if (error || !data) {
            return res.status(404).json({
                error: 'No encontrado',
                message: 'El favorito no existe o no pertenece a tu cuenta.',
            });
        }

        return res.status(200).json({ mensaje: 'Favorito eliminado correctamente.' });
    } catch (error) {
        console.error('[DELETE /api/favoritos/:id] Error inesperado:', error.message);
        return res.status(500).json({
            error: 'Error interno del servidor',
            message: 'Ocurrió un error inesperado.',
        });
    }
});

export default router;
