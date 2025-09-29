let codeFilename = "Main.java";

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
  mode: "text/x-java",
  lineNumbers: true,
  theme: "default"
});

document.getElementById("fileInput").addEventListener("change", function () {
  const file = this.files[0];
  if (file) {
    codeFilename = file.name;
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

  // Extract class name from filename
  const className = codeFilename.replace(".java", "");

  // Build compile and run command
  let compileCmd = `javac ${flags ? flags + " " : ""}${codeFilename}`;
  let runCmd = `java ${className}`;
  let script = "";
  let filename = "";

  if (platform === "windows") {
    script = `@echo off\n${compileCmd}\n${runCmd}\npause`;
    filename = "compile.bat";
  } else if (["linux", "mac", "android"].includes(platform)) {
    script = `#!/bin/bash\n${compileCmd}\n${runCmd}`;
    filename = "compile.sh";
  } else {
    script = "# Unknown platform. Please compile manually.";
    filename = "compile.txt";
  }

  // Download script
  const scriptBlob = new Blob([script], { type: "text/plain" });
  const scriptLink = document.createElement("a");
  scriptLink.href = URL.createObjectURL(scriptBlob);
  scriptLink.download = filename;
  scriptLink.click();
}
