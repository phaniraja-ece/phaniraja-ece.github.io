function generateBulk() {
    const textarea = document.getElementById('textInput');
    const lines = textarea.value.trim().split('\n').filter(line => line.trim());
    const output = document.getElementById('output');
    
    if (lines.length === 0) {
        output.textContent = 'Enter text, one per line.';
        return;
    }
    
    output.innerHTML = ''; // Clear previous
    
    lines.forEach((text, index) => {
        const item = document.createElement('div');
        item.className = 'qr-item';
        item.innerHTML = `<div id="qr-${index}"></div><div class="qr-text">${text}</div>`;
        output.appendChild(item);
        
        new QRCode(`qr-${index}`, {
            text: text.trim(),
            width: 180,
            height: 180,
            colorDark: '#ffffff',
            colorLight: '#0d1117',
            correctLevel: QRCode.CorrectLevel.H
        });
    });
    
    output.scrollTop = 0;
}

function clearAll() {
    document.getElementById('output').innerHTML = 'Preview cleared.';
    document.getElementById('textInput').value = '';
}

function downloadAll() {
    // Simple individual PNG downloads for now
    const canvases = document.querySelectorAll('#output canvas');
    canvases.forEach((canvas, i) => {
        const link = document.createElement('a');
        link.download = `qr-code-${i+1}.png`;
        link.href = canvas.toDataURL();
        link.click();
    });
}

// Auto-generate on input change
document.getElementById('textInput').addEventListener('input', generateBulk);
