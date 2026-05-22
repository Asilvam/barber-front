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

* **Node.js**: Versión `v22` (especificada en el archivo `.nvmrc`).
* **Gestor de Paquetes**: `npm` o `yarn`.

---

## 🚀 Configuración y Puesta en Marcha

### 1. Clonar e Instalar Dependencias
Instala los paquetes necesarios en el directorio raíz:
```bash
npm install
```

### 2. Configurar Variables de Entorno
Crea un archivo `.env` en la raíz del proyecto y define las siguientes variables:
```env
# URL base de la API backend de la barbería
VITE_API_BASE_URL=https://tu-api-back.herokuapp.com

# Nombre comercial de la barbería visible en toda la aplicación
VITE_BUSINESS_NAME="Mi Barbería Premium"

# ID de cliente de la API de Google para el inicio de sesión
VITE_GOOGLE_CLIENT_ID=tu-google-client-id.apps.googleusercontent.com
```

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
```

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
