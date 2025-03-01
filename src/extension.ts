import * as vscode from 'vscode';
import ollama, { ChatResponse } from 'ollama';
import { marked } from 'marked';
import getWebviewContent from './getWebviewContent';
import { Message, } from 'ollama';

const STYLE_PROMPT: Message = {
	role: "system",
	content: "Please respond in a friendly and helpful manner.",
};
const OLLAMA_OPTIONS = {
	// temperature: 0.7, // Set the model's creativity level
	// top_p: 1.0, // Set nucleus sampling (controls diversity)
	// max_tokens: 150, // Limit the number of tokens (words/characters)
};



export function activate(context: vscode.ExtensionContext) {
	var llm_in_use: string = "";
	selectModel().then(model => llm_in_use = model).catch(handleError);

	console.log('"ollama-vsc-chat" is now active!');

	const disposable = vscode.commands.registerCommand('ollama-vsc-chat.start', () => {
		const panel = vscode.window.createWebviewPanel("deepChat", "Ollama Chat", vscode.ViewColumn.One, { enableScripts: true });
		panel.webview.html = getWebviewContent(panel, context);

		setTimeout(() => panel.webview.postMessage({ command: "getModelName", text: llm_in_use }), 1000);
		var message_list: Message[] = [STYLE_PROMPT,];

		panel.webview.onDidReceiveMessage(async (message) => {
			switch (message?.command) {
				case "chat":
					console.log("Chat received!");
					await chat(message);
					break;
				case "chatHistory":
					console.log("Retrieving chat history");
					postResponse(message_list);
					break;
				case "chatReset":
					resetHistory();
					console.log("Chat reset!");
					break;
				case "getModelName":
					panel.webview.postMessage({ command: "getModelName", text: llm_in_use });
					console.log(`Model in use: ${llm_in_use}`);
					break;
				case "getModelList":
					await getModelList()
						.then(modelList => panel.webview.postMessage({ command: "getModelList", text: modelList?.join(",") }));
					break;
				case "selectModel":
					await selectModel(message?.text)
						.then(model => llm_in_use = model)
						.then(() => panel.webview.postMessage({ command: "getModelName", text: llm_in_use }))
						.then(() => vscode.window.showInformationMessage(`${llm_in_use} selected.`));
					break;
				case "stopResponse":
					console.log("Stopping response...");
					isStopResponse = true;
					break;
				default: vscode.window.showErrorMessage("Unsupported message type.");
					break;
			}
		});

		var isStopResponse = false;

		async function chat(message: any) {
			isStopResponse = false;
			let thinkingText = '';  // Variable to store text between <think> and </think>
			let isThinking = false;  // Boolean flag to track if we are inside <think>...</think>

			let user_message: Message = {
				role: "user",
				content: message?.text,
				images: message?.image, // for image chat in future ver
			};
			console.log("Recording user message...");
			message_list.push(user_message);
			console.log("User message recorded!");

			try {
				// send chat to model
				console.log("Sending user prompt to model...");
				const streamResponse = await ollama.chat(
					{
						model: llm_in_use,
						messages: message_list,
						stream: true,
						options: OLLAMA_OPTIONS,
					});


				let partialResponse = "";
				// process response from model
				console.log("Processing model response...");
				for await (let part of streamResponse) {
					if (isStopResponse) { break; }
					if (!part.message.content) { continue; }  // Skip empty content

					let content = part.message.content;
					process.stdout.write(`${content}`);
					// Handle <think> start
					if (content.includes("<think>")) {
						isThinking = true;
						content = content.split("<think>")[1];  // Get content after <think>
					}

					// Handle </think> end
					if (content.includes("</think>")) {
						isThinking = false;
						let endContent = content.split("</think>")[0];  // Get content before </think>
						thinkingText += endContent;  // Add to thinkingText
						content = content.split("</think>")[1] || '';  // Get any remaining content after </think>
					}

					// Add the content to the appropriate variable
					if (isThinking) {
						// Inside <think>, add to thinkingText
						thinkingText += content;
						postThinking(thinkingText);
					} else {
						// Outside <think>, add to responseText
						partialResponse += content;
						postResponse(message_list, partialResponse);
					}
				}
				// add response as context for next query
				message_list.push({
					role: "assistant",
					content: partialResponse,
				});

			} catch (error) {
				handleError(error);
			}
		}

		async function postThinking(thinkingText: string) {
			let htmlResponse = await marked(thinkingText.replace(/\\\[/g, '$$$').replace(/\\\]/g, '$$$'));
			panel.webview.postMessage({ command: "chatThinking", text: htmlResponse });
		}

		async function postResponse(message_list: Message[], partialResponse: string = "") {
			let responseText = message_list.filter(message => message?.role !== "system").map(message => message?.content).join("<hr/>");
			responseText += "<hr/>" + partialResponse;
			let htmlResponse = await marked(responseText.replace(/\\\[/g, '$$$').replace(/\\\]/g, '$$$'));
			panel.webview.postMessage({ command: "chatResponse", text: htmlResponse });
		}

		function resetHistory() {
			context.workspaceState.update("chatResponse", "");
			message_list = [STYLE_PROMPT,];
			postResponse(message_list);
		}
	});

	context.subscriptions.push(disposable);
}

export function deactivate() { }

async function getModelList(): Promise<string[]> {
	let models = await ollama.list();
	let model_names = models.models?.map(model => model.name)?.sort((a, b) => b.localeCompare(a)) || [];
	console.log(`Available models: ${model_names.join(", ")}`);
	return model_names;
}

async function selectModel(selectModelName: string = ""): Promise<string> {
	let modelList = await getModelList();
	if (modelList.length === 0) { throw new Error("No models detected in Ollama."); }
	let selectedModelName = selectModelName ? modelList.find(name => name === selectModelName) || modelList[0] : modelList[0];
	console.log(`Model selected: ${selectedModelName}`);
	return selectedModelName;
}

function handleError(error: any) {
	if (error instanceof Error) { vscode.window.showErrorMessage(`Error: ${error.message}`); }
	else { vscode.window.showErrorMessage("An unknown error occurred."); }
}
