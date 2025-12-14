/**
 * Configuración de Parámetros de la API Azure Vision
 * Define los parámetros de consulta para los diferentes modos de detección soportados por la extensión.
 * - faces: Detecta rostros y estima edad/género.
 * - celebrities: Identifica celebridades usando un modelo de dominio específico.
 * - nopor: Detecta contenido adulto/subido de tono (características visuales "Adult").
 */
const params = {
  faces: "visualFeatures=Faces",
  celebrities: "details=Celebrities",
  nopor: "visualFeatures=Adult",
};

/**
 * Listener del script de fondo para manejar mensajes del content script.
 * Actúa como un proxy para realizar peticiones a la API, evitando problemas de CORS que ocurrirían
 * si el content script intentara obtener imágenes o llamar a la API de Azure directamente desde el contexto de la página.
 */
chrome.runtime.onMessage.addListener(
  ({ action, url, mode }, sender, sendResponse) => {
    // Solo manejar acciones 'analyzeImage'
    if (action !== "analyzeImage") return;

    /**
     * Recupera la configuración de la API (Clave y Endpoint) del Almacenamiento Sincronizado de Chrome.
     * Esto permite al usuario configurar sus credenciales de Azure principalmente en el popup.
     * La recuperamos aquí al momento para asegurar que siempre usamos las últimas credenciales guardadas.
     */
    chrome.storage.sync.get(
      ["apiKey", "apiEndpoint"],
      async ({ apiKey, apiEndpoint }) => {
        try {
          // Validación: La API Key es obligatoria
          if (!apiKey) throw new Error("Missing API Key");

          // Normaliza la URL del endpoint: usa Norte de Europa por defecto si falta, y elimina la barra final para consistencia.
          const endpoint = (
            apiEndpoint || "https://northeurope.api.cognitive.microsoft.com"
          ).replace(/\/$/, "");

          // Paso 1: Obtener la imagen desde la URL de origen.
          // Esto se ejecuta en el contexto de fondo, que tiene privilegios CORS diferentes a los de la página web.
          // Necesitamos los datos binarios crudos (Blob) para enviarlos a Azure.
          const imgRes = await fetch(url);
          if (!imgRes.ok)
            throw new Error(`Image fetch error: ${imgRes.statusText}`);

          // Paso 2: Enviar los datos binarios de la imagen a la API de Azure Computer Vision.
          // Construimos la URL completa basada en el endpoint del usuario y los parámetros del modo seleccionado.
          const apiRes = await fetch(
            `${endpoint}/vision/v3.2/analyze?${params[mode]}`,
            {
              method: "POST",
              headers: {
                "Content-Type": "application/octet-stream", // Enviando bytes crudos
                "Ocp-Apim-Subscription-Key": apiKey, // Cabecera de autenticación
              },
              body: await imgRes.blob(), // Los datos de la imagen en sí
            }
          );

          // Paso 3: Manejar respuestas de error de la API
          // Azure a menudo devuelve detalles en el cuerpo JSON incluso en códigos de estado de error.
          if (!apiRes.ok) {
            const text = await apiRes.text();
            let msg = text;
            try {
              // Intentar parsear el mensaje de error estructurado de Azure
              msg = JSON.parse(text).error.message;
            } catch (e) {
              // Recurrir al texto sin formato si falla el parseo
            }
            throw new Error(`${apiRes.status} ${msg}`);
          }

          // Paso 4: Enviar respuesta de éxito al Content Script con los datos del análisis
          sendResponse({ success: true, data: await apiRes.json() });
        } catch (e) {
          // Capturar cualquier error de red o lógica y reenviarlo al content script
          sendResponse({ success: false, error: e.message });
        }
      }
    );

    // Retornar true para indicar que responderemos asíncronamente al mensaje
    return true;
  }
);
