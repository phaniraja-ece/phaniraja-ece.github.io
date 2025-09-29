const editor = ace.edit("editor");
editor.setTheme("ace/theme/monokai");
editor.session.setMode("ace/mode/c_cpp");
editor.setOptions({ fontSize: "14px", enableBasicAutocompletion: true });

const tabs = {};
let currentTab = null;

const languageSelect = document.getElementById("language");
const themeSelect = document.getElementById("theme");

// Populate language options
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
    localStorage.setItem("npp-tabs", JSON.stringify(tabs));
    alert("Code saved!");
  }
}

function copyCode() {
  navigator.clipboard.writeText(editor.getValue());
  alert("Code copied to clipboard!");
}

function clearCode() {
  editor.setValue("", -1);
}

window.onload = () => {
  const saved = localStorage.getItem("npp-tabs");
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
