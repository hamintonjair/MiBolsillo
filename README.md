# 📱 MiBolsillo - Control de Gastos Personales

¡Bienvenido a **MiBolsillo**! Una aplicación web progresiva (PWA) de contabilidad personal diseñada con un enfoque moderno, minimalista y offline-first, ahora potenciada con **sincronización segura en la nube mediante Supabase**. Está pensada para brindarte un control absoluto, rápido y seguro de tus finanzas cotidianas directo en tu dispositivo.

La aplicación simula una interfaz de smartphone premium en escritorio, adaptándose de forma nativa a pantallas táctiles de dispositivos iOS y Android.

---

## ✨ Características Principales

*   **🌐 Offline-First con Respaldo en la Nube (Persistencia Híbrida)**: Tus datos financieros se guardan localmente para accesos rápidos y sin internet, y se sincronizan de manera segura en tu base de datos de **Supabase** cuando tienes conexión.
*   **📊 Análisis y Visualización**: Gráficos interactivos y dinámicos desarrollados con Recharts que desglosan tus consumos por categorías para un mejor análisis de tus hábitos de consumo.
*   **📂 Gestión de Transacciones**: Registra, edita, elimina y categoriza tus gastos rápidamente con formularios interactivos.
*   **💰 Control de Ingreso Mensual**: Gestiona tu ingreso mensual (Salario), inicializado en `0` por defecto para que registres tu presupuesto real desde el primer día.
*   **💬 Confirmaciones y Alertas de Interfaz Premium**: Reemplazo de las ventanas emergentes nativas de `confirm()` por **modales de confirmación con diseño personalizado** para evitar restricciones en entornos sandboxed (como visualizadores integrados) y mejorar el aspecto visual.
*   **🔕 Notificaciones Limpias**: Mensajes de éxito y error discretos y con un lenguaje totalmente humilde y profesional (por ejemplo: "¡Gasto registrado con éxito!" o "¡Ingreso mensual guardado con éxito!"), libres de nombres técnicos o de infraestructura de base de datos en los flujos principales.
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

*   **React 19** (con TypeScript para tipado estricto)
*   **Vite** (para un build súper rápido)
*   **Tailwind CSS** (para un estilizado premium y adaptativo)
*   **Lucide React** (para iconos vectoriales de alta fidelidad)
*   **Recharts** (para gráficos interactivos e intuitivos)
*   **Supabase** (para la base de datos PostgreSQL en tiempo real y persistencia en la nube)
*   **CapacitorJS** (para integración híbrida con Android e iOS)

---

## 🚀 Configuración y Conexión de Supabase

Para habilitar la persistencia en la nube, debes crear un proyecto en **Supabase** y configurar las siguientes variables de entorno.

### 1. Variables de Entorno (Archivo `.env`)
Crea un archivo `.env` en la raíz del proyecto basándote en `.env.example`:

```env
VITE_SUPABASE_URL=https://tu-proyecto.supabase.co
VITE_SUPABASE_ANON_KEY=tu-anon-key-de-supabase
```

### 2. Creación de Tablas (SQL Script)
Ejecuta el siguiente script en el **SQL Editor** de tu consola de Supabase para habilitar las tablas necesarias:

```sql
-- Tabla para registrar los gastos
CREATE TABLE IF NOT EXISTS expenses (
  id TEXT PRIMARY KEY,
  amount NUMERIC NOT NULL,
  category TEXT NOT NULL,
  date DATE NOT NULL,
  description TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Tabla para guardar el presupuesto/ingreso mensual
CREATE TABLE IF NOT EXISTS monthly_income (
  month TEXT PRIMARY KEY, -- Formato 'YYYY-MM'
  income NUMERIC NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Habilitar acceso de lectura y escritura para cualquiera (para modo desarrollo/demostración simple)
-- Nota: En producción, puedes proteger estas tablas con Row Level Security (RLS)
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE monthly_income ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Permitir todo acceso público a gastos" ON expenses FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Permitir todo acceso público a ingresos" ON monthly_income FOR ALL USING (true) WITH CHECK (true);
```

---

## ☁️ Despliegue en Render: ¿Sitio Estático o Servicio Web?

Para subir **MiBolsillo** a [Render](https://render.com), **se debe realizar un despliegue de tipo Sitio Estático (Static Site)**.

### ¿Por qué Sitio Estático?
La aplicación es una Single-Page Application (SPA) basada en React y Vite. Toda la lógica de base de datos se comunica de manera cliente-servidor directamente desde el navegador del usuario hacia Supabase utilizando el SDK cliente de Supabase (`@supabase/supabase-js`) y la clave API anon pública. No requiere de un servicio backend (Node.js/Express) activo en producción para servir o proxyar consultas.

**Ventajas de usar un Sitio Estático en Render:**
*   **100% Gratis**: Render ofrece alojamiento gratuito ilimitado para sitios estáticos de por vida.
*   **Velocidad de Carga Global**: Utiliza una red de distribución de contenidos (CDN) global e instantánea.
*   **Sin tiempo de espera**: Al ser un sitio estático, no se "duerme" por inactividad, por lo que tus usuarios no experimentarán demoras de arranque de 30-50 segundos al abrir la app después de un tiempo sin uso.

### Configuración del Despliegue en Render (Static Site)

1.  Crea una cuenta en Render e ingresa al panel de control.
2.  Crea un nuevo servicio seleccionando **Static Site**.
3.  Conecta tu repositorio de GitHub.
4.  Establece la siguiente configuración del entorno:
    *   **Build Command**: `npm run build`
    *   **Publish Directory**: `dist`
5.  Agrega las **Variables de Entorno** (Environment Variables) del proyecto:
    *   `VITE_SUPABASE_URL` = (Tu URL de Supabase, e.g., `https://xxxx.supabase.co`)
    *   `VITE_SUPABASE_ANON_KEY` = (Tu clave API anónima pública de Supabase)
6.  Haz clic en **Create Static Site** para iniciar la compilación y el despliegue automático.

---

## 🛠️ Instalación y Desarrollo Local

Sigue estos pasos para clonar y ejecutar el proyecto en tu máquina local:

### 1. Requisitos Previos
*   Tener instalado **Node.js** (versión 18 o superior recomendada).
*   Un gestor de paquetes como **npm** (incluido con Node.js).

### 2. Instalar dependencias
```bash
npm install
```

### 3. Ejecutar en entorno de desarrollo
```bash
npm run dev
```
Abre tu navegador en `http://localhost:3000` para interactuar con la aplicación.

### 4. Compilar para producción local
```bash
npm run build
```

---

## 📱 Compilación para Dispositivos Móviles (Android e iOS)

La aplicación tiene instalado **Capacitor** para sincronizar el código web en proyectos nativos y generar la APK de Android o el paquete de iOS.

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
