let fileExtension = ".cpp"; // default
let codeFilename = "code.cpp";

function getPlatform() {
  const ua = navigator.userAgent;
  if (ua.includes("Windows")) return "windows";
  if (ua.includes("Android")) return "android";
  if (ua.includes("Mac")) return "mac";
  if (ua.includes("Linux")) return "linux";
  return "unknown";
}

const editor = CodeMirror(document.getElementById("editor"), {
  value: "",
  mode: "text/x-c++src",
  lineNumbers: true,
  theme: "default"
});

document.getElementById("fileInput").addEventListener("change", function () {
  const file = this.files[0];
  if (file) {
    fileExtension = file.name.endsWith(".c") ? ".c" : ".cpp";
    codeFilename = `code${fileExtension}`;
    const reader = new FileReader();
    reader.onload = () => {
      editor.setValue(reader.result);
    };
    reader.readAsText(file);
  }
});

function generateScript() {
  const code = editor.getValue();
  const flags = document.getElementById("flags").value;
  const platform = getPlatform();
  document.getElementById("platformInfo").innerText = `Detected platform: ${platform}`;

  // Download code file
  const codeBlob = new Blob([code], { type: "text/plain" });
  const codeLink = document.createElement("a");
  codeLink.href = URL.createObjectURL(codeBlob);
  codeLink.download = codeFilename;
  codeLink.click();

  // Build compile command
  let outputName = platform === "windows" ? "output.exe" : "output";
  let compileCmd = `g++ ${codeFilename} -o ${outputName}`;
  if (flags) compileCmd += ` ${flags}`;

  let script = "";
  let filename = "";

  if (platform === "windows") {
    script = `@echo off\n${compileCmd}\npause`;
    filename = "compile.bat";
  } else if (["linux", "mac", "android"].includes(platform)) {
    script = `#!/bin/bash\n${compileCmd}\n./${outputName}`;
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
