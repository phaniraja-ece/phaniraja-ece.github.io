const editor = ace.edit("editor");
editor.setTheme("ace/theme/monokai");
editor.session.setMode("ace/mode/c_cpp");

const languageSelect = document.getElementById("language");
languageSelect.addEventListener("change", () => {
  const lang = languageSelect.value;
  editor.session.setMode("ace/mode/" + lang);
});

function copyCode() {
  const code = editor.getValue();
  navigator.clipboard.writeText(code);
  alert("Code copied to clipboard!");
}
