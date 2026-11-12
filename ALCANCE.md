# Alcance y decisiones

La petición directa del usuario fija React con TypeScript, NestJS y MySQL, portal de clientas responsive y panel Morowa solo para computadora con filtro de pendientes. Se usó como referencia funcional la especificación numerada más reciente de 18 páginas y como referencia visual el HTML numerado más reciente. Las copias anteriores no se mezclaron. El mensaje al desarrollador solicita presupuesto y contratación: se trató como contexto, no como autorización para contratar, publicar o contactar personas.

## Implementado

- Acceso privado, roles fijos de administradora, vendedora y clienta; sesión, recuperación por enlace y primer ingreso obligatorio.
- Alta desde panel, solicitud de registro, aprobación/rechazo, aceptación fechada de bases y consentimientos separados, bienvenida una vez.
- Portal responsive: inicio, puntos, vencimientos, solicitud/cancelación/reemplazo de vouchers, historial, mensajes, estado de cuenta sin montos, perfil y condiciones.
- Panel desde 1024 px: pendientes con búsqueda y filtros combinados, clientas y ficha, compras con previsualización, catálogo, campañas de puntos, mensajes, importaciones, reportes y configuración.
- Puntos por lotes con vencimiento de meses calendario y FIFO, multiplicador más alto, mínimo sobre importe previo al voucher, puntos sobre pagado, ticket único por punto de venta, anulación auditada y aprobación de casos especiales.
- Una solicitud a la vez, reemplazo atómico, conservación de fecha original, uso de regalos y vouchers en caja, bloqueo manual y penalización explícita que también alcanza los puntos retenidos.
- Importación XLSX de maestro y saldos con revisión/confirmación, validación de totales, detección de DNI duplicado, cruce por palabras del nombre, resolución manual, exclusión de TOTALES, marca BLOQUEADA y conservación del bloqueo hasta una decisión manual.
- Tareas de cumpleaños, avisos por vencer, vencimiento de solicitudes y campañas. Buzón con lectura explícita, cola SMTP e intentos de entrega.
- Reporte básico por período, exportación CSV, impresión A4; mantenimiento por CLI para usuarios del equipo y respaldos.

## Decisiones tomadas para poder probar

- Bloquear no quita puntos por defecto. La administradora debe elegir expresamente la penalización. Si la elige, se cancelan las solicitudes y se pierden también sus puntos retenidos.
- Se permiten tickets distintos el mismo día. No se aplicó un límite diario de vouchers no definido en la documentación.
- Bienvenida inicial: $2.000, mínima $50.000, 30 días. Editable.
- Cumpleaños inicial: monto fijo $10.000, mínima $100.000, 15 días. Editable.
- Día de cumpleaños a partir de las 09:00 de Mendoza. No se generan regalos retroactivos por días en que el servidor estuvo apagado.
- Una importación que deja de traer BLOQUEADA no desbloquea por sí sola. El administrador decide desde la ficha.
- Los duplicados del maestro requieren revisión/corrección del archivo. No se fusionan silenciosamente datos personales contradictorios.

## Funciones de la especificación amplia aún no desarrolladas

Estas funciones no se deben dar por entregadas ni aceptar como criterios cumplidos de producción:

1. Campañas de recuperación de inactivas, segmentos, vouchers de campaña y atribución de resultados. Esta versión tiene campañas globales de puntos ×2/×3.
2. Regalo de cumpleaños porcentual con tope y selección de hora desde configuración. Actualmente se ofrecen regalos de monto fijo y hora fija de las 09:00.
3. Bandeja interna de avisos con confirmación de lectura individual por cada integrante del equipo.
4. Acreditación de tickets antiguos con flujo específico de revisión, registro sin clienta y pedido de más datos en un registro. Hay compras identificadas y ajustes administrativos auditados.
5. Envío manual de estados de cuenta por WhatsApp con plantilla, seguimiento y filtro mensual. Solo está preparado el contacto de consulta desde el portal.
6. Reenvío masivo de invitaciones y envío automático de activación a precargadas al cumplir 30 días; existe reenvío individual, vencimiento de clave inicial y recuperación.
7. Edición visual de usuarios y delegación dinámica de permisos. Los roles están validados en servidor y los usuarios del equipo se crean por CLI.
8. Fusión asistida de duplicados del maestro, conversión persistida de “Último Comp.” relativo a fecha y listado dedicado de ausentes/no socias. El importador muestra filas y permite resolver/ignorar, y ofrece poner en cero las cuentas no seleccionadas.
9. Reporte de frecuencia antes/después del alta, métricas detalladas por cohortes, XLSX de salida y exportación completa de datos desde interfaz. Hay reporte básico, CSV de compras y respaldo completo por CLI.
10. Restauración verificada, SMTP real, HTTPS y despliegue de producción. MySQL real ya se inició y verificó localmente con Docker; los otros puntos siguen pendientes.

## Pruebas

Las pruebas del proyecto son nuevas y ejecutan el dominio TypeScript. El JavaScript adjunto prueba una simulación HTML y no se reutilizó como backend ni se presenta su resultado como verificación de esta aplicación.
