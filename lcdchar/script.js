const grid = document.getElementById("lcdGrid");
const output = document.getElementById("output");

// Create 5x8 grid
for (let i = 0; i < 40; i++) {
  const cell = document.createElement("div");
  cell.addEventListener("click", () => {
    cell.classList.toggle("active");
    updateCode();
  });
  grid.appendChild(cell);
}

function clearGrid() {
  [...grid.children].forEach(cell => cell.classList.remove("active"));
  updateCode();
}

function invertGrid() {
  [...grid.children].forEach(cell => cell.classList.toggle("active"));
  updateCode();
}

function updateCode() {
  let bytes = [];
  for (let row = 0; row < 8; row++) {
    let byte = 0;
    for (let col = 0; col < 5; col++) {
      const index = row * 5 + col;
      const active = grid.children[index].classList.contains("active");
      byte = (byte << 1) | (active ? 1 : 0);
    }
    bytes.push("B" + byte.toString(2).padStart(5, "0"));
  }

  output.value =
`#include <LiquidCrystal.h>

LiquidCrystal lcd(12, 11, 5, 4, 3, 2); // RS, E, D4, D5, D6, D7

byte customChar[] = {
  ${bytes.join(",\n  ")}
};

void setup() {
  lcd.begin(16, 2);
  lcd.createChar(0, customChar);
  lcd.setCursor(0, 0);
  lcd.write(byte(0));
}

void loop() {
  // Your code here
}`;
}
