"use strict";

window.onload = function () {
  const apiKeyInput = document.getElementById("apiKey");
  const apiEndpointInput = document.getElementById("apiEndpoint");
  const selectApi = document.getElementById("selectApi");

  // Load saved settings
  chrome.storage.sync.get(["apiKey", "apiEndpoint", "mode"], function (result) {
    if (result.apiKey) apiKeyInput.value = result.apiKey;
    if (result.apiEndpoint) apiEndpointInput.value = result.apiEndpoint;
    if (result.mode) selectApi.value = result.mode;
  });

  // Save on change
  function saveSettings() {
    chrome.storage.sync.set({
      apiKey: apiKeyInput.value,
      apiEndpoint: apiEndpointInput.value,
      mode: selectApi.value,
    });
  }

  apiKeyInput.addEventListener("input", saveSettings);
  apiEndpointInput.addEventListener("input", saveSettings);
  selectApi.addEventListener("change", saveSettings);
};
