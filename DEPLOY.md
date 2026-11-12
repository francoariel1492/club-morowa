# Prueba en internet: Render + Aiven MySQL + Resend

## Qué queda preparado

`render.yaml` define una aplicación Node en plan **free**. NestJS sirve React y `/api` en el mismo dominio HTTPS, evitando cookies entre dominios. La base es MySQL externa, con TLS y verificación de certificado. Ningún secreto, base local ni respaldo se sube a GitHub.

## 1. MySQL gratuito en Aiven

Crear un servicio **MySQL Free**, no un trial de pago. Guardar la URI de conexión de Aiven y su certificado CA. En Render se cargan como `DATABASE_URL` y `DATABASE_CA_PEM`; `DATABASE_SSL=true` mantiene la verificación TLS. Usar una base nueva para esta prueba. No hace falta publicar la base local ni abrir el puerto de la Mac.

Referencia: https://aiven.io/docs/products/mysql/concepts/mysql-free-tier

## 2. Correo de recuperación con Resend

El plan gratuito de Render bloquea SMTP en los puertos habituales. Se agregó Resend por HTTPS; SMTP continúa disponible para otros entornos.

- Crear una cuenta Resend y una API key de envío.
- Guardarla **solo** como `RESEND_API_KEY` en los secretos del hosting, nunca en GitHub ni en el chat.
- `MAIL_FROM=Club Morowa <onboarding@resend.dev>` sirve para pruebas al email propietario de la cuenta Resend.
- Para enviar a otras personas, verificar un dominio propio y cambiar `MAIL_FROM` a una dirección de ese dominio.
- La cuenta de Morowa debe tener un email real registrado. Las socias de ejemplo usan direcciones ficticias; no se envía correo a esas direcciones.

Si falta el proveedor, recuperación informa que el servicio no está habilitado y no afirma que envió un correo. La API permite recuperar tanto clientas por DNI como integrantes del equipo por email. Un ID del proveedor indica aceptación del envío, no confirmación de llegada a la bandeja de entrada.

Referencias: https://resend.com/docs/api-reference/emails/send-email y https://resend.com/docs/knowledge-base/403-error-resend-dev-domain

## 3. Render gratuito

Conectar este repositorio a un Blueprint de Render. Revisar que `plan: free` siga seleccionado y cargar los secretos solicitados:

| Variable | Valor |
| --- | --- |
| `DATABASE_URL` | URI MySQL de Aiven |
| `DATABASE_CA_PEM` | Certificado CA de Aiven |
| `BOOTSTRAP_ADMIN_EMAIL` | Tu email real |
| `BOOTSTRAP_ADMIN_PASSWORD` | Contraseña privada nueva, mínimo 16 caracteres |
| `RESEND_API_KEY` | Clave del proveedor de correo |
| `MAIL_FROM` | Remitente autorizado por Resend |

El primer arranque crea la administradora **solo si la base está vacía**. Quitar las variables `BOOTSTRAP_ADMIN_*` después de la inicialización. No usar la contraseña demo pública en el servidor de prueba. `SEED_DEMO_ON_EMPTY=true` permite precargar ejemplos con esa contraseña privada si se desea; por defecto está desactivado.

`RENDER_EXTERNAL_URL` se usa automáticamente para los enlaces de recuperación y el control de origen. Si se agrega un dominio propio, configurar `WEB_ORIGIN` con ese HTTPS exacto. Las cookies son Secure en producción. `MOROWA_DEMO` no activa memoria temporal en producción.

El despliegue se comprueba visitando `/api/health`, ingresando y creando una compra de prueba. Antes de invitar clientas reales, verificar recuperación de contraseña con un email real, la persistencia tras reiniciar, respaldos y las funciones pendientes en `ALCANCE.md`.

## Límites del plan gratuito

Render puede suspender el proceso por inactividad. La primera visita puede demorar y las tareas de cumpleaños, campañas y correos solo corren cuando la API está despierta. No es un servicio con garantía de disponibilidad ni de ejecución puntual del trabajo en segundo plano. La base de Aiven tiene sus propios límites de capacidad e inactividad. No se habilitan upgrades ni servicios de pago automáticamente desde este proyecto.

Referencia: https://render.com/docs/free
