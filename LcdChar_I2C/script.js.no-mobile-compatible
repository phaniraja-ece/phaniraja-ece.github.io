document.addEventListener("DOMContentLoaded", () => {
  const grid = document.getElementById("grid");
  const slotSelect = document.getElementById("slot");
  const colorSelect = document.getElementById("color");
  const codeOutput = document.getElementById("codeOutput");

  const slots = {};
  for (let s = 0; s < 8; s++) {
    slots[s] = Array.from({ length: 8 }, () => Array(5).fill(false));
    const option = document.createElement("option");
    option.value = s;
    option.textContent = s;
    slotSelect.appendChild(option);
  }

  let currentSlot = 0;
  renderGrid();

  slotSelect.addEventListener("change", () => {
    saveSlot(currentSlot);
    currentSlot = parseInt(slotSelect.value);
    renderGrid();
  });

  colorSelect.addEventListener("change", () => {
    renderGrid();
  });

  function renderGrid() {
    grid.innerHTML = "";
    for (let row = 0; row < 8; row++) {
      for (let col = 0; col < 5; col++) {
        const pixel = document.createElement("div");
        pixel.classList.add("pixel");
        if (slots[currentSlot][row][col]) {
          pixel.classList.add("on", colorSelect.value);
        }
        pixel.onclick = () => {
          slots[currentSlot][row][col] = !slots[currentSlot][row][col];
          renderGrid();
        };
        grid.appendChild(pixel);
      }
    }
  }

  function saveSlot(slot) {
    const pixels = grid.querySelectorAll(".pixel");
    let i = 0;
    for (let row = 0; row < 8; row++) {
      for (let col = 0; col < 5; col++) {
        const pixel = pixels[i++];
        slots[slot][row][col] = pixel.classList.contains("on");
      }
    }
  }

  window.generateCode = function () {
    saveSlot(currentSlot);
    let code = `
#include <Wire.h>
#include <LiquidCrystal_I2C.h>

LiquidCrystal_I2C lcd(0x27, 16, 2); // Address, columns, rows

`.trim();

    for (let s = 0; s < 8; s++) {
      const rows = slots[s].map(row => {
        let value = 0;
        row.forEach((on, i) => {
          if (on) value |= (1 << (4 - i));
        });
        return `B${value.toString(2).padStart(5, '0')}`;
      });
      code += `\nbyte customChar${s}[8] = {\n  ${rows.join(',\n  ')}\n};\n`;
    }

    code += `
void setup() {
  lcd.begin();
  lcd.backlight();
`.trim();

    for (let s = 0; s < 8; s++) {
      code += `\n  lcd.createChar(${s}, customChar${s});`;
    }

    code += `
  lcd.setCursor(0, 0);
`.trim();

    for (let s = 0; s < 8; s++) {
      code += `\n  lcd.write(${s});`;
    }

    code += `
}

void loop() {}
`.trim();

    codeOutput.textContent = code;
  };

  window.copyCode = function () {
    navigator.clipboard.writeText(codeOutput.textContent);
    alert("Code copied to clipboard!");
  };
});

