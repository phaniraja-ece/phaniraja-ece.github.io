function renderImage() {
  const input = document.getElementById("input").value;
  const width = parseInt(document.getElementById("width").value);
  const height = parseInt(document.getElementById("height").value);
  const vertical = document.getElementById("vertical").checked;
  const canvas = document.getElementById("canvas");
  const ctx = canvas.getContext("2d");

  canvas.width = width;
  canvas.height = height;
  ctx.clearRect(0, 0, width, height);

  const byteArray = parseByteArray(input);
  if (!byteArray.length) return alert("Invalid byte array.");

  let x = 0, y = 0;
  for (let byte of byteArray) {
    for (let i = 0; i < 8; i++) {
      const bit = (byte >> i) & 1;
      if (bit) {
        if (vertical) ctx.fillRect(x, y + i, 1, 1);
        else ctx.fillRect(x, y, 1, 1);
      }
    }
    if (vertical) {
      x++;
      if (x >= width) break;
    } else {
      y += 8;
      if (y >= height) {
        y = 0;
        x++;
      }
      if (x >= width) break;
    }
  }
}

function parseByteArray(text) {
  const matches = text.match(/0x[0-9A-Fa-f]+|\d+/g);
  if (!matches) return [];
  return matches.map(val => {
    if (val.startsWith("0x")) return parseInt(val, 16);
    return parseInt(val);
  });
}

function clearCanvas() {
  const canvas = document.getElementById("canvas");
  const ctx = canvas.getContext("2d");
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  document.getElementById("input").value = "";
}

function downloadImage() {
  const canvas = document.getElementById("canvas");
  const link = document.createElement("a");
  link.download = "image.png";
  link.href = canvas.toDataURL();
  link.click();
}

// Drag-and-drop .h file support
document.getElementById("input").addEventListener("dragover", e => e.preventDefault());
document.getElementById("input").addEventListener("drop", e => {
  e.preventDefault();
  const file = e.dataTransfer.files[0];
  if (file && file.name.endsWith(".h")) {
    const reader = new FileReader();
    reader.onload = () => {
      document.getElementById("input").value = reader.result;
    };
    reader.readAsText(file);
  }
});
