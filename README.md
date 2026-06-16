# 🎮 GamePrice Tracker

> Compara precios de videojuegos en tiempo real entre más de 35 tiendas digitales y recibe alertas cuando tu juego favorito baja de precio.

**[Ver demo en vivo →](https://gamepricetrackerr.netlify.app)**

---

## Capturas

| Landing | Búsqueda | Comparador de precios |
|---------|----------|-----------------------|
| Pantalla de bienvenida animada | Autocompletado en tiempo real | Modal con precios de 35+ tiendas |

---

## Características

- **Búsqueda con autocompletado** — resultados en tiempo real con debounce
- **Comparador de precios** — compara entre Steam, Epic, GOG, Humble y 30+ tiendas más
- **Favoritos persistentes** — guardados en base de datos, vinculados a tu cuenta
- **Alertas de precio** — notificación push (navegador) + email cuando baja el precio
- **8 monedas disponibles** — USD, EUR, ARS, MXN, COP, BRL, CLP, PEN
- **Autenticación completa** — registro, login, verificación por email y recuperación de contraseña
- **PWA instalable** — funciona como app nativa en Android e iOS

---

## Stack

| Capa | Tecnología |
|------|-----------|
| Frontend | HTML5 + CSS3 + JavaScript ES2022 (Vanilla, sin frameworks) |
| Backend | Node.js + Express |
| Base de datos | Supabase (PostgreSQL + Auth + RLS) |
| Precios | CheapShark API |
| Email | Resend |
| Notificaciones | Service Worker (PWA) |
| Hosting frontend | Netlify |
| Hosting backend | Render |

---

## Arquitectura

```
Usuario → Netlify CDN (frontend estático)
               ↓ /api/*
          Netlify Proxy → Render (Express API)
                               ↓
                    Supabase DB · CheapShark · Resend
```

El frontend nunca habla directamente con servicios externos. Todo pasa por el backend en Render, que valida el JWT antes de cada operación.

---

## Estructura del proyecto

```
GamePriceTracker/
├── frontend/          # App estática (HTML + CSS + JS)
│   ├── index.html
│   ├── css/styles.css
│   ├── js/
│   │   ├── app.js     # Lógica principal
│   │   └── api.js     # Capa de comunicación con el backend
│   ├── sw.js          # Service Worker (PWA)
│   └── manifest.json
├── backend/           # API REST (Node.js + Express)
│   └── src/
│       ├── index.js
│       ├── routes/    # juegos · favoritos · alertas
│       ├── middleware/ # auth (JWT)
│       └── config/    # supabase client
├── database/
│   └── schema.sql     # Tabla favoritos + RLS policies
├── emails/            # Plantillas HTML para Supabase
│   ├── verificacion.html
│   └── recuperacion.html
├── netlify.toml       # Proxy /api/* + SPA fallback
└── render.yaml        # Configuración del backend en Render
```

---

## Variables de entorno

**Backend (`backend/.env`)**

```env
SUPABASE_URL=https://xxxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
RESEND_API_KEY=re_xxxxxxxxxxxx
RESEND_FROM=GamePrice Tracker <noreply@tudominio.com>
FRONTEND_URL=https://gamepricetrackerr.netlify.app
```

> El frontend no requiere variables de entorno. La `anon key` de Supabase es pública por diseño (protegida por RLS).

---

## Despliegue

El proyecto usa CI/CD automático: cualquier `push` a `main` despliega en Netlify y Render simultáneamente.

| Servicio | Plataforma | URL |
|----------|-----------|-----|
| Frontend | Netlify | `gamepricetrackerr.netlify.app` |
| Backend | Render | `gamepricetracker.onrender.com` |
| Base de datos | Supabase | Instancia privada |

---

## Autor

**Jandry Ferrín** — [jandry.ferrin.olivo@gmail.com](mailto:jandry.ferrin.olivo@gmail.com)
