const SPINNER = '<div class="spinner-border spinner-border-sm text-light" role="status"><span class="visually-hidden">Loading...</span></div>';
const vscode = acquireVsCodeApi();

// Cache DOM elements for reusability
const promptInput = document.getElementById("promptId");
const askBtn = document.getElementById("askBtnId");
const resetBtn = document.getElementById("resetBtnId");
const thinkingContainer = document.getElementById("thinkingId");
const responseContainer = document.getElementById("responseId");
const modelContainer = document.getElementById("modelId");
const form = document.getElementById("questionForm");

function askQuestion(event) {
    event.preventDefault();
    const text = promptInput.value.trim();
    if (text) {
        vscode.postMessage({ command: "chat", text });
        askBtn.disabled = true;
        askBtn.innerHTML = SPINNER;
    }
}

function handleEnterKey(event) {
    if (event.key === "Enter" && !event.shiftKey) {
        event.preventDefault();
        form.checkValidity() ? askQuestion(event) : form.reportValidity();
    }
}

function resetHistory() {
    thinkingContainer.innerHTML = "";
    vscode.postMessage({ command: 'chatReset' });
}

function resetAskButton() {
    askBtn.disabled = false;
    askBtn.innerText = "Chat";
}

function autoResize(textarea) {
    textarea.style.height = "auto";
    textarea.style.height = (textarea.scrollHeight) + "px";
}

function handleMessage(event) {
    const { command, text } = event.data;

    switch (command) {
        case "chatResponse":
        case "chatThinking":
            resetAskButton();
            (command === "chatResponse" ? responseContainer : thinkingContainer).innerHTML = text;
            break;
        case "getModelName":
            modelContainer.innerText = text;
            break;
    }

    MathJax.Hub.Queue(["Typeset", MathJax.Hub, responseContainer]);
}