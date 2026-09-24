# Piloto automático con una ficha real de Google Business Profile

El cliente no descarga un CSV ni entrega una API key. ReviewFlow usa un proyecto Google Cloud aprobado; el propietario o gestor entra con su propia cuenta Google, concede OAuth y elige una ficha que administra. Google [exige OAuth](https://developers.google.com/my-business/content/implement-oauth) para acceder a esos datos y [prohíbe exigir a clientes finales que soliciten su propio proyecto Business Profile](https://developers.google.com/my-business/content/policies).

## 1. Confirmar la ficha piloto

Hace falta una ficha real administrada por el usuario o un cliente piloto voluntario. Para solicitar acceso a la API, Google pide gestionar una ficha verificada y activa durante al menos 60 días, con una web que represente al negocio; el solicitante debe figurar como propietario o gestor. [Requisitos oficiales](https://developers.google.com/my-business/content/prereqs). No existe un sandbox de Business Profile para sustituir la ficha real. [Configuración básica](https://developers.google.com/my-business/content/basic-setup).

## 2. Solicitar acceso de ReviewFlow

En Google Cloud Console, crear o elegir el proyecto de ReviewFlow, copiar su **número de proyecto** y enviar el formulario de *Basic API Access* enlazado desde los [requisitos de Google](https://developers.google.com/my-business/content/prereqs). Comprobar la cuota después de la respuesta de Google: la documentación indica que 0 QPM significa que el proyecto aún no está aprobado. No pedir a cada cliente que abra su propio proyecto.

Tras la aprobación, habilitar en ese proyecto las APIs que usa este flujo: **Google My Business API**, **My Business Account Management API** y **My Business Business Information API**. [Lista oficial y pasos de habilitación](https://developers.google.com/my-business/content/basic-setup).

## 3. Preparar OAuth

Configurar la pantalla de consentimiento y crear un cliente OAuth 2.0 de tipo **aplicación web**. Autorizar exactamente estos URI de retorno:

- `https://project-qdebw.vercel.app/api/google-business/callback`
- `http://localhost:3000/api/google-business/callback` para pruebas locales

El permiso solicitado por el código es `https://www.googleapis.com/auth/business.manage`. Google puede pedir información de marca, política de privacidad, términos y verificación adicional antes de publicar el consentimiento a clientes externos; revisar esos requisitos en la consola y no sustituirlos por textos legales improvisados. [Guía OAuth oficial](https://developers.google.com/my-business/content/implement-oauth).

## 4. Configurar ReviewFlow

Guardar el ID y secreto OAuth como `GOOGLE_BUSINESS_CLIENT_ID` y `GOOGLE_BUSINESS_CLIENT_SECRET` **solo en servidor**. Generar una clave de cifrado de 32 bytes en hexadecimal para `GOOGLE_TOKEN_ENCRYPTION_KEY`; con Node.js instalado se puede usar:

```powershell
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Guardar la clave en un gestor de secretos y mantenerla estable; cambiarla impide descifrar los tokens ya conectados. Establecer las tres variables en Producción de Vercel y, para pruebas locales, en `.env.local`. No enviarlas por chat ni añadirlas al repositorio. Tras cambiar variables de Vercel, desplegar una versión que las incorpore.

## 5. Probar el recorrido del cliente

1. Entrar en ReviewFlow y guardar el nombre del negocio.
2. Pulsar **Conectar con Google** y autorizar con la cuenta propietaria o gestora.
3. Elegir una ficha gestionada. Si el perfil ya tiene capturas anteriores pero aún no tenía una ficha vinculada, confirmar expresamente que se trata del mismo negocio. El sistema bloquea el cambio a otra ficha si existe histórico. Si la ficha no aparece, comprobar permisos, verificación y APIs habilitadas.
4. Abrir `/reviews` y `/dashboard`: deben mostrar reseñas reales, valoración y volumen de la ficha, fecha de consulta, cobertura y señales con evidencia suficiente. La [API lista hasta 50 reseñas por página](https://developers.google.com/my-business/reference/rest/v4/accounts.locations.reviews/list); la interfaz consulta hasta 200 y marca explícitamente cuando la muestra queda incompleta.
5. Desconectar en Configuración y comprobar que la consulta deja de funcionar.

Las reseñas de Google se consultan en directo y no se guardan en Supabase. El histórico automático de valoración/volumen y el análisis competitivo siguen pendientes de una base de uso y conservación revisada frente a las [políticas de Business Profile](https://developers.google.com/my-business/content/policies) y de una fuente competitiva licenciada. El piloto puede demostrar valor con reseñas propias actuales y cambios de temas entre fechas de publicación; no puede inventar una serie histórica de valoración anterior a la conexión.
