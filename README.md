# Turnos Jefes de Servicio

Aplicación simple en HTML, CSS y JavaScript para proyectar y guardar los turnos mensuales de 3 Jefes de Servicio.

## Archivos

- `.gitignore`
- `app.js`
- `index.html`
- `styles.css`
- `supabase.sql`
- `README.md`

## Supabase

El proyecto ya tiene configurados en `app.js` la Project URL y la publishable key entregadas para este proyecto.

Para preparar la base de datos:

1. Entra a Supabase > SQL Editor.
2. Copia y ejecuta `supabase.sql` completo.
3. En Authentication > Users crea los usuarios que podrán ingresar a la aplicación.
4. Abre la aplicación e inicia sesión con email y contraseña.
5. Usa **Guardar mes** y **Cargar mes**.

La tabla usada por la aplicación es `public.js_schedule_months`.

## Seguridad

La publishable key puede estar en el frontend. La protección de los datos se hace con Supabase Auth + RLS.

Nunca subas una `service_role` key al repositorio.
