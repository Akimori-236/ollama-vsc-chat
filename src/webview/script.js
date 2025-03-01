const SPINNER = '<div class="spinner-border spinner-border-sm text-light" role="status"><span class="visually-hidden">Loading...</span></div>';
const vscode = acquireVsCodeApi();

// Cache DOM elements for reusability
const promptInput = document.getElementById("promptId");
const askBtn = document.getElementById("askBtnId");
const resetBtn = document.getElementById("resetBtnId");
const stopBtn = document.getElementById("stopBtnId");
const thinkingContainer = document.getElementById("thinkingId");
const responseContainer = document.getElementById("responseId");
const modelContainer = document.getElementById("modelId");
const form = document.getElementById("questionForm");
const scrollableElement = document.getElementById('scrollableElement');



function setupEventListeners() {
    promptInput.addEventListener("keypress", handleEnterKey);
    resetBtn.addEventListener("click", resetHistory);
    stopBtn.addEventListener("click", stopResponse);
    window.addEventListener("message", handleMessage);
}

function stopResponse() {
    vscode.postMessage({ command: 'stopResponse', text: "" });
}

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
        case "chatThinking":
            resetAskButton();
            thinkingContainer.innerHTML = text;
            break;
        case "chatResponse":
            resetAskButton();
            responseContainer.innerHTML = text;
            scrollToBottom();
            break;
        case "getModelList":
            let modelList = text.split(",");
            populateModelList(modelList);
            break;
        case "getModelName":
            modelContainer.innerText = text;
            break;
    }

    // Reprocess the content to format any LaTeX or math symbols using MathJax
    MathJax.Hub.Queue(["Typeset", MathJax.Hub, responseContainer]);
}

// Function to populate the model options
function populateModelList(models) {
    const selectModelElement = document.getElementById('selectModelId');

    // Clear any existing options
    // selectModelElement.innerHTML = '<option value="" disabled selected>Select a model</option>';

    // Add new options dynamically
    models.forEach(model => {
        const option = document.createElement('option');
        option.value = model;
        option.textContent = model;
        selectModelElement.appendChild(option);
    });
}

// Function to handle model change
function changeModel() {
    const selectedModel = document.getElementById('selectModelId').value;

    if (selectedModel) {
        // Send the selected model to VS Code or handle the change as needed
        vscode.postMessage({ command: 'selectModel', text: selectedModel });
    }
}

function scrollToBottom() {
    if (scrollableElement) { scrollableElement.scrollTop = scrollableElement.scrollHeight; }
}