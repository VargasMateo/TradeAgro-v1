# Cambios: título del informe, link demo y dashboard mobile

Rama: `feature/mobile-stations-home`

## 1. Nombre de la central en el título del informe

**Qué se pide:** en el título del informe, agregar el nombre de la central para la cual se genera.

**Hoy** ([MeteoReport.tsx](../src/components/MeteoReport.tsx), encabezado del informe):
- Título: "Reporte meteorológico de aplicación".
- La central aparece solo en la línea de abajo: `Período: dd/MM/yyyy al dd/MM/yyyy - Central: {selectedDeviceName}`.
- El nombre del PDF ya incluye la central.

**Cambio:** el título pasa a incluir la central, por ejemplo "Reporte meteorológico de aplicación - {central}". La línea del período se mantiene.

**A definir:** el nombre llega como `Campo - Estación`. ¿Se muestra completo o solo la parte antes del `" - "`?

**Alcance:** un solo archivo, sin cambios en el servidor.

## 2. Link de acceso directo a las estaciones para la cuenta demo

**Qué se pide:** poder mandar un link que lleve directo a las estaciones, para la cuenta demo.

**Hoy:**
- El acceso demo pasa por el formulario de login (usuario + CUIT) y `POST /backend/login-demo`.
- El CUIT se valida contra `demo_padron`. El acceso vence a los 7 días del primer ingreso.
- Se entra como `demo@tradeagro.com`, con `isDemo: true`. Esa cuenta tiene estaciones habilitadas (todas).
- No existe ningún link directo.

**Propuesta:** un link con token que inicia la sesión demo y redirige a `/stations`, sin pasar por el formulario.
- Se genera desde la pantalla "Cuentas Demo" (botón "Copiar link"), del mismo modo que hoy se generan los links de órdenes.
- Al abrirlo, el servidor valida el token, emite el mismo JWT que `login-demo` y el front guarda la sesión y navega a `/stations`.
- Se respetan las reglas demo actuales: expiración y reportes limitados a 7 días.

**A definir:**
- ¿Un link por persona del padrón (se puede revocar y se sabe quién entró) o uno genérico?
- ¿Vence? Propuesta: mismo vencimiento de 7 días desde el primer uso.

**Alcance:** servidor (endpoint nuevo) + front (ruta que recibe el token) + botón en Cuentas Demo. Requiere deploy del servidor.

## 3. Dashboard en celu: dos accesos directos

**Qué se pide:** al entrar al dashboard desde el celu, reemplazar las secciones "Próximas Órdenes" y "Tus Estaciones Meteorológicas" por dos accesos directos: uno a las órdenes de trabajo y otro a las estaciones.

**Hoy** ([DashboardPage.tsx](../src/pages/DashboardPage.tsx)):
- "Próximas Órdenes" (`UpcomingWorkOrders`) y "Tus Estaciones Meteorológicas" (mapa con `<Map>`) se muestran siempre.
- El dashboard carga al abrir: clientes, órdenes y, por estación, una request para sacar coordenadas. Es lo que lo hace lento.

**Cambio:**
- En pantallas chicas (menos de 1024 px, el mismo punto de corte `lg` del layout) esas dos secciones se reemplazan por dos tarjetas grandes:
  - **Órdenes de trabajo** → `/work-orders`
  - **Estaciones meteorológicas** → `/stations`
- La tarjeta de estaciones solo aparece si el usuario tiene acceso (`hasStations` y `allowedStations` no vacío; profesionales y admin siempre), igual que el menú lateral.
- En mobile no se hacen las cargas de esas secciones (órdenes próximas y coordenadas de estaciones), que es donde está la demora.
- En escritorio el dashboard queda igual.
- Lo que hay arriba (saludo, accesos rápidos, resumen) no se toca.

**A definir:**
- ¿Aplica a todos los roles (cliente, profesional, admin) o solo clientes? Propuesta: todos.
- ¿Los contadores del resumen siguen en mobile? Si usan los mismos datos de órdenes y clientes, la carga se mantiene para ellos.

## Orden sugerido
1. Título del informe (rápido, aislado).
2. Dashboard mobile.
3. Link demo (necesita servidor).

Los puntos 1 y 2 son solo front. El 3 requiere deploy de servidor.
