const editor = ace.edit("editor");
editor.setTheme("ace/theme/monokai");
editor.session.setMode("ace/mode/c_cpp");
editor.setOptions({ fontSize: "14px", enableBasicAutocompletion: true });

const tabs = {};
let currentTab = null;

const languageSelect = document.getElementById("language");
const themeSelect = document.getElementById("theme");
const terminal = document.getElementById("terminal");

// Supported languages
const languages = [
  "c_cpp", "java", "python", "html", "css", "javascript", "php", "sql", "json",
  "xml", "markdown", "bash", "powershell", "lua", "r", "matlab", "dockerfile",
  "typescript", "golang", "ruby", "perl", "swift", "kotlin", "scss", "ini",
  "makefile", "latex", "assembly_x86", "vhdl"
];

languages.forEach(lang => {
  const opt = document.createElement("option");
  opt.value = lang;
  opt.textContent = lang.toUpperCase();
  languageSelect.appendChild(opt);
});

function addTab() {
  const tabId = "tab" + Object.keys(tabs).length;
  tabs[tabId] = { code: "", lang: "c_cpp" };

  const tab = document.createElement("div");
  tab.className = "tab";
  tab.textContent = tabId;
  tab.onclick = () => switchTab(tabId);
  document.getElementById("tabs").appendChild(tab);

  switchTab(tabId);
}

function switchTab(tabId) {
  if (currentTab) {
    tabs[currentTab].code = editor.getValue();
    tabs[currentTab].lang = languageSelect.value;
  }

  currentTab = tabId;
  editor.setValue(tabs[tabId].code, -1);
  editor.session.setMode("ace/mode/" + tabs[tabId].lang);

  document.querySelectorAll(".tab").forEach(t => t.classList.remove("active"));
  [...document.querySelectorAll(".tab")].find(t => t.textContent === tabId)?.classList.add("active");
  languageSelect.value = tabs[tabId].lang;
}

languageSelect.addEventListener("change", () => {
  const lang = languageSelect.value;
  editor.session.setMode("ace/mode/" + lang);
  if (currentTab) tabs[currentTab].lang = lang;
});

themeSelect.addEventListener("change", () => {
  editor.setTheme("ace/theme/" + themeSelect.value);
});

function saveCode() {
  if (currentTab) {
    tabs[currentTab].code = editor.getValue();
    localStorage.setItem("webide-tabs", JSON.stringify(tabs));
    terminal.value = "💾 Code saved to localStorage.";
  }
}

function copyCode() {
  navigator.clipboard.writeText(editor.getValue());
  terminal.value = "📋 Code copied to clipboard.";
}

function clearCode() {
  editor.setValue("", -1);
  terminal.value = "🧹 Editor cleared.";
}

function downloadCode() {
  const blob = new Blob([editor.getValue()], { type: "text/plain" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = currentTab + "." + languageSelect.value.replace("_", ".");
  link.click();
  terminal.value = "📥 Code downloaded.";
}

function exportCodeAs(ext) {
  const blob = new Blob([editor.getValue()], { type: "text/plain" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = currentTab + "." + ext;
  link.click();
  terminal.value = `📤 Exported as .${ext}`;
}

function checkSyntax() {
  const code = editor.getValue();
  const lang = languageSelect.value;

  if (lang === "python" && code.includes("print(") === false) {
    terminal.value = "⚠️ Python: Missing print statement.";
  } else if (lang === "c_cpp" && code.includes(";") === false) {
    terminal.value = "⚠️ C/C++: Missing semicolon.";
  } else {
    terminal.value = "✅ No obvious syntax issues detected.";
  }
}

window.onload = () => {
  const saved = localStorage.getItem("webide-tabs");
  if (saved) {
    const loadedTabs = JSON.parse(saved);
    Object.keys(loadedTabs).forEach(tabId => {
      tabs[tabId] = loadedTabs[tabId];
      const tab = document.createElement("div");
      tab.className = "tab";
      tab.textContent = tabId;
      tab.onclick = () => switchTab(tabId);
      document.getElementById("tabs").appendChild(tab);
    });
    switchTab(Object.keys(loadedTabs)[0]);
  } else {
    addTab();
  }
};
function launchCompiler() {
  const lang = languageSelect.value;
  let url = "";

  if (lang === "c_cpp") url = "/C-C++_COMPILER/";
  else if (lang === "java") url = "/JAVA-COMPILER/";
  else if (lang === "python") url = "/PYTHON-COMPILER/";
  else if (lang === "html") url = "/tools/html-preview";
  else if (lang === "javascript") url = "/tools/js-runner";

  if (url) {
    window.open(url, "_blank");
    terminal.value = `🚀 Launched ${lang.toUpperCase()} compiler.`;
  } else {
    terminal.value = `⚠️ No compiler available for ${lang.toUpperCase()}.`;
  }
}

