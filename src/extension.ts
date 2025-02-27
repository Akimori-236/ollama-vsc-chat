import * as vscode from 'vscode';
import ollama from 'ollama';
import { marked } from 'marked';
import getWebviewContent from './getWebviewContent';

export function activate(context: vscode.ExtensionContext) {
	let ai_model: string = "";

	selectModel().then(model => ai_model = model).catch(handleError);

	console.log('"ollama-vsc-chat" is now active!');

	const disposable = vscode.commands.registerCommand('ollama-vsc-chat.start', () => {
		const panel = vscode.window.createWebviewPanel("deepChat", "Ollama Chat", vscode.ViewColumn.One, { enableScripts: true });
		panel.webview.html = getWebviewContent(panel, context);

		setTimeout(() => panel.webview.postMessage({ command: "getModelName", text: ai_model }), 1000);
		let responseText = "";

		panel.webview.onDidReceiveMessage(async (message) => {
			switch (message.command) {
				case "chat": await chat(message); break;
				case "chatHistory": postResponse(responseText); break;
				case "chatReset": resetHistory(); break;
				case "getModelName": panel.webview.postMessage({ command: "getModelName", text: ai_model }); break;
				case "getModelList": await getModelList().then(modelList => panel.webview.postMessage({ command: "getModelList", text: modelList.join(",") })); break;
				case "selectModel": await selectModel(message.text).then(model => ai_model = model).then(() => panel.webview.postMessage({ command: "getModelName", text: ai_model })); break;
				default: vscode.window.showErrorMessage("Unsupported message type."); break;
			}
		});

		async function chat(message: any) {
			let thinkingText = "", userPrompt = message.text;
			responseText += `\n --- \n${userPrompt}\n`;

			try {
				const streamResponse = await ollama.chat({
					model: ai_model,
					messages: [{ role: "user", content: responseText }],
					stream: true
				});

				let isThinking = true;
				for await (const part of streamResponse) {
					if (part.message.content === "<think>") continue;
					if (part.message.content === "</think>") { isThinking = false; continue; }
					if (isThinking) {
						thinkingText += part.message.content;
						panel.webview.postMessage({ command: "chatThinking", text: thinkingText });
					} else {
						responseText += part.message.content;
						context.workspaceState.update("chatResponse", responseText);
						postResponse(responseText);
					}
				}
			} catch (error) { handleError(error); }
		}

		async function postResponse(responseText: string) {
			const htmlResponse = await marked(responseText.replace(/\\\[/g, '$$$').replace(/\\\]/g, '$$$'));
			panel.webview.postMessage({ command: "chatResponse", text: htmlResponse });
		}

		function resetHistory() {
			context.workspaceState.update("chatResponse", "");
			responseText = "";
			postResponse(responseText);
		}
	});

	context.subscriptions.push(disposable);
}

export function deactivate() {}

async function getModelList(): Promise<string[]> {
	const models = await ollama.list();
	return models.models?.map(model => model.name)?.sort((a, b) => b.localeCompare(a)) || [];
}

async function selectModel(selectedModel: string = ""): Promise<string> {
	const modelList = await getModelList();
	if (modelList.length === 0) throw new Error("No models detected in Ollama.");
	return selectedModel ? modelList.find(name => name === selectedModel) || modelList[0] : modelList[0];
}

function handleError(error: any) {
	if (error instanceof Error) vscode.window.showErrorMessage(`Error: ${error.message}`);
	else vscode.window.showErrorMessage("An unknown error occurred.");
}
