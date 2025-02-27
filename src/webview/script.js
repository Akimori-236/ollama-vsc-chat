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

            // If <think> tag is present in the text
            if (text.includes("<think>") && text.includes("</think>")) {
                const thinkParts = text.split("<think>").map(part => part.split("</think>"));

                // Split into thinking and response parts
                if (thinkParts.length > 1) {
                    // The first part is for thinkingContainer
                    thinkingContainer.innerHTML = thinkParts[1][0].trim();

                    // The second part is for responseContainer
                    responseContainer.innerHTML = thinkParts[1][1].trim();
                }
            } else if (text.includes("<think>")) {
                // If only <think> tag is present
                thinkingContainer.innerHTML = text.replace(/<\/?think>/g, '').trim();
            } else {
                // If no <think> tags are found, just display in responseContainer
                responseContainer.innerHTML = text;
            }
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