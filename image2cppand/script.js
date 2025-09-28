function convertImage() {
  const file = document.getElementById("imageInput").files[0];
  const canvas = document.getElementById("preview");
  const ctx = canvas.getContext("2d");
  const output = document.getElementById("output");
  const format = document.getElementById("format").value;
  const invert = document.getElementById("invert").checked;
  const threshold = parseInt(document.getElementById("threshold").value);

  if (!file) return alert("Please upload an image.");

  const reader = new FileReader();
  reader.onload = function(e) {
    const img = new Image();
    img.onload = function() {
      canvas.width = img.width;
      canvas.height = img.height;
      ctx.drawImage(img, 0, 0);

      const imgData = ctx.getImageData(0, 0, img.width, img.height).data;
      let bytes = [];

      for (let y = 0; y < img.height; y++) {
        let row = [];
        for (let x = 0; x < img.width; x++) {
          const i = (y * img.width + x) * 4;
          const brightness = imgData[i] * 0.3 + imgData[i + 1] * 0.59 + imgData[i + 2] * 0.11;
          const bit = (invert ? brightness > threshold : brightness < threshold) ? 1 : 0;
          row.push(bit);
        }
        bytes.push(row);
      }

      let outputText = formatByteArray(bytes, format);
      output.value = outputText;
    };
    img.src = e.target.result;
  };
  reader.readAsDataURL(file);
}

function formatByteArray(bits, format) {
  let result = "";
  for (let row of bits) {
    let byte = 0, str = "";
    for (let i = 0; i < row.length; i++) {
      byte = (byte << 1) | row[i];
      if ((i + 1) % 8 === 0 || i === row.length - 1) {
        if (format === "hex") str += "0x" + byte.toString(16).padStart(2, "0") + ", ";
        else str += byte + ", ";
        byte = 0;
      }
    }
    result += str + "\n";
  }

  if (format === "progmem") {
    return `const uint8_t image[] PROGMEM = {\n${result}};`;
  } else if (format === "uint8") {
    return `uint8_t image[] = {\n${result}};`;
  } else {
    return result;
  }
}
