document.addEventListener("DOMContentLoaded", () => {
  const grid = document.getElementById("grid");
  const slotSelect = document.getElementById("slot");
  const colorSelect = document.getElementById("color");
  const codeOutput = document.getElementById("codeOutput");

  // Initialize data for 8 custom character slots (0-7)
  const slots = {};
  for (let s = 0; s < 8; s++) {
    slots[s] = Array.from({ length: 8 }, () => Array(5).fill(false));
    const option = document.createElement("option");
    option.value = s;
    option.textContent = s; // Simplified label to match your screenshot
    slotSelect.appendChild(option);
  }

  let currentSlot = 0;
  renderGrid();

  // Switch between character slots
  slotSelect.addEventListener("change", () => {
    saveSlot(currentSlot);
    currentSlot = parseInt(slotSelect.value);
    renderGrid();
  });

  // Re-render when color is changed to apply new color to "on" pixels
  colorSelect.addEventListener("change", () => {
    renderGrid();
  });

  function renderGrid() {
    grid.innerHTML = "";
    for (let row = 0; row < 8; row++) {
      for (let col = 0; col < 5; col++) {
        const pixel = document.createElement("div");
        pixel.classList.add("pixel");
        
        // If the bit is set, apply the 'on' class and the selected color
        if (slots[currentSlot][row][col]) {
          pixel.classList.add("on", colorSelect.value);
        }
        
        // Pointerdown for better mobile/touch responsiveness
        pixel.addEventListener("pointerdown", (e) => {
          e.preventDefault(); 
          slots[currentSlot][row][col] = !slots[currentSlot][row][col];
          renderGrid();
        });
        
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

  // Generate Arduino code compatible with LiquidCrystal_I2C
  window.generateCode = function () {
    saveSlot(currentSlot);
    let code = `#include <Wire.h>\n#include <LiquidCrystal_I2C.h>\n\nLiquidCrystal_I2C lcd(0x27, 16, 2);\n`;

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

    code += `\nvoid setup() {\n  lcd.init();\n  lcd.backlight();\n`;

    for (let s = 0; s < 8; s++) {
      code += `  lcd.createChar(${s}, customChar${s});\n`;
    }

    code += `\n  lcd.setCursor(0, 0);\n`;

    for (let s = 0; s < 8; s++) {
      code += `  lcd.write(${s});\n`;
    }

    code += `}\n\nvoid loop() {}`;

    codeOutput.textContent = code;
    codeOutput.scrollIntoView({ behavior: 'smooth' }); // Helps mobile users find the code
  };

  // Copy code to clipboard functionality
  window.copyCode = function () {
    if (!codeOutput.textContent) return;
    navigator.clipboard.writeText(codeOutput.textContent).then(() => {
      alert("Code copied to clipboard!");
    });
  };

});
window.clearCurrentSlot = function() {
    console.log("Clear button clicked!"); // This helps us debug
    
    // 1. Reset the data for the current active slot
    if (typeof slots !== 'undefined' && slots[currentSlot]) {
        slots[currentSlot] = Array.from({ length: 8 }, () => Array(5).fill(false));
        
        // 2. Re-draw the grid so the pixels visually disappear
        renderGrid(); 
        
        // 3. Clear the text in the code output box
        const output = document.getElementById("codeOutput");
        if (output) output.textContent = "";
    } else {
        console.error("Slots array not found!");
    }
};

