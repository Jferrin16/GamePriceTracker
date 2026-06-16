import { supabasePublic } from '../config/supabase.js';

/**
 * Middleware que extrae y valida el JWT de Supabase Auth del header Authorization.
 * Si el token es válido, adjunta el usuario a req.user y llama a next().
 * Si no, responde con 401.
 */
export async function requireAuth(req, res, next) {
    const authHeader = req.headers['authorization'];

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({
            error: 'No autorizado',
            message: 'Se requiere un token de acceso en el header Authorization: Bearer <token>',
        });
    }

    const token = authHeader.split(' ')[1];

    const { data, error } = await supabasePublic.auth.getUser(token);

    if (error || !data?.user) {
        return res.status(401).json({
            error: 'Token inválido o expirado',
            message: 'Inicia sesión nuevamente para obtener un token válido.',
        });
    }

    req.user = data.user;
    next();
}
