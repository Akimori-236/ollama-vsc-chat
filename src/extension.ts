// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import ollama from 'ollama';
import { marked } from 'marked';

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {
	// Find a deepseek model in ollama
	var ai_model: string = "";
	selectModel()
		.then((model: string) => {
			console.log(model);
			ai_model = model;
		})
		.catch((error) => {
			if (error instanceof Error) {
				vscode.window.showErrorMessage(`Error: ${error.message}`);
			} else {
				vscode.window.showErrorMessage("An unknown error occurred.");
			}
		});



	// Use the console to output diagnostic information (console.log) and errors (console.error)
	// This line of code will only be executed once when your extension is activated
	console.log('"deepseek-vsc-chat" is now active!');

	// The command has been defined in the package.json file
	// Now provide the implementation of the command with registerCommand
	// The commandId parameter must match the command field in package.json
	const disposable = vscode.commands.registerCommand('deepseek-vsc-chat.start', () => {
		// The code you place here will be executed every time your command is executed
		// Display a message box to the user
		// vscode.window.showInformationMessage('Hello from DeepSeek VSC Chat!');
		const panel: vscode.WebviewPanel = vscode.window.createWebviewPanel(
			// Panel to house chat dialog UI
			"deepChat",
			"DeepSeek Chat",
			vscode.ViewColumn.One,
			{ enableScripts: true }
		);
		panel.webview.html = getWebviewContent();
		setTimeout(() => {
			panel.webview.postMessage({ command: "getModelName", text: ai_model });
		}, 1000);
		var responseText: string = "";

		// listener
		panel.webview.onDidReceiveMessage(async (message: any) => {

			if (message.command === "chat") {
				var thinkingText: string = "";
				responseText += "\n --- \n";
				const userPrompt = message.text;
				responseText += userPrompt + "\n";

				try {
					const streamResponse = await ollama.chat({
						model: ai_model,
						messages: [{ role: "user", content: responseText }],
						stream: true
					});

					// update the UI with part of the response stream
					let isThinking = true;
					for await (const part of streamResponse) {
						if (part.message.content === "<think>") {
							continue;
						}
						if (part.message.content === "</think>") {
							isThinking = false;
							continue;
						}
						if (isThinking) {
							thinkingText += part.message.content;
							thinkingText = thinkingText;
							panel.webview.postMessage({ command: "chatThinking", text: thinkingText });
						} else {
							responseText += part.message.content;
							responseText = responseText;
							context.workspaceState.update("chatResponse", responseText);
							postResponse(responseText);
						}
					}
				} catch (error) {
					if (error instanceof Error) {
						vscode.window.showErrorMessage(`Error: ${error.message}`);
					} else {
						vscode.window.showErrorMessage("Unknown error occurred.");
					}
				}
			} else if (message.command === "chatHistory") {
				responseText = context.workspaceState.get("chatResponse") || "";
				postResponse(responseText);
			} else if (message.command === "chatReset") {
				context.workspaceState.update("chatResponse", "");
				responseText = context.workspaceState.get("chatResponse") || "";
				postResponse(responseText);
			} else if (message.command === "getModelName") {
				panel.webview.postMessage({ command: "getModelName", text: ai_model });
			}
		});

		async function postResponse(responseText: string) {
			let processedResponse = responseText
				.replace(/\\\[/g, '$$$')
				.replace(/\\\]/g, '$$$');
			// .replace(/\\\(/g, '\\\(')
			// .replace(/\\\)/g, '\\\)');
			const htmlResponse = await marked(processedResponse);
			panel.webview.postMessage({ command: "chatResponse", text: htmlResponse });
		}
	});

	context.subscriptions.push(disposable);
}

// This method is called when your extension is deactivated
export function deactivate() { }



async function selectModel(): Promise<string> {
	const models = await ollama.list();

	const modelList = models.models
		?.map(model => model.name)
		?.filter((name) => name.toLowerCase().startsWith("deepseek"))
		.sort((a, b) => b.localeCompare(a));
	vscode.window.showInformationMessage(`Available DeepSeek models: ${JSON.stringify(modelList)}`);

	if (modelList.length === 0) {
		throw new Error("No models detected in Ollama, download some and try again.");
	}
	// FIXME: showQuickPick
	// else if (modelList.length > 1) {
	// 	// const selection = await vscode.window.showQuickPick(modelList, { placeHolder: "Select a model to use..." });
	// 	// if (selection !== undefined) {
	// 	// 	vscode.window.showInformationMessage(`Using model: ${selection}`);
	// 	// 	return selection;
	// 	// } else {
	// 	// 	throw new Error("Invalid model selected.");
	// 	// }
	// }
	else {
		vscode.window.showInformationMessage(`Using model: ${modelList[0]}`);
		return modelList[0];
	}
}




function getWebviewContent(): string {
	return /*html*/`
	<!DOCTYPE html>
	<html lang="en">

	<head>
		<meta charset="UTF-8">
		<meta name="viewport" content="width=device-width, initial-scale=1.0">
		<title>DeepSeek Assistant</title>
		<!-- Bootstrap -->
		<link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css" rel="stylesheet" integrity="sha384-QWTKZyjpPEjISv5WaRU9OFeRpok6YctnYmDr5pNlyT2bRjXh0JMhjY6hW+ALEwIH" crossorigin="anonymous">
		<script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/js/bootstrap.bundle.min.js" integrity="sha384-YvpcrYf0tY3lHB60NNkmXc5s9fDVZLESaAA55NDzOxhy9GkcIdslK1eN7N6jIeHz" crossorigin="anonymous"></script>
		<!-- Marked -->
		<script src="https://cdn.jsdelivr.net/npm/marked/marked.min.js"></script>
		<!-- MathJax -->
		<script src="https://cdnjs.cloudflare.com/ajax/libs/mathjax/2.7.7/MathJax.js?config=TeX-MML-AM_CHTML"></script>
		<script>
			function scrollToBottom() {
				const scrollableElement = document.getElementById('scrollableElement');
				if (scrollableElement) {
					scrollableElement.scrollTop = scrollableElement.scrollHeight;
				}
			}
			function onLoad(){
				document.getElementById("promptId").focus();
				document.getElementsByClassName("container")[0].style.height = window.innerHeight + 'px';
				vscode.postMessage({command:"chatHistory", text: ""});
				scrollToBottom();
			}
			function autoResize(textarea) {
				textarea.style.height = "auto";
				textarea.style.height = (textarea.scrollHeight) + "px";
			}
		</script>
	</head>

	<body class="bg-dark" onload="onLoad()">
		<div class="container">
			<h2 class="text-light">
				DeepSeek VS Code Extension
				<span class="badge text-bg-secondary" id="modelId"></span>
			</h2>

			<form id="questionForm" onsubmit="askQuestion(event)">
			<button class="btn btn-outline-light" type="button" id="resetBtnId">Reset</button>
			<div class="overflow-y-auto" style="max-height:700px" id="scrollableElement">
				<div class="border border-secondary rounded text-secondary p-2 lh-1 fst-italic" id="thinkingId"></div>
				<div class="border border-light rounded text-light p-2" id="responseId"></div>
			</div>
			<br />
			<div class="input-group vh-25 mb-4">
				<textarea required class="form-control" name="prompt" id="promptId" rows="1" oninput="autoResize(this)"
					placeholder="Ask DeepSeek-R1"></textarea>
				<button class="btn btn-primary" type="submit" id="askBtnId" style="width: 4rem;">Ask</button>
			</div>
			</form>
		</div>



		<script>
			const SPINNER = '<div class="spinner-border spinner-border-sm text-light" role="status"><span class="visually-hidden">Loading...</span></div>'
			const vscode = acquireVsCodeApi();
			function askQuestion(event) {
				event.preventDefault();

				const text = document.getElementById("promptId").value.trim();
				if (text) {
					vscode.postMessage({command: "chat", text});
					document.getElementById("askBtnId").disabled = true
					document.getElementById("askBtnId").innerHTML = SPINNER
				}
			}
			// post question to AI on enter key
			document.getElementById("promptId").addEventListener("keypress", (event) => {
				form = document.getElementById("questionForm")
				if (event.key === "Enter") {
					if (event.shiftKey) {

					} else {
						event.preventDefault();
						isValid = form.checkValidity();
						if (isValid) {
							askQuestion(event);
						} else {
							form.reportValidity();
						}
					}
				}
			});

			// Reset history
			document.getElementById("resetBtnId").addEventListener("click", ()=>{
				document.getElementById("thinkingId").innerHTML = "";
				vscode.postMessage({command: 'chatReset', text:''})
			})

			// listen for response stream
			window.addEventListener("message", event=>{
				const {command, text} = event.data;
				const askButton = document.getElementById("askBtnId");
				const responseContainer = document.getElementById("responseId");
				if (command === "chatResponse") {
					askButton.disabled = false
					askButton.innerText = "Ask"
					responseContainer.innerHTML = text;
					scrollToBottom();
				} else if (command === "chatThinking") {
					document.getElementById("thinkingId").innerHTML = text;
				} else if (command === "getModelName") {
					console.log(text)
					document.getElementById("modelId").innerText = text;
				}
				// parse Latex with MathJax
				MathJax.Hub.Queue(["Typeset", MathJax.Hub, responseContainer]);
				// MathJax.Hub.Queue(["Typeset", MathJax.Hub]);
			})

		</script>



	</body>
	</html>
	`;
}
