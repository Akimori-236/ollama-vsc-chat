import * as vscode from 'vscode';
import ollama from 'ollama';
import { marked } from 'marked';
import getWebviewContent from './getWebviewContent';

export function activate(context: vscode.ExtensionContext) {
	let llm_in_use: string = "";

	selectModel().then(model => llm_in_use = model).catch(handleError);

	console.log('"ollama-vsc-chat" is now active!');

	const disposable = vscode.commands.registerCommand('ollama-vsc-chat.start', () => {
		const panel = vscode.window.createWebviewPanel("deepChat", "Ollama Chat", vscode.ViewColumn.One, { enableScripts: true });
		panel.webview.html = getWebviewContent(panel, context);

		setTimeout(() => panel.webview.postMessage({ command: "getModelName", text: llm_in_use }), 1000);
		let responseText = "";

		panel.webview.onDidReceiveMessage(async (message) => {
			switch (message.command) {
				case "chat": await chat(message);
					break;
				case "chatHistory": postResponse(responseText);
					break;
				case "chatReset": resetHistory();
					break;
				case "getModelName": panel.webview.postMessage({ command: "getModelName", text: llm_in_use });
					break;
				case "getModelList":
					await getModelList()
						.then(modelList => panel.webview.postMessage({ command: "getModelList", text: modelList.join(",") }));
					break;
				case "selectModel":
					await selectModel(message.text)
						.then(model => llm_in_use = model)
						.then(()=>vscode.window.showInformationMessage(`${llm_in_use} selected.`))
						.then(() => panel.webview.postMessage({ command: "getModelName", text: llm_in_use }));
					break;
				default: vscode.window.showErrorMessage("Unsupported message type.");
					break;
			}
		});

		async function chat(message: any) {
			let userPrompt = message.text;
			responseText += `\n --- \n${userPrompt}\n\n`;

			try {
				const streamResponse = await ollama.chat({
					model: llm_in_use,
					messages: [{ role: "user", content: responseText }],
					stream: true
				});

				for await (const part of streamResponse) {
					if (part.message.content && part.message.content !== "<think>" && part.message.content !== "</think>") {
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

export function deactivate() { }

async function getModelList(): Promise<string[]> {
	const models = await ollama.list();
	return models.models?.map(model => model.name)?.sort((a, b) => b.localeCompare(a)) || [];
}

async function selectModel(selectedModel: string = ""): Promise<string> {
	const modelList = await getModelList();
	if (modelList.length === 0) { throw new Error("No models detected in Ollama."); }
	return selectedModel ? modelList.find(name => name === selectedModel) || modelList[0] : modelList[0];
}

function handleError(error: any) {
	if (error instanceof Error) { vscode.window.showErrorMessage(`Error: ${error.message}`); }
	else { vscode.window.showErrorMessage("An unknown error occurred."); }
}
