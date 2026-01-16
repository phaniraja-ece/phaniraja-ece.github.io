const grid = document.getElementById("lcdGrid");
const colorSelect = document.getElementById("colorSelect");
const output = document.getElementById("output");

// Initialize Grid with robust touch/click handling
for (let i = 0; i < 40; i++) {
  const cell = document.createElement("div");
  const handleInteraction = (e) => {
    e.preventDefault();
    cell.classList.toggle("active");
    updatePixelColors(); 
  };
  cell.addEventListener("mousedown", handleInteraction);
  cell.addEventListener("touchstart", handleInteraction, { passive: false });
  grid.appendChild(cell);
}

function updatePixelColors() {
  const selectedColor = colorSelect.value;
  [...grid.children].forEach(cell => {
    if (cell.classList.contains("active")) {
      cell.style.backgroundColor = selectedColor;
      cell.style.borderColor = (selectedColor === "#ffffff") ? "#8b949e" : "#30363D";
    } else {
      cell.style.backgroundColor = "";
      cell.style.borderColor = "#30363D";
    }
  });
}

function clearGrid() {
  [...grid.children].forEach(cell => {
    cell.classList.remove("active");
    cell.style.backgroundColor = "";
  });
}

function invertGrid() {
  [...grid.children].forEach(cell => cell.classList.toggle("active"));
  updatePixelColors();
}

async function copyCode() {
  if (!output.value) return;
  const btn = document.getElementById("copyBtn");
  await navigator.clipboard.writeText(output.value);
  const oldText = btn.innerHTML;
  btn.innerHTML = "✅ Copied!";
  setTimeout(() => btn.innerHTML = oldText, 2000);
}

// Manual trigger for binary code generation
function updateCode() {
  const slot = document.getElementById("slotSelect").value;
  let bytes = [];
  for (let row = 0; row < 8; row++) {
    let binaryStr = "";
    for (let col = 0; col < 5; col++) {
      const index = row * 5 + col;
      binaryStr += grid.children[index].classList.contains("active") ? "1" : "0";
    }
    bytes.push("B" + binaryStr); // Ensures B11011 style output
  }

  output.value = `#include <LiquidCrystal.h>

  LiquidCrystal lcd(12, 11, 5, 4, 3, 2); // RS, E, D4, D5, D6, D7
  
  byte customChar[] = {
  ${bytes.join(",\n  ")}
};

void setup() {
  lcd.begin(16, 2);
  lcd.createChar(${slot}, customChar);
  lcd.setCursor(0, 0);
  lcd.write(byte(${slot}));
};

void loop() {
  // Your code here
}`;
}