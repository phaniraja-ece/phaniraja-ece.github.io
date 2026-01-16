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
    option.textContent = s; 
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

  // Re-render when color is changed
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
    if (!pixels.length) return;
    for (let row = 0; row < 8; row++) {
      for (let col = 0; col < 5; col++) {
        const pixel = pixels[i++];
        slots[slot][row][col] = pixel.classList.contains("on");
      }
    }
  }

  // --- NEW INVERT GRID FUNCTION ---
  window.invertGrid = function() {
    // Loop through every row and column of the current slot
    for (let row = 0; row < 8; row++) {
      for (let col = 0; col < 5; col++) {
        // Flip the boolean value (true becomes false, false becomes true)
        slots[currentSlot][row][col] = !slots[currentSlot][row][col];
      }
    }
    // Refresh the visual grid
    renderGrid();
    
    // Auto-update the code if code is already generated
    if (codeOutput && codeOutput.textContent !== "") {
      window.generateCode();
    }
  };

  // --- FIXED CLEAR FUNCTION ---
  window.clearCurrentSlot = function() {
    if (confirm("Clear this character slot?")) {
      slots[currentSlot] = Array.from({ length: 8 }, () => Array(5).fill(false));
      renderGrid();
      if (codeOutput) codeOutput.textContent = "";
    }
  };

  // Generate Arduino code
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
      code += `\nbyte customChar${s}[8] = {\n  ${rows.join(',\n    ')}\n};\n`;
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
  };

  // Copy code to clipboard
  window.copyCode = function () {
    if (!codeOutput.textContent) return;
    navigator.clipboard.writeText(codeOutput.textContent).then(() => {
      alert("Code copied to clipboard!");
    });
  };
});
