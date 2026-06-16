import { signIn, signUp, signOut, onAuthStateChange,
         resendConfirmationEmail, resetPassword, updatePassword } from './auth.js';
import { buscarJuegos, obtenerPrecios, obtenerFavoritos, guardarFavorito,
         eliminarFavorito, obtenerPopulares, obtenerTasas } from './api.js';

// ── Estado global ─────────────────────────────────────────────────────────────
let sessionActual    = null;
let modoRecuperacion = false;
let tasas            = { USD: 1 };
let monedaActual     = 'USD';

const VISITA_KEY          = 'gameprice_ultima_visita';
const POPULARES_CACHE_KEY = 'gameprice_populares';
const VERIF_KEY           = 'gameprice_ultima_verif';
const DOS_SEMANAS_MS      = 14 * 24 * 60 * 60 * 1000;

const SIMBOLOS = { USD:'$', EUR:'€', MXN:'$', ARS:'$', COP:'$', CLP:'$', BRL:'R$', GBP:'£' };
const HOY = new Date().toDateString();

function precio(usd) {
    const v = parseFloat(usd) * (tasas[monedaActual] || 1);
    return `${SIMBOLOS[monedaActual] || '$'}${v.toFixed(2)}`;
}

// ── Persistencia de sesión ────────────────────────────────────────────────────
function registrarVisita() { localStorage.setItem(VISITA_KEY, Date.now().toString()); }

async function verificarInactividad() {
    const v = localStorage.getItem(VISITA_KEY);
    if (v && Date.now() - parseInt(v, 10) > DOS_SEMANAS_MS) {
        await signOut().catch(() => {});
        localStorage.removeItem(VISITA_KEY);
        return true;
    }
    return false;
}

// ── DOM ───────────────────────────────────────────────────────────────────────
const seccionLanding         = document.getElementById('seccion-landing');
const mainContenido          = document.getElementById('main-contenido');
const selectorMoneda         = document.getElementById('selector-moneda');
const btnPerfil              = document.getElementById('btn-perfil');
const btnLogout              = document.getElementById('btn-logout');
const authSection            = document.getElementById('auth-section');
const appSection             = document.getElementById('app-section');
const mensajeError           = document.getElementById('mensaje-error');
const authTabs               = document.getElementById('auth-tabs');
const tabBtnLogin            = document.getElementById('tab-btn-login');
const tabBtnRegister         = document.getElementById('tab-btn-register');
const panelLogin             = document.getElementById('panel-login');
const panelRegister          = document.getElementById('panel-register');
const panelVerificacion      = document.getElementById('panel-verificacion');
const panelRecuperacion      = document.getElementById('panel-recuperacion');
const panelRecuperacionEnv   = document.getElementById('panel-recuperacion-enviada');
const panelNuevaContrasena   = document.getElementById('panel-nueva-contrasena');
const TODOS_PANELES = [panelLogin, panelRegister, panelVerificacion,
                       panelRecuperacion, panelRecuperacionEnv, panelNuevaContrasena];
const loginEmail             = document.getElementById('login-email');
const loginPassword          = document.getElementById('login-password');
const btnLogin               = document.getElementById('btn-login');
const btnIrRecuperacion      = document.getElementById('btn-ir-recuperacion');
const regEmail               = document.getElementById('reg-email');
const regPassword            = document.getElementById('reg-password');
const regPasswordConfirm     = document.getElementById('reg-password-confirm');
const btnRegister            = document.getElementById('btn-register');
const matchFeedback          = document.getElementById('match-feedback');
const passwordStrength       = document.getElementById('password-strength');
const strengthFill           = document.getElementById('strength-fill');
const strengthLabel          = document.getElementById('strength-label');
const emailRegistrado        = document.getElementById('email-registrado');
const btnReenviar            = document.getElementById('btn-reenviar');
const reenvioFeedback        = document.getElementById('reenvio-feedback');
const btnVolverLogin         = document.getElementById('btn-volver-login');
const recEmail               = document.getElementById('rec-email');
const btnEnviarRecuperacion  = document.getElementById('btn-enviar-recuperacion');
const btnBackRecuperacion    = document.getElementById('btn-back-recuperacion');
const emailRecuperacion      = document.getElementById('email-recuperacion');
const btnVolverLogin2        = document.getElementById('btn-volver-login-2');
const nuevaPass              = document.getElementById('nueva-pass');
const nuevaPassConfirm       = document.getElementById('nueva-pass-confirm');
const nuevaMatchFeedback     = document.getElementById('nueva-match-feedback');
const btnGuardarContrasena   = document.getElementById('btn-guardar-contrasena');
const bannerNotif            = document.getElementById('banner-notif');
const btnActivarNotif        = document.getElementById('btn-activar-notif');
const btnRechazarNotif       = document.getElementById('btn-rechazar-notif');
const inputBusqueda          = document.getElementById('input-busqueda');
const autocompleteLista      = document.getElementById('autocomplete-lista');
const btnBuscar              = document.getElementById('btn-buscar');
const resultadosEl           = document.getElementById('resultados');
const favoritosEl            = document.getElementById('favoritos');
const popularesGrid          = document.getElementById('populares-grid');
const modalDeals             = document.getElementById('modal-deals');
const modalTitulo            = document.getElementById('modal-titulo');
const modalMinimo            = document.getElementById('modal-minimo');
const modalDealsList         = document.getElementById('modal-deals-lista');
const modalCerrar            = document.getElementById('modal-cerrar');
const panelPerfil            = document.getElementById('panel-perfil');
const perfilAvatar           = document.getElementById('perfil-avatar');
const perfilEmail            = document.getElementById('perfil-email');
const perfilDesde            = document.getElementById('perfil-desde');
const perfilFavsList         = document.getElementById('perfil-favoritos-lista');
const btnCerrarPerfil        = document.getElementById('btn-cerrar-perfil');
const btnPerfilLogout        = document.getElementById('btn-perfil-logout');

// ── Errores ───────────────────────────────────────────────────────────────────
const ERRORES = {
    'Invalid login credentials':                 'Email o contraseña incorrectos.',
    'Email not confirmed':                       'Debes confirmar tu email. Revisa tu bandeja de entrada.',
    'User already registered':                  'Ya existe una cuenta con ese email.',
    'Password should be at least 6 characters': 'La contraseña debe tener al menos 6 caracteres.',
    'only request this':                        'Espera unos segundos antes de volver a intentarlo.',
    'rate limit':                               'Demasiados intentos. Espera un momento.',
    'Unable to validate email address':         'El email ingresado no es válido.',
    'For security purposes':                    'Espera unos segundos antes de volver a intentarlo.',
};

function traducirError(msg) {
    for (const [k, v] of Object.entries(ERRORES))
        if (msg.toLowerCase().includes(k.toLowerCase())) return v;
    return msg;
}
function mostrarError(msg) {
    mensajeError.textContent = traducirError(msg);
    mensajeError.classList.remove('oculto');
    setTimeout(() => mensajeError.classList.add('oculto'), 6000);
}
function setLoading(btn, loading) {
    btn.disabled = loading;
    btn.dataset.textoOriginal = btn.dataset.textoOriginal || btn.textContent;
    btn.textContent = loading ? 'Cargando...' : btn.dataset.textoOriginal;
}

// ── Landing ───────────────────────────────────────────────────────────────────
let landingPasado = false;

function mostrarAuth(tab = 'login') {
    landingPasado = true;
    seccionLanding.classList.add('oculto');
    mainContenido.classList.remove('oculto');
    authSection.classList.remove('oculto');
    appSection.classList.add('oculto');
    if (tab === 'register') mostrarPanel(panelRegister);
    else mostrarPanel(panelLogin);
}

document.getElementById('btn-empezar-registro').addEventListener('click', () => mostrarAuth('register'));
document.getElementById('btn-empezar-login').addEventListener('click',    () => mostrarAuth('login'));

// ── Moneda ────────────────────────────────────────────────────────────────────
selectorMoneda.addEventListener('change', () => {
    monedaActual = selectorMoneda.value;
    // Re-renderizar si hay contenido visible
    if (resultadosEl.querySelector('.card-juego')) realizarBusqueda(false);
    const cacheStr = localStorage.getItem(POPULARES_CACHE_KEY);
    if (cacheStr) {
        const c = JSON.parse(cacheStr);
        if (c.datos) renderizarPopulares(c.datos);
    }
});

// ── Tabs / navegación de auth ─────────────────────────────────────────────────
function mostrarPanel(panel) {
    TODOS_PANELES.forEach(p => p.classList.add('oculto'));
    const esTablPanel = panel === panelLogin || panel === panelRegister;
    authTabs.classList.toggle('oculto', !esTablPanel);
    [tabBtnLogin, tabBtnRegister].forEach(t => { t.classList.remove('activo'); t.setAttribute('aria-selected','false'); });
    panel.classList.remove('oculto');
    if (panel === panelLogin)    { tabBtnLogin.classList.add('activo');    tabBtnLogin.setAttribute('aria-selected','true'); }
    if (panel === panelRegister) { tabBtnRegister.classList.add('activo'); tabBtnRegister.setAttribute('aria-selected','true'); }
}
tabBtnLogin.addEventListener('click',          () => mostrarPanel(panelLogin));
tabBtnRegister.addEventListener('click',       () => mostrarPanel(panelRegister));
btnVolverLogin.addEventListener('click',       () => mostrarPanel(panelLogin));
btnVolverLogin2.addEventListener('click',      () => mostrarPanel(panelLogin));
btnBackRecuperacion.addEventListener('click',  () => mostrarPanel(panelLogin));
btnIrRecuperacion.addEventListener('click',    () => mostrarPanel(panelRecuperacion));

// ── Toggle contraseña ─────────────────────────────────────────────────────────
document.querySelectorAll('.btn-toggle-pass').forEach(btn => {
    btn.addEventListener('click', () => {
        const input = document.getElementById(btn.dataset.target);
        input.type  = input.type === 'password' ? 'text' : 'password';
        btn.textContent = input.type === 'password' ? '👁' : '🙈';
    });
});

// ── Fuerza contraseña ─────────────────────────────────────────────────────────
regPassword.addEventListener('input', () => {
    const val = regPassword.value;
    if (!val) { passwordStrength.classList.add('oculto'); return; }
    passwordStrength.classList.remove('oculto');
    let s = 0;
    if (val.length >= 8) s++; if (val.length >= 12) s++;
    if (/[A-Z]/.test(val)) s++; if (/[0-9]/.test(val)) s++; if (/[^A-Za-z0-9]/.test(val)) s++;
    const n = [
        {label:'Muy débil',color:'#ef4444',width:'20%'},
        {label:'Débil',    color:'#f97316',width:'40%'},
        {label:'Regular',  color:'#eab308',width:'60%'},
        {label:'Fuerte',   color:'#22c55e',width:'80%'},
        {label:'Muy fuerte',color:'#10b981',width:'100%'},
    ][Math.min(s,4)];
    strengthFill.style.width = n.width; strengthFill.style.background = n.color;
    strengthLabel.textContent = n.label; strengthLabel.style.color = n.color;
    verificarCoincidencia();
});

function verificarCoincidencia() {
    const p1 = regPassword.value, p2 = regPasswordConfirm.value;
    if (!p2) { matchFeedback.classList.add('oculto'); return; }
    matchFeedback.classList.remove('oculto');
    matchFeedback.textContent = p1===p2 ? '✓ Las contraseñas coinciden' : '✗ Las contraseñas no coinciden';
    matchFeedback.className   = `match-feedback ${p1===p2?'match-ok':'match-error'}`;
}
regPasswordConfirm.addEventListener('input', verificarCoincidencia);

nuevaPassConfirm.addEventListener('input', () => {
    const p1 = nuevaPass.value, p2 = nuevaPassConfirm.value;
    if (!p2) { nuevaMatchFeedback.classList.add('oculto'); return; }
    nuevaMatchFeedback.classList.remove('oculto');
    nuevaMatchFeedback.textContent = p1===p2 ? '✓ Las contraseñas coinciden' : '✗ Las contraseñas no coinciden';
    nuevaMatchFeedback.className   = `match-feedback ${p1===p2?'match-ok':'match-error'}`;
});

// ── UI principal ──────────────────────────────────────────────────────────────
function actualizarUI(session) {
    sessionActual = session;
    if (session && !modoRecuperacion) {
        seccionLanding.classList.add('oculto');
        mainContenido.classList.remove('oculto');
        authSection.classList.add('oculto');
        appSection.classList.remove('oculto');
        btnLogout.classList.remove('oculto');
        btnPerfil.classList.remove('oculto');
        selectorMoneda.classList.remove('oculto');
        actualizarAvatar(session.user.email);
        cargarFavoritos();
        cargarPopulares();
        mostrarBannerNotificacion();
        verificarAlertas();
    } else if (!session) {
        appSection.classList.add('oculto');
        btnLogout.classList.add('oculto');
        btnPerfil.classList.add('oculto');
        selectorMoneda.classList.add('oculto');
        favoritosEl.innerHTML = '';
        resultadosEl.innerHTML = '';
        if (landingPasado) {
            // Ya pasó por la landing: mostrar auth directamente
            seccionLanding.classList.add('oculto');
            mainContenido.classList.remove('oculto');
            authSection.classList.remove('oculto');
            if (!modoRecuperacion) mostrarPanel(panelLogin);
        } else {
            // Primera carga sin sesión: mostrar landing
            seccionLanding.classList.remove('oculto');
            mainContenido.classList.add('oculto');
        }
    }
}

onAuthStateChange((event, session) => {
    if (event === 'PASSWORD_RECOVERY') {
        modoRecuperacion = true;
        landingPasado = true;
        seccionLanding.classList.add('oculto');
        mainContenido.classList.remove('oculto');
        authSection.classList.remove('oculto');
        appSection.classList.add('oculto');
        btnLogout.classList.add('oculto');
        mostrarPanel(panelNuevaContrasena);
        return;
    }
    if ((event === 'SIGNED_IN' || event === 'INITIAL_SESSION') && session) registrarVisita();
    actualizarUI(session);
});

// ── Login ─────────────────────────────────────────────────────────────────────
btnLogin.addEventListener('click', async () => {
    const email = loginEmail.value.trim(), password = loginPassword.value;
    if (!email || !password) return mostrarError('Email y contraseña son requeridos.');
    setLoading(btnLogin, true);
    try { await signIn(email, password); }
    catch (e) { mostrarError(e.message); }
    finally { setLoading(btnLogin, false); }
});
loginPassword.addEventListener('keydown', e => { if (e.key==='Enter') btnLogin.click(); });

// ── Registro ──────────────────────────────────────────────────────────────────
btnRegister.addEventListener('click', async () => {
    const email = regEmail.value.trim(), pass = regPassword.value, confirm = regPasswordConfirm.value;
    if (!email||!pass||!confirm) return mostrarError('Completa todos los campos.');
    if (pass.length<6)           return mostrarError('La contraseña debe tener al menos 6 caracteres.');
    if (pass!==confirm)          return mostrarError('Las contraseñas no coinciden.');
    setLoading(btnRegister, true);
    try {
        const { session } = await signUp(email, pass);
        if (!session) {
            emailRegistrado.textContent = email;
            reiniciarReenvio();
            mostrarPanel(panelVerificacion);
            regEmail.value = regPassword.value = regPasswordConfirm.value = '';
            passwordStrength.classList.add('oculto');
            matchFeedback.classList.add('oculto');
        }
    } catch (e) { mostrarError(e.message); }
    finally { setLoading(btnRegister, false); }
});
regPasswordConfirm.addEventListener('keydown', e => { if (e.key==='Enter') btnRegister.click(); });

// ── Reenvío con cooldown 45s ──────────────────────────────────────────────────
let primeraVezReenvio = true, timerReenvio = null;

function reiniciarReenvio() {
    primeraVezReenvio = true;
    btnReenviar.disabled = false;
    btnReenviar.textContent = 'Reenviar correo';
    reenvioFeedback.classList.add('oculto');
    if (timerReenvio) { clearInterval(timerReenvio); timerReenvio = null; }
}

function iniciarCooldown() {
    let s = 45;
    btnReenviar.disabled = true;
    reenvioFeedback.textContent = '✓ Correo reenviado.';
    reenvioFeedback.className = 'reenvio-feedback match-ok';
    reenvioFeedback.classList.remove('oculto');
    timerReenvio = setInterval(() => {
        s--;
        btnReenviar.textContent = `Reenviar en ${s}s`;
        if (s<=0) { clearInterval(timerReenvio); timerReenvio=null; btnReenviar.disabled=false; btnReenviar.textContent='Reenviar correo'; }
    }, 1000);
}

btnReenviar.addEventListener('click', async () => {
    const email = emailRegistrado.textContent;
    if (!email || (!primeraVezReenvio && timerReenvio)) return;
    setLoading(btnReenviar, true);
    try { await resendConfirmationEmail(email); primeraVezReenvio=false; iniciarCooldown(); }
    catch (e) { mostrarError(e.message); btnReenviar.disabled=false; btnReenviar.textContent='Reenviar correo'; }
});

// ── Recuperación ──────────────────────────────────────────────────────────────
btnEnviarRecuperacion.addEventListener('click', async () => {
    const email = recEmail.value.trim();
    if (!email) return mostrarError('Ingresa tu email.');
    setLoading(btnEnviarRecuperacion, true);
    try { await resetPassword(email); emailRecuperacion.textContent=email; mostrarPanel(panelRecuperacionEnv); recEmail.value=''; }
    catch (e) { mostrarError(e.message); }
    finally { setLoading(btnEnviarRecuperacion, false); }
});
recEmail.addEventListener('keydown', e => { if (e.key==='Enter') btnEnviarRecuperacion.click(); });

btnGuardarContrasena.addEventListener('click', async () => {
    const pass=nuevaPass.value, confirm=nuevaPassConfirm.value;
    if (!pass||!confirm) return mostrarError('Completa ambos campos.');
    if (pass.length<6)   return mostrarError('La contraseña debe tener al menos 6 caracteres.');
    if (pass!==confirm)  return mostrarError('Las contraseñas no coinciden.');
    setLoading(btnGuardarContrasena, true);
    try {
        await updatePassword(pass);
        modoRecuperacion=false;
        nuevaPass.value=nuevaPassConfirm.value='';
        nuevaMatchFeedback.classList.add('oculto');
        actualizarUI(sessionActual);
    } catch (e) { mostrarError(e.message); }
    finally { setLoading(btnGuardarContrasena, false); }
});
nuevaPassConfirm.addEventListener('keydown', e => { if (e.key==='Enter') btnGuardarContrasena.click(); });

// ── Logout ────────────────────────────────────────────────────────────────────
async function cerrarSesion() {
    localStorage.removeItem(VISITA_KEY);
    panelPerfil.classList.add('oculto');
    await signOut();
}
btnLogout.addEventListener('click', cerrarSesion);
btnPerfilLogout.addEventListener('click', cerrarSesion);

// ── Perfil ────────────────────────────────────────────────────────────────────
function actualizarAvatar(email) {
    const inicial = (email || '?')[0].toUpperCase();
    const hue     = [...email].reduce((a,c) => a + c.charCodeAt(0), 0) % 360;
    btnPerfil.textContent = inicial;
    btnPerfil.style.background = `hsl(${hue},60%,40%)`;
    perfilAvatar.textContent   = inicial;
    perfilAvatar.style.background = `hsl(${hue},60%,40%)`;
}

btnPerfil.addEventListener('click', () => {
    if (!sessionActual) return;
    perfilEmail.textContent  = sessionActual.user.email;
    const creado = sessionActual.user.created_at
        ? new Date(sessionActual.user.created_at).toLocaleDateString('es-ES',{year:'numeric',month:'long',day:'numeric'})
        : '';
    perfilDesde.textContent = creado ? `Miembro desde ${creado}` : '';
    cargarPerfilFavoritos();
    panelPerfil.classList.remove('oculto');
});

btnCerrarPerfil.addEventListener('click', () => panelPerfil.classList.add('oculto'));
panelPerfil.addEventListener('click', e => { if (e.target===panelPerfil) panelPerfil.classList.add('oculto'); });

async function cargarPerfilFavoritos() {
    perfilFavsList.innerHTML = '<p class="loading">Cargando...</p>';
    try {
        const favs = await obtenerFavoritos(sessionActual.access_token);
        if (!favs || favs.length===0) {
            perfilFavsList.innerHTML = '<p class="vacio">No tienes juegos guardados.</p>';
            return;
        }
        perfilFavsList.innerHTML = favs.map(f => `
            <div class="perfil-fav-item">
                <div>
                    <span class="perfil-fav-titulo">${escapeHtml(f.titulo)}</span>
                    <span class="perfil-fav-meta">Alerta: ${precio(f.precio_alerta)} · ${new Date(f.fecha_guardado).toLocaleDateString('es-ES')}</span>
                </div>
                <button class="btn-perfil-ver" onclick="window.abrirDeals('${f.juego_api_id}','${jsEscape(f.titulo)}')">Ver precios</button>
            </div>
        `).join('');
    } catch {
        perfilFavsList.innerHTML = '<p class="error-inline">No se pudieron cargar.</p>';
    }
}

// ── Notificaciones ────────────────────────────────────────────────────────────
function mostrarBannerNotificacion() {
    if (!('Notification' in window)) return;
    if (Notification.permission === 'default') bannerNotif.classList.remove('oculto');
}

btnActivarNotif.addEventListener('click', async () => {
    bannerNotif.classList.add('oculto');
    await Notification.requestPermission();
    if (Notification.permission==='granted') verificarAlertas();
});
btnRechazarNotif.addEventListener('click', () => bannerNotif.classList.add('oculto'));

async function verificarAlertas() {
    if (!('Notification' in window) || Notification.permission!=='granted') return;
    if (!sessionActual) return;
    const ultima = localStorage.getItem(VERIF_KEY);
    if (ultima===HOY) return;

    try {
        const favs = await obtenerFavoritos(sessionActual.access_token);
        for (const fav of favs) {
            const data = await obtenerPrecios(fav.juego_api_id).catch(() => null);
            if (!data?.ofertas?.length) continue;
            const precioMin = Math.min(...data.ofertas.map(o => parseFloat(o.precio_actual)));
            if (precioMin <= parseFloat(fav.precio_alerta)) {
                new Notification('🎮 ¡Alerta de precio!', {
                    body: `${fav.titulo} está a ${precio(precioMin)} (tu alerta: ${precio(fav.precio_alerta)})`,
                });
            }
        }
        localStorage.setItem(VERIF_KEY, HOY);
    } catch { /* silencioso */ }
}

// ── Autocomplete ──────────────────────────────────────────────────────────────
let acTimer = null;
let acIndex = -1;

inputBusqueda.addEventListener('input', () => {
    const val = inputBusqueda.value.trim();
    if (!val) { cerrarAutocomp(); resultadosEl.innerHTML = ''; return; }
    clearTimeout(acTimer);
    if (val.length >= 2) acTimer = setTimeout(() => cargarAutocomp(val), 280);
});

async function cargarAutocomp(q) {
    try {
        const juegos = await buscarJuegos(q);
        mostrarAutocomp(juegos.slice(0, 8));
    } catch { cerrarAutocomp(); }
}

function mostrarAutocomp(juegos) {
    if (!juegos.length) { cerrarAutocomp(); return; }
    acIndex = -1;
    autocompleteLista.innerHTML = juegos.map((j, i) => `
        <li role="option" tabindex="-1" data-titulo="${escapeHtml(j.titulo)}" data-i="${i}">
            <img src="${j.portada}" alt="" loading="lazy">
            <div>
                <span>${escapeHtml(j.titulo)}</span>
                <small>Desde ${precio(j.precio_mas_bajo)}</small>
            </div>
        </li>
    `).join('');
    autocompleteLista.classList.remove('oculto');
    autocompleteLista.querySelectorAll('li').forEach(li => {
        li.addEventListener('mousedown', () => {
            inputBusqueda.value = li.dataset.titulo;
            cerrarAutocomp();
            realizarBusqueda();
        });
    });
}

function cerrarAutocomp() {
    autocompleteLista.classList.add('oculto');
    autocompleteLista.innerHTML = '';
    acIndex = -1;
}

inputBusqueda.addEventListener('keydown', e => {
    const items = autocompleteLista.querySelectorAll('li');
    if (!items.length) { if (e.key==='Enter') realizarBusqueda(); return; }
    if (e.key==='ArrowDown') { acIndex=Math.min(acIndex+1,items.length-1); items[acIndex]?.focus(); e.preventDefault(); }
    else if (e.key==='ArrowUp') { acIndex=Math.max(acIndex-1,-1); if (acIndex<0) inputBusqueda.focus(); else items[acIndex]?.focus(); e.preventDefault(); }
    else if (e.key==='Escape') cerrarAutocomp();
    else if (e.key==='Enter') realizarBusqueda();
});

document.addEventListener('click', e => {
    if (!e.target.closest('.search-wrapper')) cerrarAutocomp();
});

// ── Búsqueda ──────────────────────────────────────────────────────────────────
btnBuscar.addEventListener('click', () => realizarBusqueda());

async function realizarBusqueda(conLoading = true) {
    const nombre = inputBusqueda.value.trim();
    if (!nombre) { resultadosEl.innerHTML = ''; return; }
    if (nombre.length < 2) return mostrarError('Escribe al menos 2 caracteres.');
    cerrarAutocomp();
    if (conLoading) setLoading(btnBuscar, true);
    resultadosEl.innerHTML = '<p class="loading">Buscando juegos...</p>';
    try {
        const juegos = await buscarJuegos(nombre);
        renderizarResultados(juegos);
    } catch (e) { resultadosEl.innerHTML = ''; mostrarError(e.message); }
    finally { if (conLoading) setLoading(btnBuscar, false); }
}

function renderizarResultados(juegos) {
    if (!juegos?.length) { resultadosEl.innerHTML = '<p class="vacio">No se encontraron juegos.</p>'; return; }
    resultadosEl.innerHTML = juegos.map(j => `
        <div class="card-juego" data-id="${j.gameID}">
            <img src="${escapeHtml(j.portada)}" alt="${escapeHtml(j.titulo)}" loading="lazy">
            <div class="card-info">
                <h3>${escapeHtml(j.titulo)}</h3>
                <p class="precio">Desde <strong>${precio(j.precio_mas_bajo)}</strong></p>
                <div class="acciones">
                    <button class="btn-ver-deals" onclick="window.abrirDeals('${j.gameID}','${jsEscape(j.titulo)}')">
                        🏪 Ver precios por tienda
                    </button>
                    <button class="btn-guardar" onclick="window.guardarJuego('${j.gameID}','${jsEscape(j.titulo)}',this)">
                        + Favoritos
                    </button>
                </div>
            </div>
        </div>
    `).join('');
}

// ── Modal de precios por tienda ───────────────────────────────────────────────
window.abrirDeals = async (gameID, titulo) => {
    modalTitulo.textContent   = titulo;
    modalMinimo.textContent   = '';
    modalDealsList.innerHTML  = '<p class="loading">Cargando precios...</p>';
    modalDeals.classList.remove('oculto');
    document.body.style.overflow = 'hidden';
    try {
        const data = await obtenerPrecios(gameID);
        if (data.precio_minimo_historico) {
            const fechaMin = data.fecha_minimo_historico
                ? ` (${new Date(data.fecha_minimo_historico).toLocaleDateString('es-ES')})`
                : '';
            modalMinimo.textContent = `Precio mínimo histórico: ${precio(data.precio_minimo_historico)}${fechaMin}`;
        }
        if (!data.ofertas?.length) {
            modalDealsList.innerHTML = '<p class="vacio">No hay ofertas disponibles ahora.</p>';
            return;
        }
        modalDealsList.innerHTML = data.ofertas.map(o => {
            const tieneDesc = o.descuento > 0;
            return `
            <div class="deal-row">
                <img class="deal-store-icon" src="${o.tienda_icono}" alt="${escapeHtml(o.tienda_nombre)}" onerror="this.style.display='none'">
                <div class="deal-info">
                    <span class="deal-store">${escapeHtml(o.tienda_nombre)}</span>
                    <div class="deal-precios">
                        ${tieneDesc
                            ? `<span class="precio-tachado">${precio(o.precio_normal)}</span>
                               <span class="precio-oferta">${precio(o.precio_actual)}</span>
                               <span class="badge-descuento-inline">-${o.descuento}%</span>`
                            : `<span class="precio-oferta">${precio(o.precio_actual)}</span>`
                        }
                    </div>
                </div>
                <a href="${o.link_tienda}" target="_blank" rel="noopener noreferrer" class="btn-ir-tienda">
                    Ir a la tienda ↗
                </a>
            </div>`;
        }).join('');
    } catch (e) {
        modalDealsList.innerHTML = `<p class="error-inline">${traducirError(e.message)}</p>`;
    }
};

function cerrarModal() {
    modalDeals.classList.add('oculto');
    document.body.style.overflow = '';
}
modalCerrar.addEventListener('click', cerrarModal);
modalDeals.addEventListener('click', e => { if (e.target===modalDeals) cerrarModal(); });
document.addEventListener('keydown', e => { if (e.key==='Escape') { cerrarModal(); panelPerfil.classList.add('oculto'); } });

// ── Favoritos ─────────────────────────────────────────────────────────────────
window.guardarJuego = async (gameID, titulo, boton) => {
    if (!sessionActual) return mostrarError('Debes iniciar sesión para guardar favoritos.');
    setLoading(boton, true);
    try {
        await guardarFavorito(sessionActual.access_token, { juego_api_id: gameID, titulo, precio_alerta: '0.00' });
        boton.textContent = '✓ Guardado'; boton.disabled = true;
        cargarFavoritos();
    } catch (e) { mostrarError(e.message); setLoading(boton, false); }
};

async function cargarFavoritos() {
    if (!sessionActual) return;
    favoritosEl.innerHTML = '<p class="loading">Cargando favoritos...</p>';
    try {
        const favs = await obtenerFavoritos(sessionActual.access_token);
        renderizarFavoritos(favs);
    } catch { favoritosEl.innerHTML = '<p class="error-inline">No se pudieron cargar los favoritos.</p>'; }
}

function renderizarFavoritos(favs) {
    if (!favs?.length) { favoritosEl.innerHTML = '<p class="vacio">Aún no tienes juegos favoritos. ¡Busca uno y guárdalo!</p>'; return; }
    favoritosEl.innerHTML = favs.map(f => `
        <div class="card-favorito" id="fav-${f.id}">
            <div class="fav-info">
                <h4>${escapeHtml(f.titulo)}</h4>
                <span class="fav-alerta">Alerta: <strong>${precio(f.precio_alerta)}</strong></span>
                <span class="fav-fecha">${new Date(f.fecha_guardado).toLocaleDateString('es-ES')}</span>
            </div>
            <div class="fav-acciones">
                <button class="btn-ver-deals-sm" onclick="window.abrirDeals('${f.juego_api_id}','${escapeHtml(f.titulo)}')">Ver precios</button>
                <button class="btn-eliminar" onclick="window.eliminarJuego('${f.id}',this)">Eliminar</button>
            </div>
        </div>
    `).join('');
}

window.eliminarJuego = async (id, boton) => {
    if (!sessionActual) return;
    setLoading(boton, true);
    try {
        await eliminarFavorito(sessionActual.access_token, id);
        document.getElementById(`fav-${id}`)?.remove();
        if (!favoritosEl.children.length) favoritosEl.innerHTML = '<p class="vacio">Aún no tienes juegos favoritos.</p>';
    } catch (e) { mostrarError(e.message); setLoading(boton, false); }
};

// ── Populares con caché diaria ────────────────────────────────────────────────
async function cargarPopulares() {
    const cached = JSON.parse(localStorage.getItem(POPULARES_CACHE_KEY) || 'null');
    if (cached?.fecha === HOY && cached.datos?.length) { renderizarPopulares(cached.datos); return; }
    popularesGrid.innerHTML = '<p class="loading">Cargando juegos populares...</p>';
    try {
        const juegos = await obtenerPopulares();
        localStorage.setItem(POPULARES_CACHE_KEY, JSON.stringify({ fecha: HOY, datos: juegos }));
        renderizarPopulares(juegos);
    } catch {
        if (cached?.datos) renderizarPopulares(cached.datos);
        else popularesGrid.innerHTML = '<p class="error-inline">No se pudieron cargar los juegos populares.</p>';
    }
}

function renderizarPopulares(juegos) {
    if (!juegos?.length) { popularesGrid.innerHTML = '<p class="vacio">No hay juegos disponibles.</p>'; return; }
    popularesGrid.innerHTML = juegos.map(j => {
        const tieneDesc = j.descuento > 0;
        const steam = j.steam_rating;
        const meta  = j.metacritic;
        let badge = '';
        if (steam > 0) {
            const cls = steam>=80?'meta-verde':steam>=60?'meta-amarillo':'meta-rojo';
            badge = `<span class="metacritic-badge ${cls}" title="${escapeHtml(j.steam_texto||'Steam')}">⭐ ${steam}%</span>`;
        } else if (meta > 0) {
            const cls = meta>=85?'meta-verde':meta>=70?'meta-amarillo':'meta-rojo';
            badge = `<span class="metacritic-badge ${cls}" title="Metacritic">MC ${meta}</span>`;
        }
        return `
        <div class="card-popular" data-id="${j.gameID}">
            ${tieneDesc ? `<span class="badge-descuento">-${j.descuento}%</span>` : ''}
            <img src="${escapeHtml(j.portada)}" alt="${escapeHtml(j.titulo)}" loading="lazy">
            <div class="card-popular-info">
                <h3>${escapeHtml(j.titulo)}</h3>
                <div class="popular-meta-row">
                    ${badge}
                    <div class="popular-precios">
                        ${tieneDesc
                            ? `<span class="precio-tachado">${precio(j.precio_normal)}</span>
                               <span class="precio-oferta">${precio(j.precio_oferta)}</span>`
                            : `<span class="precio-oferta">${precio(j.precio_oferta)}</span>`}
                    </div>
                </div>
                <div class="acciones">
                    <button class="btn-ver-deals" onclick="window.abrirDeals('${j.gameID}','${jsEscape(j.titulo)}')">
                        🏪 Ver tiendas
                    </button>
                    <button class="btn-guardar" onclick="window.guardarJuego('${j.gameID}','${jsEscape(j.titulo)}',this)">
                        + Favoritos
                    </button>
                </div>
            </div>
        </div>`;
    }).join('');
}

// ── Bootstrap ─────────────────────────────────────────────────────────────────
(async () => {
    tasas = await obtenerTasas();
    const expirada = await verificarInactividad();
    if (expirada) actualizarUI(null);
})();

// ── Helpers ───────────────────────────────────────────────────────────────────
function escapeHtml(str) {
    return String(str)
        .replace(/&/g,'&amp;').replace(/</g,'&lt;')
        .replace(/>/g,'&gt;').replace(/"/g,'&quot;')
        .replace(/'/g,'&#039;');
}
// Para strings que van dentro de onclick='...': escapa \ y ' para JS
function jsEscape(str) {
    return String(str).replace(/\\/g,'\\\\').replace(/'/g,"\\'");
}
