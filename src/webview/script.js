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

// Handle asking a question
function askQuestion(event) {
    event.preventDefault();
    const text = promptInput.value.trim();
    if (text) {
        vscode.postMessage({ command: "chat", text });
        askBtn.disabled = true;
        askBtn.innerHTML = SPINNER;
    }
}

// Post question to AI on enter key
function handleEnterKey(event) {
    if (event.key === "Enter" && !event.shiftKey) {
        event.preventDefault();
        if (form.checkValidity()) {
            askQuestion(event);
        } else {
            form.reportValidity();
        }
    }
}

// Reset history
function resetHistory() {
    thinkingContainer.innerHTML = "";
    vscode.postMessage({ command: 'chatReset', text: '' });
}

function resetAskButton() {
    askBtn.disabled = false;
    askBtn.innerText = "Chat";
}

// Listen for response stream from VS Code
function handleMessage(event) {
    const { command, text } = event.data;

    switch (command) {
        case "chatResponse":
            resetAskButton();
            responseContainer.innerHTML = text;
            // scrollToBottom();
            break;
        case "chatThinking":
            resetAskButton();
            thinkingContainer.innerHTML = text;
            break;
        case "getModelName":
            modelContainer.innerText = text;
            break;
        default:
            break;
    }

    // Parse LaTeX with MathJax
    MathJax.Hub.Queue(["Typeset", MathJax.Hub, responseContainer]);
}

// Attach event listeners
function setupEventListeners() {
    promptInput.addEventListener("keypress", handleEnterKey);
    resetBtn.addEventListener("click", resetHistory);
    window.addEventListener("message", handleMessage);
}

// Initialize event listeners
setupEventListeners();

// Utility function to scroll the response container to the bottom
function scrollToBottom() {
    responseContainer.scrollTop = responseContainer.scrollHeight;
}
