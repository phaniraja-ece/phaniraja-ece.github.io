const grid = document.getElementById("grid");
const slotSelect = document.getElementById("slot");
const colorSelect = document.getElementById("color");
const codeOutput = document.getElementById("codeOutput");

let pixels = [];

for (let row = 0; row < 8; row++) {
  pixels[row] = [];
  for (let col = 0; col < 5; col++) {
    const pixel = document.createElement("div");
    pixel.classList.add("pixel");
    pixel.dataset.row = row;
    pixel.dataset.col = col;
    pixel.onclick = () => togglePixel(row, col);
    grid.appendChild(pixel);
    pixels[row][col] = pixel;
  }
}

function togglePixel(row, col) {
  const pixel = pixels[row][col];
  const color = colorSelect.value;
  pixel.classList.toggle("on");
  pixel.classList.remove("green", "black", "white", "blue");
  if (pixel.classList.contains("on")) {
    pixel.classList.add(color);
  }
}

function generateCode() {
  const slot = slotSelect.value;
  const rows = pixels.map(row => {
    let value = 0;
    row.forEach((pixel, i) => {
      if (pixel.classList.contains("on")) {
        value |= (1 << (4 - i));
      }
    });
    return `B${value.toString(2).padStart(5, '0')}`;
  });

  const code = `
#include <Wire.h>
#include <LiquidCrystal_I2C.h>

LiquidCrystal_I2C lcd(0x27, 16, 2); // Address, columns, rows

byte customChar${slot}[8] = {
  ${rows.join(',\n  ')}
};

void setup() {
  lcd.begin();
  lcd.backlight();
  lcd.createChar(${slot}, customChar${slot});
  lcd.setCursor(0, 0);
  lcd.write(${slot});
}

void loop() {}
  `.trim();

  codeOutput.textContent = code;
}

function copyCode() {
  navigator.clipboard.writeText(codeOutput.textContent);
  alert("Code copied to clipboard!");
}
