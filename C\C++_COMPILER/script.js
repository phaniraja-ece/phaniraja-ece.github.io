function getPlatform() {
  const ua = navigator.userAgent;
  if (ua.includes("Windows")) return "windows";
  if (ua.includes("Android")) return "android";
  if (ua.includes("Mac")) return "mac";
  if (ua.includes("Linux")) return "linux";
  return "unknown";
}

document.getElementById("fileInput").addEventListener("change", function () {
  const file = this.files[0];
  if (file) {
    const reader = new FileReader();
    reader.onload = () => {
      document.getElementById("codeBox").value = reader.result;
    };
    reader.readAsText(file);
  }
});

function generateScript() {
  const code = document.getElementById("codeBox").value;

  // Download code file
  const codeBlob = new Blob([code], { type: "text/plain" });
  const codeLink = document.createElement("a");
  codeLink.href = URL.createObjectURL(codeBlob);
  codeLink.download = "code.cpp";
  codeLink.click();

  // Detect platform
  const platform = getPlatform();
  document.getElementById("platformInfo").innerText = `Detected platform: ${platform}`;

  let script = "";
  let filename = "";

  if (platform === "windows") {
    script = `@echo off\ng++ code.cpp -o output.exe\npause`;
    filename = "compile.bat";
  } else if (platform === "linux" || platform === "mac" || platform === "android") {
    script = `#!/bin/bash\ng++ code.cpp -o output\n./output`;
    filename = "compile.sh";
  } else {
    script = "// Unknown platform. Please compile manually.";
    filename = "compile.txt";
  }

  // Download script
  const scriptBlob = new Blob([script], { type: "text/plain" });
  const scriptLink = document.createElement("a");
  scriptLink.href = URL.createObjectURL(scriptBlob);
  scriptLink.download = filename;
  scriptLink.click();
}
