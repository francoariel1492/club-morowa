# Club Morowa

Aplicación local para abrir en **VS Code**. Frontend **React + TypeScript**, API **NestJS + TypeScript**, persistencia **MySQL 8**.

Esta entrega es una primera implementación funcional del núcleo del Club. Incluye portal responsive y panel de escritorio, con la paleta, tipografías y logo extraídos de la simulación más reciente. No está desplegada ni habilitada para operar con datos reales. Consultar `ALCANCE.md` para distinguir lo implementado de las funciones adicionales de la especificación.

## Abrir en VS Code

Abrir `club-morowa.code-workspace`, o **Archivo → Abrir carpeta** y elegir esta carpeta. Usar la terminal integrada para los comandos siguientes.

Requisito: Node.js 20.19 o posterior compatible. Las dependencias ya están instaladas en la carpeta de esta entrega; si se mueve el proyecto, ejecutar `npm ci`.

## Probar ahora sin instalar MySQL

```bash
npm ci
npm run demo
```

Abrir **http://127.0.0.1:5173**. Este modo usa la API NestJS con almacenamiento temporal en memoria. Tiene una franja visible de demostración, no envía emails y se reinicia al detener el servidor. `NODE_ENV=production` impide activar el almacenamiento de demostración.

| Acceso ficticio | Usuario | Contraseña |
| --- | --- | --- |
| Administradora | `admin@morowa.local` | `MorowaDemo2026!` |
| Vendedora | `vendedora@morowa.local` | `MorowaDemo2026!` |
| Clienta | `30412887` | `MorowaDemo2026!` |

El panel requiere una ventana de **1024 px o más**. El portal se adapta a celular y escritorio. No hay un selector público de roles: el servidor determina el acceso desde la sesión.

## Arrancar con MySQL

Con Docker Desktop o Docker Engine funcionando:

```bash
cp .env.example .env
npm ci
docker compose up -d
npm run db:seed
npm run dev
```

En Windows, copiar `.env.example` a `.env` desde el explorador de VS Code, o usar `Copy-Item .env.example .env` en PowerShell.

`db:seed` agrega solamente datos ficticios y se niega a sobrescribir una base con datos. Las credenciales son las de la tabla anterior, salvo que se cambie `SEED_PASSWORD` en `.env`.

Si ya hay MySQL, crear una base y un usuario exclusivos para Morowa y editar `DATABASE_URL`. No usar las bases personales existentes. El servidor crea las tablas iniciales al arrancar. Los valores por defecto del compose son exclusivamente para desarrollo y deben cambiarse para un entorno real.

Para una base limpia, sin socias ficticias, omitir `db:seed` y crear el primer usuario del equipo:

```bash
npm run user:add -- administracion@tu-dominio.com admin
npm run user:add -- ventas@tu-dominio.com seller
```

El comando pide una contraseña de al menos 12 caracteres en la terminal. No se guarda en el código. La clienta precargada utiliza su DNI inicialmente y debe cambiarlo, ingresar email y aceptar las bases antes de consultar sus datos; la clave inicial deja de servir a los 30 días.

## Trabajo cotidiano

- **Pendientes:** buscar por nombre, ticket o código, combinar con tipo y antigüedad. Las operaciones son compartidas; las pantallas se actualizan cada 30 segundos y después de cada acción.
- **Compras:** buscar por nombre, DNI o celular, elegir punto de venta, escribir hasta 8 dígitos, ingresar importe y seleccionar un voucher. Revisar el resumen antes de confirmar.
- **Clientas:** alta, ficha, puntos, compras y cuenta corriente. Las anulaciones con puntos usados o voucher necesitan aprobación de la administradora cuando las solicita una vendedora.
- **Portal:** puntos, solicitud y reemplazo de vouchers, lectura explícita de mensajes, estado de cuenta sin importes y preferencias.
- **Importación:** elegir maestro o saldos, revisar coincidencias, resolver o ignorar filas, y confirmar. Los archivos de `examples/` son los ejemplos suministrados. La importación del maestro no activa automáticamente las cuentas ni toma los consentimientos del Excel como aceptación de bases.
- **Configuración:** reglas, catálogo, regalos, textos y plantillas. Los regalos ya emitidos conservan sus condiciones.

El buscador por DNI consulta la API y recibe únicamente IDs coincidentes; el DNI no se incluye en los listados enviados al navegador.

## Emails y tareas automáticas

Configurar `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM` y `WEB_ORIGIN` en `.env`. Sin SMTP, los mensajes del portal funcionan y los emails quedan en cola, sin simular entregas. Los enlaces de activación y recuperación vencen en 48 horas y un enlace nuevo invalida el anterior. Las invitaciones de servicio pueden llegar sin consentimiento comercial; campañas y beneficios por email respetan la preferencia de la clienta.

El trabajador interno corre cada minuto mientras la API está encendida: resuelve vencimientos, avisos por lote, campañas y cumpleaños desde las 09:00 de Mendoza. Las operaciones son idempotentes. El envío SMTP reintenta hasta 5 veces con intervalos de 5 minutos y conserva errores e identificador del proveedor. No se instaló una automatización en la computadora ni se enviaron comunicaciones reales durante las pruebas.

Configurar `SHOP_WHATSAPP` con país y número, solo dígitos, para habilitar la consulta de cuenta desde el portal. No hay envío automático por WhatsApp.

## Pruebas y compilación

```bash
npm test
npm run build
# Con npm run demo en otra terminal:
npm run test:api
```

- 43 pruebas automatizadas: redondeo, FIFO, mínimos, reemplazos, caducidad, bloqueo, anulaciones, roles, privacidad e importación.
- 13 comprobaciones HTTP sobre la API demo: sesiones, aislamiento, permisos, doble envío concurrente, rollback y los dos Excel entregados.
- Revisión visual y de navegación en navegador a 1366 × 900 y 390 × 844: ingreso, pendientes, búsqueda y filtros combinados, portal y reemplazo de voucher.
- Compilación de API y frontend completada.

**Validación local posterior:** se inició MySQL 8.4.10 en Docker, en el puerto local 3307, con volumen persistente. Se verificaron el ingreso por la IP Wi-Fi, el modo MySQL (sin memoria demo), las 8 clientas, las 18 compras, los 10 usuarios de prueba y la sesión guardada en MySQL. La restauración y la entrega real de SMTP siguen pendientes de validación.

## Estructura

```text
apps/web/src/       React, estilos y cliente HTTP
apps/api/src/       NestJS, dominio, persistencia, importación y tareas
  domain.ts        Reglas y proyección segura por rol
  store.ts         Transacción MySQL y modo demo explícito
  imports.ts       Lectura y revisión de Excel
  main.ts          Rutas, sesiones y trabajador de email
  fixtures.ts      Datos ficticios
  maintenance.ts   Usuarios del equipo, respaldo y restauración
examples/          Planillas proporcionadas para pruebas
tests/             Pruebas de reglas e importación
scripts/           Arranque demo y comprobaciones HTTP
```

## Persistencia y seguridad de esta versión

MySQL usa tablas separadas por entidad con columna JSON (`customers`, `lots`, `vouchers`, `purchases`, `messages`, `campaigns`, `audit`, `outbox`, `users`, `sessions`) y una tabla de configuración. Cada operación usa una transacción y un bloqueo `SELECT … FOR UPDATE` sobre la configuración, serializando las escrituras. Un fallo revierte la operación completa. Se escriben solamente las entidades modificadas.

Es una implementación inicial para una tienda: carga el estado completo y tiene un bloqueo global. Para grandes volúmenes debe evolucionar a columnas indexadas, consultas paginadas y bloqueos por clienta. No se presenta como arquitectura de alto tráfico.

Contraseñas con bcrypt; sesión aleatoria de 256 bits, almacenada como hash en servidor; cookie HttpOnly, SameSite y Secure configurable; validación de origen en escrituras, protección temporal tras cinco fallos de ingreso y controles por rol en servidor. La API no expone datos sin sesión. La auditabilidad se mantiene sin borrar compras, vouchers ni movimientos al anular.

Para desplegar: servir el build de `apps/web/dist` por HTTPS, proxyear `/api` a NestJS, configurar el origen real y `COOKIE_SECURE=true`, ejecutar `npm run start -w apps/api` después del build y mantener el proceso activo. Revisar dependencias, límites de infraestructura, dominio, bases definitivas y SMTP. No se contrataron hosting ni servicios pagos.

## Respaldo y restauración

```bash
npm run backup -- backups/morowa-2026-11-12.json
# Solo sobre una base nueva y vacía configurada en DATABASE_URL:
npm run restore -- backups/morowa-2026-11-12.json
```

El respaldo contiene información privada y hashes de contraseña: mantenerlo fuera de Git y cifrarlo al almacenarlo o trasladarlo. El script crea el archivo con permisos restrictivos y no sobrescribe archivos existentes. No exporta sesiones. Restaurar se niega a sobrescribir una base con usuarios, clientas o compras. Verificar recuentos, puntos, vouchers e ingreso en una base de prueba antes de aceptar el respaldo como operativo. La programación y la prueba de restauración real siguen pendientes del entorno MySQL.

## Acceso local desde celular (configurado)

- En esta Mac: http://localhost:5173
- En el celular, conectado a la misma Wi-Fi: http://192.168.1.6:5173
- Clienta: `30412887` / `MorowaDemo2026!`
- Equipo, desde computadora: `admin@morowa.local` / `MorowaDemo2026!`

La aplicación está en modo MySQL, con datos ficticios persistentes. MySQL solo escucha en `127.0.0.1:3307`; el celular entra a la web, que comunica con la API. Mantener la Mac encendida y evitar el reposo mientras se usa desde el teléfono.

Para volver a arrancar, abrir Docker Desktop y ejecutar `iniciar-local.command`, o desde la terminal:

```bash
docker compose up -d mysql
npm run dev:lan
```

Si cambia la IP Wi-Fi de la Mac, actualizar `WEB_ORIGIN` en `.env` y reiniciar la aplicación. `EXTRA_WEB_ORIGINS` permite añadir orígenes concretos separados por coma. Se mantienen los controles de origen, las sesiones y los roles. Este acceso HTTP es para pruebas locales con datos ficticios.
