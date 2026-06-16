import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';

const SUPABASE_URL      = 'https://ydrtvlwahrupuftckhri.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlkcnR2bHdhaHJ1cHVmdGNraHJpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE1NTQ5NDgsImV4cCI6MjA5NzEzMDk0OH0.UMpnFCku8ntcSrpy3Mr6rr5G4Ejer4q5K2JD_hg5o88';

// URL base de la app — Supabase usa esto como destino de los emails de auth
const APP_URL = window.location.origin + window.location.pathname;

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: {
        persistSession:   true,
        autoRefreshToken: true,
        storageKey:       'gameprice_session',
    },
});

export async function getSession() {
    const { data } = await supabase.auth.getSession();
    return data.session;
}

export async function signIn(email, password) {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw new Error(error.message);
    return data.session;
}

export async function signUp(email, password) {
    const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: { emailRedirectTo: APP_URL },
    });
    if (error) throw new Error(error.message);
    return data; // data.session es null cuando la confirmación de email está activa
}

// Reenvía el email de confirmación de registro
export async function resendConfirmationEmail(email) {
    const { error } = await supabase.auth.resend({
        type:    'signup',
        email,
        options: { emailRedirectTo: APP_URL },
    });
    if (error) throw new Error(error.message);
}

// Envía el email de recuperación de contraseña
export async function resetPassword(email) {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: APP_URL,
    });
    if (error) throw new Error(error.message);
}

// Actualiza la contraseña del usuario autenticado (tras recuperación)
export async function updatePassword(newPassword) {
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) throw new Error(error.message);
}

export async function signOut() {
    const { error } = await supabase.auth.signOut();
    if (error) throw new Error(error.message);
}

export function onAuthStateChange(callback) {
    return supabase.auth.onAuthStateChange(callback);
}
