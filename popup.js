'use strict';
window.onload = function () {
  function change_faces(event) {
    chrome.storage.sync.set({
      key: event.target.value
    }, function () {});
  }
  document.getElementById('selectApi').addEventListener('change', change_faces);
}