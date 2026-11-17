# Cambios del cliente — entorno de prueba

Rama: `cambios-cliente-pruebas`. La demo local sigue aislada. La publicación autorizada usa el servicio existente https://club-morowa.onrender.com y su MySQL de Aiven; no instala datos ficticios ni cambia las credenciales del administrador.

## Iniciar

Con Node 20.19 o posterior, desde esta carpeta:

```sh
npm run preview:test
```

Abrir http://localhost:4010. Para volver a compilar después de editar, detener con Ctrl+C y ejecutar el mismo comando.

| Rol | Email | Contraseña de prueba |
|---|---|---|
| Administradora | admin@morowa.local | MorowaDemo2026! |
| Vendedora | vendedora@morowa.local | MorowaDemo2026! |
| Clienta activa | clienta0@example.invalid | MorowaDemo2026! |

El servidor usa memoria, con personas y movimientos ficticios. Los cambios se pierden al reiniciarlo. No envía correos reales, aunque exista un proveedor configurado en `.env`. No conecta a MySQL en este modo. La persistencia MySQL del proyecto se conserva para una futura prueba con una base exclusiva; la migración se verificó en una base MySQL local exclusiva antes de publicar. El servidor guarda un respaldo previo en `app_migration_backups` al migrar por primera vez.

## Recorrido para validar con el cliente

1. Crear una cuenta desde «Sumate al Club»: nombre y apellido, email, celular, cumpleaños, contraseña y aceptación de textos de prueba. Promociones opcionales.
2. Entrar como administradora. En Pendientes, aprobar el registro; cuenta corriente comienza en No. La clienta ingresa con su email y la contraseña que eligió. Se emite una sola bienvenida.
3. Para una cuenta precargada, abrir la ficha y copiar el enlace de activación. Abrirlo en otra sesión: pide contraseña, aceptación y datos faltantes. Vence en cuatro horas y sirve una vez. En demo, este enlace sustituye la recepción de un correo real.
4. Registrar compras; comprobar puntos sobre el importe efectivamente pagado, número de ticket de ocho dígitos, duplicados por punto de venta y canje en el mismo resumen.
5. Desde el portal, subir una foto de ticket. Desde Pendientes, revisar y aprobar, rechazar o pedir información. No acredita puntos antes de aprobar.
6. Probar Campañas, Mensajes programados, Usuarios, plantillas automáticas e importación con vista previa. Los eventos de entrega/rebote de email se pueden simular desde Mensajes.
7. En Reportes, seleccionar período, exportar Excel o imprimir/guardar PDF. Los registros históricos sin fecha de emisión de voucher se muestran por separado.
8. Entrar como vendedora para verificar restricciones: no puede aprobar registros, cambiar cuenta corriente, administrar usuarios, configuración, importaciones ni reportes.

## Implementado para pruebas

- Registro y acceso por email, sin DNI como credencial; validación de celular argentino y cumpleaños; contraseña propia en autorregistro y activación por enlace para precargas.
- Consentimientos separados y versiones de textos aceptados, respuesta neutral de recuperación, una bienvenida por activación.
- Roles, administración de equipo, revocación de sesiones al deshabilitar o cambiar rol, cierre por inactividad, auditoría.
- Cuenta corriente independiente del estado del club; importaciones de saldos no la habilitan ni bloquean el club.
- Puntos retenidos hasta activación durante 30 días, vencimiento desde la compra, control de tickets duplicados, vouchers y anulaciones sin saldo negativo por esa operación.
- Fotos comprimidas de tickets con acceso exclusivo del equipo; hasta tres pendientes y antigüedad de hasta 30 días.
- Campañas con multiplicador, aviso, regalo fijo/porcentual o bono, segmentación, fechas de envío y vigencia, pausa/duplicado y borradores locales. Límite de cuatro promociones manuales por clienta al mes.
- Historial de mensajes, reintentos, estado de entrega simulado, prueba/restauración de plantillas y tandas de invitaciones.
- Importación CSV/XLSX con validaciones, email único y deshacer última importación sin cuentas activadas ni compras.
- Reportes de ventas registradas en el Club, clientas, vencimientos, vouchers, embudo, cuenta corriente, control, puntos/regalos pendientes, campañas y recompra; exportación Excel e impresión A4.
- Catálogo desactivable, guardado de configuración y formularios protegidos contra cierre accidental.

## Límites y trabajo pendiente antes de producción

- Correo de dominio propio: DNS/SPF/DKIM/DMARC y credenciales del proveedor no configurados. Entregas/rebotes se simulan; falta conectar y validar eventos reales del proveedor.
- Bases y privacidad son textos de prueba. Reemplazar por las versiones aprobadas por el abogado.
- Reportes no incluyen ventas totales de Ninox: requieren una fuente de ventas mensuales. Los resultados de campañas son métricas descriptivas, no atribución comercial.
- La unificación de duplicados es conservadora: la cuenta origen debe estar sin activar, sin vouchers y sin cuenta corriente ni saldos. Los demás casos requieren conciliación manual para no perder datos.
- Los borradores de mensajes/campañas son locales al navegador, no compartidos entre equipos.
- El trabajador de vencimientos y notificaciones corre dentro de la API. Para operación real debe verificarse su disponibilidad, horario acordado y recuperación tras suspensión del servidor.
- Faltan validación de correo real de punta a punta, prueba de restauración sobre MySQL de staging y revisión completa de todos los escenarios del PDF con el cliente.

## Verificación ejecutada

```sh
node --import tsx --test tests/*.test.ts
npm run build
npm run test:changes
```

La prueba de API requiere una instancia demo recién iniciada en el puerto 4010; crea datos ficticios y activa una cuenta precargada de ejemplo. No ejecutarla contra producción. Las pruebas cubren autorización, registro/aprobación, tokens de un uso, consentimiento, duplicados, tickets, puntos, importación, fechas de reportes y restricciones de correo.

## Correo real de prueba sin dominio verificado

Configuración preparada para Resend y el Render existente:

- `RESEND_API_KEY`: clave privada de Resend con permiso de envío; nunca guardar en Git.
- `MAIL_FROM`: `Club Morowa Pruebas <onboarding@resend.dev>`.
- `MAIL_TEST_MODE`: `true`.
- `MAIL_TEST_RECIPIENT`: casilla autorizada del titular de Resend.
- `MAIL_TEST_START_AT`: fecha ISO UTC de habilitación; evita enviar la cola histórica al activar las pruebas.

En este modo los correos nuevos se dirigen exclusivamente a la casilla de pruebas, aunque el registro de la clienta tenga otra dirección. El asunto lleva `[PRUEBA MOROWA]` y el cuerpo identifica el destinatario original. Los enlaces conservan su uso único y su vencimiento. El panel de administración informa este desvío; no equivale a una entrega a la clienta. No utilizar con información de clientas reales sin autorización. Para enviar a cada clienta, verificar el dominio, cambiar el remitente y desactivar `MAIL_TEST_MODE`.
