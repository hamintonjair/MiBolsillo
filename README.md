# 📱 MiBolsillo - Control de Gastos Personales

¡Bienvenido a **MiBolsillo**! Una aplicación web progresiva (PWA) de contabilidad personal diseñada con un enfoque moderno, minimalista y offline-first. Está pensada para brindarte un control absoluto, rápido y seguro de tus finanzas cotidianas directo en tu dispositivo.

La aplicación simula una interfaz de smartphone premium en escritorio, adaptándose de forma nativa a pantallas táctiles de dispositivos iOS y Android.

---

## ✨ Características Principales

*   **🌐 Offline-First (100% Local)**: Tus datos financieros son privados y seguros. Toda la persistencia de datos se almacena localmente en el dispositivo utilizando `localStorage` (compatible con el almacenamiento seguro nativo como `AsyncStorage` de React Native si decides migrar el proyecto).
*   **📊 Análisis y Visualización**: Gráficos interactivos y dinámicos desarrollados con Recharts que desglosan tus consumos por categorías para un mejor análisis de tus hábitos de consumo.
*   **📂 Gestión de Transacciones**: Registra, edita, elimina y categoriza tus gastos rápidamente con formularios interactivos.
*   **🎨 Tema Dinámico (Modo Claro/Oscuro)**: Alterna entre un modo oscuro profundo ("Cosmic Slate") y un modo claro limpio y de alto contraste desde la barra de navegación inferior.
*   **📲 Lista para PWA (Progressive Web App)**: Service Worker configurado con manifiesto oficial listo para ser instalado en la pantalla de inicio de tu dispositivo iOS o Android sin necesidad de pasar por las tiendas oficiales de apps.
*   **🤖 Compatibilidad con Android / iOS**: Preparada para empaquetarse de manera híbrida mediante **Capacitor** para generar el archivo APK o el proyecto nativo Xcode.

---

## 🎨 Recursos de Diseño Incluidos

Para facilitar la publicación y el registro de la app en plataformas como **APKPure** o tiendas móviles, se han diseñado y guardado los siguientes elementos gráficos en la carpeta `/public/`:

1.  **Icono de la Aplicación (`/public/icon-512.jpg`)**:
    *   **Dimensiones**: 512px por 512px.
    *   **Estilo**: Logotipo vectorial minimalista de un bolsillo/billetera elegante integrado con un indicador verde esmeralda brillante. Sirve como icono launcher de Android e icono para PWA de iOS.
2.  **Banner Promocional (`/public/feature-graphic.jpg`)**:
    *   **Dimensiones**: 1024px por 500px.
    *   **Estilo**: Gráfico promocional premium ideal para las capturas de pantalla de la tienda (Feature Graphic). Muestra un dispositivo smartphone flotante con la app abierta junto con gráficos y elementos 3D financieros (monedas brillantes, tarjetas) bajo un fondo azul-pizarra con acentos neón.

---

## 🛠️ Tecnologías Utilizadas

*   **React 18** (con TypeScript para tipado estricto)
*   **Vite** (para un build súper rápido)
*   **Tailwind CSS** (para un estilizado premium y adaptativo)
*   **Lucide React** (para iconos vectoriales de alta fidelidad)
*   **Recharts** (para gráficos interactivos e intuitivos)
*   **CapacitorJS** (para integración híbrida con Android e iOS)

---

## 🚀 Instalación y Desarrollo Local

Sigue estos pasos para clonar y ejecutar el proyecto en tu máquina local:

### 1. Requisitos Previos
*   Tener instalado **Node.js** (versión 18 o superior recomendada).
*   Un gestor de paquetes como **npm** (incluido con Node.js).

### 2. Clonar el repositorio e instalar dependencias
```bash
# Instala las dependencias del proyecto
npm install
```

### 3. Ejecutar en entorno de desarrollo
```bash
# Inicia el servidor de desarrollo local
npm run dev
```
Abre tu navegador en `http://localhost:3000` para interactuar con la aplicación.

### 4. Compilar para producción
```bash
# Compila los archivos estáticos optimizados en la carpeta /dist
npm run build
```

---

## 📱 Compilación para Dispositivos Móviles (Android e iOS)

La aplicación tiene instalado **Capacitor** para sincronizar el código web en proyectos nativos y generar la APK de Android o el paquete de iOS.

### Configurar e inicializar plataformas
Si tienes configurado tu entorno nativo (Android Studio para Android / Xcode para iOS), puedes ejecutar:

```bash
# 1. Asegúrate de compilar la aplicación web primero
npm run build

# 2. Agregar la plataforma nativa que deseas (Android)
npx cap add android

# 3. O agregar para iOS (requiere macOS y Xcode)
npx cap add ios

# 4. Sincronizar los archivos web compilados con el proyecto móvil nativo
npx cap sync
```

### Abrir los proyectos nativos para generar las aplicaciones
```bash
# Abre el proyecto de Android en Android Studio para compilar la APK firmada
npx cap open android

# Abre el proyecto de iOS en Xcode para ejecutar en emulador o dispositivo físico
npx cap open ios
```

---

## 🔒 Privacidad y Almacenamiento

Esta aplicación almacena el 100% de la información financiera de manera local en el navegador mediante la API de `localStorage`. Los datos nunca viajan a servidores externos, garantizando la confidencialidad total de tus gastos y presupuestos diarios.
