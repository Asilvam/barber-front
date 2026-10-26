# 💈 Barber System Frontend

Frontend moderno y de alto rendimiento para el sistema de agendamiento de citas de barbería, desarrollado con **React**, **TypeScript**, **Vite** y **Material UI (MUI)**.

Este cliente web interactúa de forma ágil y segura con una API REST externa, ofreciendo una experiencia premium e intuitiva para los clientes y herramientas de administración granulares para la gestión de horarios del personal.

---

## 🚀 Características Clave

* **🔐 Autenticación Avanzada**:
  - Registro de usuarios y acceso manual a través de credenciales seguras.
  - Integración nativa de inicio de sesión con **Google Sign-In**.
  - Control de acceso y redirección basada en roles (`user`, `admin`, `barber`).

* **🧭 Navegación Unificada & Estética Premium**:
  - **NavBar Global**: Implementado de manera centralizada en el cascarón de la SPA (`App.tsx`), garantizando su visualización en todas las secciones.
  - **Menú Hamburguesa Global**: Se eliminó el menú clásico de escritorio a favor de una hamburguesa universal minimalista. Al abrirse, despliega un menú lateral (Drawer) diseñado como tarjeta flotante, translúcida (`backdrop-filter`) y de bordes redondeados.
  - **Estructura Compacta**: Altura de menú acortada y optimizada con paddings reducidos y un layout sumamente estilizado.
  - **Log Out Integrado**: Botón "Cerrar Sesión" integrado directamente en el menú lateral, el cual borra el almacenamiento local y redirige al usuario automáticamente a la página de **Inicio (Home `/`)**.
  - **Optimización de Identidad Visual (Logos)**: Estilos segregados para el logotipo de cabecera (`img_5` en cover completo redondo con borde dorado) y del menú flotante (`img_6` en contain flotando concéntricamente), asegurando que ambos luzcan nítidos y sin deformaciones.
  - **Vocabulario Empático ("Reserva")**: Renombre global de "Dashboard" por **"Reserva"** en todas las vistas y flujos visibles al usuario, humanizando la interfaz.

* **📅 Agendamiento de Citas en Tiempo Real**:
  - Visualización y selección interactiva de barberos activos.
  - Calendario adaptativo utilizando `@mui/x-date-pickers` para la selección de fechas.
  - Cálculo dinámico de bloques de horas disponibles por día (bloques de 1 hora), evitando superposición de citas.
  - Alertas interactivas premium mediante **SweetAlert2** para la confirmación de la cita.

* **⚙️ Panel Administrativo (Gestión de Horarios)**:
  - **Admin Barberos**: Panel dedicado a configurar la disponibilidad y perfiles de cada barbero de manera independiente, accesible desde el menú hamburguesa para el rol administrador.
  - **Programación por Rango de Fechas**: Capacidad para replicar la programación horaria de un rango específico de forma masiva (máximo 62 días para protección de red).
  - **Plantillas Predefinidas (Presets de Turnos)**:
    - *Turno A*: Horario continuo de 9:00 a 19:00 con colación de 13:00 a 14:00.
    - *Turno B*: Horario de 9:00 a 19:00 con colación diferida de 14:00 a 15:00.
  - **Flexibilidad Horaria**: Permite añadir, remover o personalizar bloques de trabajo y descansos al instante.
  - **Días Libres**: Switch para marcar un día como no laborable rápidamente.

---

## 🛠️ Tecnologías y Librerías

El ecosistema tecnológico del frontend incluye:
* **Core**: React 19, TypeScript 6, Vite 8.
* **Componentes & UI**: Material UI (MUI) v9 (`@mui/material`, `@mui/icons-material`, `@mui/x-date-pickers`).
* **Estilos**: Vanilla CSS combinado con el sistema de temas personalizados de Emotion / Material UI.
* **Manejo de Fechas**: Day.js con soporte nativo en español.
* **Peticiones HTTP**: Axios con interceptores personalizados para adjuntar el token Bearer (`Authorization: Bearer <jwt>`).
* **Enrutamiento**: React Router v7.
* **Feedback Visual**: SweetAlert2 (alertas de éxito, confirmación interactiva y manejo elegante de errores).

---

## ⚙️ Requisitos Previos

* **Node.js**: Versión `24.22.0` (especificada en `.nvmrc`; rama compatible `24.x`).
* **Gestor de Paquetes**: `npm 11.x` (validado con `11.19.1`).
* **nvm**: Para seleccionar la versión indicada por el proyecto.

---

## 🚀 Configuración y Puesta en Marcha

### 1. Clonar e Instalar Dependencias
Instala los paquetes necesarios en el directorio raíz:
```bash
nvm install
nvm use
npm ci
```

`npm ci` instala las versiones fijadas en `package-lock.json`. Usa `npm install`
cuando necesites cambiar dependencias. Las decisiones revisadas sobre scripts de
instalación están registradas en `allowScripts`, dentro de `package.json`.

### 2. Configurar Variables de Entorno
Crea un archivo `.env` en la raíz del proyecto y define las siguientes variables:
```env
# URL base de la API backend de la barbería
VITE_API_BASE_URL=http://localhost:3000

# Nombre comercial de la barbería visible en toda la aplicación
VITE_BUSINESS_NAME="Mi Barbería Premium"

# ID de cliente de la API de Google para el inicio de sesión
VITE_GOOGLE_CLIENT_ID=tu-google-client-id.apps.googleusercontent.com
```

El ejemplo apunta al backend local. Para otro entorno, configura la URL de su API.
El backend debe permitir el origen del frontend en `CORS_ORIGIN`; con Vite en su
puerto predeterminado es `http://localhost:5173`.

### 3. Servidor de Desarrollo
Para iniciar la aplicación en modo desarrollo local con HMR (Hot Module Replacement):
```bash
npm run dev
```

### 4. Construcción para Producción
Para compilar y optimizar la aplicación para su despliegue en producción:
```bash
npm run build
```
Los archivos optimizados y minificados se generarán en la carpeta `dist/`.

### 5. Control de Calidad (Linting)
Para realizar análisis estático de código mediante ESLint:
```bash
npm run lint
npm audit
```

El proyecto no tiene un script de pruebas unitarias configurado. Las verificaciones
actuales del frontend son lint y build; las 37 pruebas unitarias corresponden al
backend. La última auditoría reportó 0 vulnerabilidades; el resultado puede cambiar
con la publicación de nuevos avisos.

---

## 📐 Estructura del Proyecto

```text
src/
├── api/          # Archivos de conexión y llamadas a la API REST (Axios)
├── assets/       # Imágenes, logotipos y recursos estáticos
├── components/   # Componentes globales reutilizables (ej: NavBar)
├── pages/        # Vistas de la aplicación (Home, Login, Dashboard, Admin, Availability)
├── types/        # Interfaces y tipos comunes en TypeScript
├── App.tsx       # Enrutador principal y cascarón de la SPA
├── index.css     # Estilos globales y variables css
└── main.tsx      # Punto de entrada de la aplicación
```

## Gestión de clientes (administración)

La ruta `/admin/clients`, accesible desde el menú **Clientes**, permite buscar clientes por nombre o correo, consultar sus reservas e historial de acceso y bloquear o desbloquear nuevas reservas. El bloqueo exige un motivo interno y confirmación; no cancela las reservas vigentes. El desbloqueo conserva el historial. Los motivos se muestran únicamente a administración.

Requiere los endpoints administrativos `GET /clients` y `PATCH /clients/:id/booking-access` del backend. La validación del bloqueo se realiza en el servidor incluso con sesiones abiertas; el cliente recibe un mensaje para contactar con la barbería si intenta reservar. Al pasar una reserva pendiente a confirmada, el backend solicita el envío del correo de confirmación.

## Cierre de atenciones

En **Admin → Reservas**, una reserva pendiente puede confirmarse o cancelarse. Una confirmada puede completarse desde su hora de inicio (America/Santiago), incluso si es pasada, o cancelarse. En escritorio se utiliza el selector de estado; en móvil, el icono de edición y **Guardar**. Las canceladas, completadas y marcadas como No asistió son definitivas. El backend completa automáticamente solo las confirmadas al cumplirse 24 horas desde el inicio de la cita; revisa cada minuto y al arrancar. Las pendientes y canceladas no cambian. El backend valida las mismas transiciones y devuelve 409 si otra solicitud cambió el estado antes de guardar.

### Operación diaria de reservas

Reservas abre en **Hoy y pendientes**, que incluye las reservas de hoy y todas las pendientes de confirmar, aunque sean de otra fecha. Las pendientes aparecen primero; dentro de cada grupo se respeta el orden seleccionado (fecha y hora ascendente al abrir). **Todas** permite consultar otras fechas; **Por cerrar** reúne las confirmadas cuya hora de inicio ya pasó, para completarlas o cancelarlas manualmente. Los filtros y contadores corresponden a la vista elegida.

Cancelar solicita confirmación, libera el horario y envía un correo que distingue si canceló el cliente o administración. El cliente recibe también una confirmación en pantalla. **Archivar** está disponible únicamente para canceladas, completadas o marcadas como No asistió, sin límite por fecha: las oculta del listado, conserva su historial en Clientes y no envía otro correo. Requiere desplegar el backend con soporte de archivado antes del frontend.

Si falla la consulta del calendario o de horarios, se muestra un error con **Reintentar**; no se presenta como un día sin agenda.

En **Barberos → Calendario → Horario**, la **×** de cada bloque permite quitar solo ese intervalo si aún es futuro. Si tiene reservas pendientes o confirmadas, la misma confirmación permite cancelarlas y enviar el correo antes de quitarlo. Se confirma la fecha y el rango antes de guardar. Las reservas canceladas se conservan en el historial; los bloques vencidos no ofrecen la acción. La papelera de la cabecera actúa sobre la agenda completa: se bloquea si algún horario ya venció; para una jornada futura, confirma la cancelación y el aviso de sus reservas antes de quitarla. Desplegar primero el backend con `/barber-schedules/:id/remove-block`.

En las citas del calendario móvil, una completada se representa con ✓ verde y una cancelada con ✕ roja, ambas con etiqueta accesible y descripción emergente.

**No asistió:** en Admin → Reservas, una confirmada puede marcarse como No asistió desde su hora de inicio. Requiere confirmación, queda como estado definitivo y aparece en el historial del cliente en su propio grupo. No se completa automáticamente ni envía notificaciones adicionales. Puede archivarse conservando su historial.
