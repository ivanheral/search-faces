const key = "xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx";
const api_url = "https://northeurope.api.cognitive.microsoft.com/vision/v2.0/analyze";

document.addEventListener("mouseover", (_event) => {
  chrome.storage.sync.get('key', (result) => {
    type_detect = typeof result.key === 'undefined' ? "faces" : result.key;
  });
  createButtons();
}, false);

var params = {
  faces: "visualFeatures=faces",
  celebrities: "details=celebrities",
  nopor: "visualFeatures=adult"
};

function image_api(elem, source) {

  elem.parentElement.querySelectorAll("div.faces").forEach(el => el.remove());
  fetch(`${api_url}?${params[type_detect]}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Ocp-Apim-Subscription-Key": encodeURIComponent(key)
      },
      body: `{url: "${source}"}`
    }).then((response) => {
      return response.json();
    })
    .then((data) => {

      if (type_detect == "nopor") {
        elem.parentElement.querySelector("div").setAttribute("style", "left:10px; top: 10px; position: absolute; color: #00ff41;");
        elem.parentElement.querySelector("div").innerHTML = `${(data.adult.adultScore * 100).toFixed(2)}% is Adult Content: ${data.adult.isAdultContent ? "yes" : "no"}`;
      } else {
        faces = data.faces || data.categories[0].detail.celebrities || [];
      }

      for (var i = 0; i < faces.length; i++) {
        var face = document.createElement('div');
        var parentPos = elem.parentElement.getBoundingClientRect();
        var childrenPos = elem.getBoundingClientRect();
        var top = childrenPos.top - parentPos.top;
        var left = childrenPos.left - parentPos.left;
        var width = ((elem.width / data.metadata.width) * faces[i].faceRectangle.width);
        var height = ((elem.height / data.metadata.height) * faces[i].faceRectangle.height);
        top = ((elem.width / data.metadata.width) * faces[i].faceRectangle.top) + top;
        left = ((elem.width / data.metadata.width) * faces[i].faceRectangle.left) + left;
        face.className = "faces";
        var styles = "white-space: nowrap; text-shadow: 1px 1px #000; font-size: 16px; position: absolute; z-index: 9999; outline: 2px dashed #00ff41; color: #00ff41";
        face.setAttribute("style", `left:${left * (100 / elem.width)}%; top:${top * (100 / elem.height)}%; width:${width * (100 / elem.width)}%; height:${height * (100 / elem.height)}%; ${styles}`);
        face.title = type_detect == "faces" ? `${faces[i].age} years` : faces[i].name;
        face.appendChild(document.createTextNode(face.title));
        elem.parentElement.appendChild(face);
      }
    });
}

function executeFace(event) {
  event.preventDefault();
  var src = event.currentTarget.parentElement.getElementsByTagName("IMG")[0].currentSrc;
  image_api(event.currentTarget.parentElement.getElementsByTagName("IMG")[0], src);
}

function createButtons() {
  for (var image of document.images) {
    if (!image.hasAttribute("data-stop") && image.height > 64) {
      image.setAttribute("data-stop", "1");
      var click = document.createElement('div');
      click.setAttribute("style", "left:10px; top: 10px; padding: 5px; position: absolute; z-index: 9999; outline: 2px dashed #00ff41;");
      image.parentElement.appendChild(click);
      click.addEventListener("click", executeFace);
    }
  }
}