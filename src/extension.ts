// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import ollama from 'ollama';
import { marked } from 'marked';
import getWebviewContent from './getWebviewContent';

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {
	// Find a model in ollama
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
	console.log('"ollama-vsc-chat" is now active!');

	// The command has been defined in the package.json file
	// Now provide the implementation of the command with registerCommand
	// The commandId parameter must match the command field in package.json
	const disposable = vscode.commands.registerCommand('ollama-vsc-chat.start', () => {
		// The code you place here will be executed every time your command is executed
		// Display a message box to the user
		// vscode.window.showInformationMessage('Hello from Ollama VSC Chat!');
		const panel: vscode.WebviewPanel = vscode.window.createWebviewPanel(
			// Panel to house chat dialog UI
			"deepChat",
			"Ollama Chat",
			vscode.ViewColumn.One,
			{ enableScripts: true }
		);

		// DISPLAY
		panel.webview.html = getWebviewContent(panel, context);

		setTimeout(() => {
			panel.webview.postMessage({ command: "getModelName", text: ai_model });
		}, 1000);
		var responseText: string = "";

		// LISTENER
		panel.webview.onDidReceiveMessage(async (message: any) => {
			switch (message.command) {
				case "chat":
					chat(message);
					break;
				case "chatHistory":
					responseText = context.workspaceState.get("chatResponse") || "";
					postResponse(responseText);
					break;
				case "chatReset":
					context.workspaceState.update("chatResponse", "");
					responseText = context.workspaceState.get("chatResponse") || "";
					postResponse(responseText);
					break;
				case "getModelName":
					panel.webview.postMessage({ command: "getModelName", text: ai_model });
					break;
				case "getModelList":
					getModelList()
						.then((modelList) => { console.log(modelList); return modelList })
						.then(modelList => { panel.webview.postMessage({ command: "getModelList", text: modelList.join(",") }); })
						.catch(error => {
							console.error("Failed to fetch model list:", error);
							panel.webview.postMessage({ command: "getModelListError", text: "Failed to load model list" });
						});
					break;

				case "selectModel":
					selectModel(message.text)
						.then((model: string) => ai_model = model)
						.then(() => panel.webview.postMessage({ command: "getModelName", text: ai_model }))
						.catch((error) => {
							if (error instanceof Error) { vscode.window.showErrorMessage(`Error: ${error.message}`); }
							else { vscode.window.showErrorMessage("An unknown error occurred."); }
						});
					break;
				default:
					vscode.window.showErrorMessage("Unsupported message type.");
					break;
			}
		});

		async function chat(message: any) {
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
		}

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



async function getModelList(): Promise<string[]> {
	const models = await ollama.list();
	return models.models
		?.map(model => model.name)
		?.sort((a, b) => b.localeCompare(a));
}

async function selectModel(selectedModel: string = ""): Promise<string> {
	const modelList = await getModelList();

	if (modelList.length === 0) {
		throw new Error("No models detected in Ollama, download some and try again.");
	}
	else if (selectedModel === "") {
		vscode.window.showInformationMessage(`Using model: ${modelList[0]}`);
		return modelList[0];
	}
	else {
		let selection = modelList?.filter(name => name === selectedModel)[0];
		if (selection) { return selection; }
		else { return modelList[0]; };
	}
}
