# 🔍 Search Faces - Extensión de Chrome con IA

Esta extensión de Chrome permite analizar imágenes en cualquier página web utilizando la **API de Azure Computer Vision**. Con un simple clic, puedes detectar rostros, identificar celebridades o evaluar el contenido de las imágenes directamente desde tu navegador.

## ✨ Características Principales

- **Detección de Rostros**: Identifica rostros humanos y estima su edad aproximada.
- **Reconocimiento de Celebridades**: Reconoce personas famosas utilizando modelos de dominio específico de Azure.
- **Filtro de Contenido**: Analiza imágenes para detectar contenido adulto o inapropiado ("nopor").
- **Interfaz Intuitiva**: Se integra en la página web añadiendo un icono de lupa 🔍 sobre las imágenes analizables.

## 🛠️ Tecnologías Empleadas

El proyecto está construido utilizando tecnologías web estándar y APIs modernas:

- **JavaScript (ES6+)**: Lógica principal utilizando funcionalidades modernas como `async/await` y módulos.
- **Chrome Extensions API (Manifest V3)**:
  - `Script de Fondo (Service Worker)`: Para manejar peticiones API seguras y evitar problemas de CORS.
  - `Content Scripts`: Para la manipulación del DOM y la inyección de la interfaz de usuario en las páginas web.
  - `Storage API`: Para guardar y sincronizar la configuración del usuario (API Key).
- **Azure Cognitive Services**: Motor de inteligencia artificial para el análisis de visión computacional.
- **HTML5 & CSS3**: Para la estructura y estilos de las etiquetas y popups.

## 📂 Estructura del Proyecto

```text
/src
├── /assets        # Iconos y recursos estáticos de la extensión
├── /background    # Service Worker: Maneja la comunicación con Azure y el bypass de CORS
│   └── index.js
├── /content       # Scripts inyectados: Detecta imágenes y dibuja las cajas/etiquetas
│   ├── index.js
│   └── style.css
└── /popup         # Interfaz de configuración (API Key y Modos)
    ├── index.html
    └── scripts.js (o similar)
```

## 🧠 Lógica y Funcionalidad

1.  **Detección de Imágenes**: Un `MutationObserver` en el _Client Script_ vigila el DOM para detectar nuevas imágenes mientras navegas.
2.  **Inyección de UI**: Agrega un icono de lupa sobre las imágenes válidas (>200px).
3.  **Procesamiento**:
    - Al hacer clic, la extensión captura la URL de la imagen.
    - Envía un mensaje al _Background Script_ junto con el modo seleccionado (Rostros, Celebridades, etc.).
4.  **Análisis (Proxy)**:
    - El _Background Script_ descarga la imagen y la reenvía a la API de Azure.
    - Esto actúa como un proxy seguro para proteger tu API Key y evitar bloqueos CORS que ocurrirían si se hiciera directamente desde la web.
5.  **Resultados**:
    - Los datos JSON de Azure se devuelven al _Content Script_.
    - Se dibujan cajas (`divs`) sobre los rostros detectados con etiquetas de edad o nombres.

## 🚀 Cómo Usar en el Navegador

### Prerrequisitos

- Una cuenta de **Microsoft Azure** con un recurso de **Computer Vision** creado.
- Tu **API Key** y **Endpoint** de Azure.

### Instalación (Modo Desarrollador)

1.  Descarga o clona este repositorio en tu ordenador.
2.  Abre Google Chrome y ve a `chrome://extensions/`.
3.  Activa el **"Modo de desarrollador"** (interruptor en la esquina superior derecha).
4.  Haz clic en **"Cargar descomprimida"** (Load unpacked).
5.  Selecciona la carpeta raíz donde se encuentra el archivo `manifest.json` de este proyecto.

### Configuración y Uso

1.  Haz clic en el icono de la extensión en la barra de herramientas de Chrome.
2.  **Configuración**: Introduce tu `API Key` y selecciona el modo de detección deseado (Faces, Celebrities, etc.).
3.  Navega a cualquier página web con imágenes.
4.  Verás una lupa 🔍 sobre las imágenes. ¡Haz clic para analizar!
