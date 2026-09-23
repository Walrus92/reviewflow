# Estado de la migración incremental

Comprobado el 23 de septiembre de 2026 en el proyecto Supabase existente `jumsbafjzjnnlxhulvtk`. Se conservaron sus datos. El modelo original incluye `profiles` (1 fila), `users` (0), `magic_links` (9), `review_snapshots` (7), `competitors` (20), `competitor_relations` (20), `competitor_snapshots` (80), `alerts` (6), `analytics_visits` (14) y `analytics_clicks` (8). Son cantidades de la auditoría inicial; pueden cambiar.

## Fases realizadas

1. **Seguridad de datos:** RLS en las diez tablas y retirada de permisos directos de `anon` y `authenticated`. Las rutas usan la clave de servicio en servidor. Se comprobó 401 con clave anónima y lectura con clave de servicio.
2. **Identidad y acceso:** se eliminó el login de NextAuth que aceptaba cualquier email. Los enlaces de acceso son aleatorios, tienen hash en la base de datos, caducan en quince minutos y se consumen una vez. Las rutas principales resuelven el perfil desde la sesión y comprueban la propiedad. `npm run dev:local` permite abrir el enlace en la interfaz solo en desarrollo con Supabase y app en localhost.
3. **Modelo y consultas:** migración inicial reconstruida desde el esquema real, preferencias de visita y email, índices de histórico, unicidad de enlaces de competidores. El perfil vincula capturas propias; `competitor_relations` vincula un perfil con `competitors`, y `competitor_snapshots` cuelga del competidor. `alerts` pertenece al perfil. `users` sigue sin relación con `profiles` y está vacío.
4. **Intelligence MVP:** panel «Qué ha cambiado», comparación de valoración y volumen, histórico de solo lectura, insights deterministas, gestión de competidores y alertas existentes. Las comparaciones sin dos capturas se muestran como no disponibles.
5. **Desarrollo sin clientes:** página `/demo` con datos y reseñas ficticias; interfaz de análisis de reseñas desacoplada de la fuente. No se insertan esas reseñas en Supabase.
6. **Resumen semanal:** endpoint protegido, preferencia por perfil desactivada inicialmente, flag global desactivado e idempotencia en Resend. `vercel.json` programa una comprobación diaria a las 08:00 UTC; cada perfil recibe como máximo un resumen cada siete días y solo si existe una captura reciente. Falta desplegar y comprobar un envío real con remitente verificado.

## Pendiente antes de operación real

- Elegir una fuente autorizada para capturas históricas y texto de reseñas, con reglas de conservación claras. La API de Business Profile requiere acceso OAuth al negocio propio; la búsqueda de Places no suministra el corpus histórico completo de competidores.
- Conectar el programador de capturas cuando exista fuente autorizada. El cron de Vercel para el email está configurado en el repositorio, pero no se ha desplegado.
- El arranque local se verificó: `supabase start` y `supabase db reset` aplicaron las cinco migraciones, crearon diez tablas con RLS, sin grants de `anon`/`authenticated`. Se probó el acceso local, alta de perfil y consulta del resumen; después se limpió el usuario de prueba con otro reset.
- Adaptar las rutas heredadas de captura a una fuente autorizada; ahora están desactivadas por defecto. Se eliminaron las dos rutas duplicadas de alertas que no utilizaba la interfaz. Queda la ruta manual `/api/alerts/save`, también sin llamadas desde la interfaz.
- Revisar el modelo de alias de competidores: ahora el nombre es global al registro del Place ID y se comparte entre perfiles.
- Validar el despliegue y el envío real de email. Next.js se actualizó a 16.3.6 y `npm audit fix` dejó cero vulnerabilidades según la auditoría ejecutada; tipos, pruebas, build y lint pasan.
- La extensión `public.http` sigue en el esquema `public` y aparece en el asesor de seguridad de Supabase.

## Riesgos de datos heredados

`competitors.profile_id` era nulo en las 20 filas auditadas; la pertenencia está en `competitor_relations`. `competitor_snapshots.place_id` era nulo en las 80 filas y se identifica mediante `competitor_id`. La tabla `alerts` tiene `payload`, no `message`. El contenido JSON de las capturas heredadas debe revisarse frente a las condiciones de la fuente antes de una producción multiusuario.
