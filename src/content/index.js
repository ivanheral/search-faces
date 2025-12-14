/**
 * Estado Global
 * apiKey: Almacena la Clave API de Azure localmente (aunque ahora se usa principalmente desde storage).
 * typeDetect: El modo de detección actual (faces, celebrities, o nopor).
 */
let apiKey = "";
let typeDetect = "faces";

/**
 * Inicialización: Cargar configuración del Almacenamiento Sincronizado de Chrome.
 * Maneja lógica de migración donde 'key' podría haberse usado para 'mode' en versiones antiguas.
 */
chrome.storage.sync.get(
  ["apiKey", "mode", "key"],
  ({ apiKey: key, mode, key: k }) => {
    typeDetect = k && !mode ? k : mode || "faces";
    apiKey = key || "";
  }
);

/**
 * Listener de Almacenamiento: Actualiza el estado local inmediatamente cuando el usuario cambia la configuración en el popup.
 * Asegura que el content script siempre use la última configuración sin recargar la página.
 */
chrome.storage.onChanged.addListener(({ apiKey: k, mode, key }) => {
  if (k) apiKey = k.newValue;
  if (mode) typeDetect = mode.newValue;
  if (key && !mode) typeDetect = key.newValue;
});

/**
 * Manejador de Respuesta de API
 * Procesa los datos JSON devueltos por Azure y dibuja las superposiciones apropiadas en la imagen.
 *
 * @param {Object} response - El objeto de respuesta del script de fondo ({success, data, error})
 * @param {HTMLElement} elem - El elemento <img> que fue analizado
 */
function handleResponse({ success, data, error }, elem) {
  // Manejo de Errores
  if (!success) {
    console.error("Analysis failed:", error);
    alert(`Error: ${error}`);
    return;
  }

  // Visualización para modo "nopor" (Contenido Adulto)
  // Actualiza un div superpuesto con el puntaje de probabilidad.
  if (typeDetect === "nopor") {
    const infoDiv = elem.parentElement.querySelector("div.info-overlay");
    if (infoDiv) {
      infoDiv.classList.add("nopor-overlay");
      infoDiv.innerHTML = `${(data.adult.adultScore * 100).toFixed(
        2
      )}% is Adult Content: ${data.adult.isAdultContent ? "yes" : "no"}`;
    }
    return;
  }

  // Extracción de Datos: Diferenciar entre rostros estándar e identificación de celebridades
  const faces =
    typeDetect === "celebrities"
      ? data.categories?.[0]?.detail?.celebrities || []
      : data.faces || [];

  // Obtener dimensiones originales de la imagen desde los metadatos para calcular posiciones relativas
  const { width: mw, height: mh } = data.metadata || {};
  if (!mw || !mh) return;

  const parent = elem.parentElement;

  // Iterar a través de todos los rostros/elementos detectados
  faces.forEach((item) => {
    const face = document.createElement("div");
    // Extraer coordenadas del cuadro delimitador (top, left, width, height)
    const { width: fw, height: fh, top: ft, left: fl } = item.faceRectangle;

    face.className = "faces face-box";

    // Cálculo de Posición:
    // Convertir coordenadas absolutas de la API a porcentajes relativos al tamaño de la imagen.
    // Esto asegura que las cajas escalen correctamente si la imagen es redimensionada vía CSS.
    const leftPct = (fl / mw) * 100;
    const topPct = (ft / mh) * 100;
    const widthPct = (fw / mw) * 100;
    const heightPct = (fh / mh) * 100;

    face.style.cssText = `left:${leftPct}%; top:${topPct}%; width:${widthPct}%; height:${heightPct}%;`;

    // Generación de Etiqueta:
    // "celebrities": muestra el nombre.
    // "faces": muestra la edad estimada si está disponible, o solo "Face detected".
    let label = item.name || "Unknown";
    if (typeDetect === "faces") {
      const age = item.faceAttributes?.age ?? item.age;
      label = age !== undefined ? `${age} years` : "Face detected";
    }

    // Añadir tooltip y etiqueta visible
    face.title = label;
    face.textContent = label;
    parent.appendChild(face);
  });
}

/**
 * Disparador de API
 * Preparando el estado visual (eliminando cajas antiguas) y enviando el mensaje al script de fondo.
 *
 * @param {HTMLElement} elem - El elemento de imagen del contenido
 * @param {string} source - La URL de origen de la imagen
 */
function imageApi(elem, source) {
  // Limpiar detecciones previas
  elem.parentElement.querySelectorAll("div.faces").forEach((el) => el.remove());

  if (!apiKey) {
    alert(
      "Please set your Azure Computer Vision API Key in the extension popup."
    );
    return;
  }

  // Comunicarse con el Background Worker
  // Pasamos la URL y el modo. El background worker maneja la obtención real y la llamada a la API.
  chrome.runtime.sendMessage(
    { action: "analyzeImage", url: source, mode: typeDetect },
    (response) => {
      // runtime.lastError verifica errores de mensajería (ej. si el contexto de la extensión es invalidado)
      if (chrome.runtime.lastError) {
        console.error("Runtime error:", chrome.runtime.lastError);
        alert(
          "Error contacting background service worker. Please reload the extension."
        );
        return;
      }
      handleResponse(response, elem);
    }
  );
}

/**
 * Manejador de Clic para el Icono de Búsqueda
 * Disparado cuando el usuario hace clic en la lupa superpuesta.
 */
function executeFace(event) {
  event.preventDefault();
  event.stopPropagation(); // Prevenir que el clic burbujee a enlaces padres
  const img = event.currentTarget.parentElement.querySelector("img");
  if (img) imageApi(img, img.currentSrc || img.src);
}

/**
 * Procesamiento de Imagen
 * Inyecta la superposición "Analizar" en imágenes válidas.
 *
 * @param {HTMLElement} image - El elemento de imagen encontrado en el DOM
 */
function processImage(image) {
  // Cláusulas de guarda:
  // - Prevenir doble procesamiento (data-stop)
  // - Asegurar que la imagen tenga un padre
  // - Filtrar iconos pequeños/miniaturas (< 200px ancho)
  if (
    image.hasAttribute("data-stop") ||
    !image.parentElement ||
    image.width < 200
  )
    return;

  // Marcar como procesado
  image.setAttribute("data-stop", "1");

  // Crear el botón de superposición (La lupa)
  const click = document.createElement("div");
  click.className = "info-overlay";
  click.title = "Analyze Image";

  const icon = document.createElement("span");
  icon.innerText = "🔍";
  icon.style.fontSize = "20px";
  icon.style.filter = "drop-shadow(0 2px 2px rgba(0,0,0,0.3))";
  click.appendChild(icon);

  // Corrección CSS: Asegurar que el padre tenga posicionamiento no estático para que los hijos absolutos funcionen correctamente
  if (window.getComputedStyle(image.parentElement).position === "static") {
    image.parentElement.classList.add("relative-parent");
  }

  image.parentElement.appendChild(click);
  click.addEventListener("click", executeFace);
}

/**
 * Observador de Mutaciones
 * Vigila cambios en el DOM para manejar imágenes cargadas dinámicamente (ej. scroll infinito, SPAs).
 */
const observer = new MutationObserver((mutations) => {
  mutations.forEach((mutation) => {
    mutation.addedNodes.forEach((node) => {
      // Si un nodo es un elemento, revisar si es una IMG o contiene IMGs
      if (node.nodeType === Node.ELEMENT_NODE) {
        if (node.tagName === "IMG") processImage(node);
        else node.querySelectorAll("img").forEach(processImage);
      }
    });
  });
});

// Comenzar a observar todo el body del documento para nodos añadidos
observer.observe(document.body, { childList: true, subtree: true });

// Manejador de Carga Inicial
// Procesar imágenes que ya están presentes cuando el script corre
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", () =>
    document.querySelectorAll("img").forEach(processImage)
  );
} else {
  document.querySelectorAll("img").forEach(processImage);
}
