import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import juegosRouter    from './routes/juegos.js';
import favoritosRouter from './routes/favoritos.js';
import alertasRouter   from './routes/alertas.js';

const app = express();
const PORT = process.env.PORT || 3001;

// ── Middlewares globales ──────────────────────────────────────────────────────

const LOCAL_ORIGINS = /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/;

app.use(cors({
    origin: (origin, cb) => {
        if (!origin) return cb(null, true);
        if (LOCAL_ORIGINS.test(origin)) return cb(null, true);
        if (process.env.FRONTEND_URL && origin === process.env.FRONTEND_URL) return cb(null, true);
        cb(new Error(`CORS bloqueado: ${origin}`));
    },
    methods: ['GET', 'POST', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization'],
}));

app.use(express.json());

// ── Rutas ────────────────────────────────────────────────────────────────────

app.use('/api/juegos',    juegosRouter);
app.use('/api/favoritos', favoritosRouter);
app.use('/api/alertas',   alertasRouter);

// Health check — útil para verificar que el servidor está activo
app.get('/health', (_req, res) => {
    res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Manejador de rutas no encontradas
app.use((_req, res) => {
    res.status(404).json({ error: 'Ruta no encontrada' });
});

// Manejador de errores global (captura errores que llegan con next(error))
app.use((err, _req, res, _next) => {
    console.error('[Error global]', err);
    res.status(500).json({
        error: 'Error interno del servidor',
        message: err.message || 'Ocurrió un error inesperado.',
    });
});

// ── Arranque ─────────────────────────────────────────────────────────────────

app.listen(PORT, () => {
    console.log(`✓ GamePrice Tracker API corriendo en http://localhost:${PORT}`);
    console.log(`  Entorno: ${process.env.NODE_ENV || 'development'}`);
});
