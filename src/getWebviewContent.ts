import * as path from 'path';
import * as vscode from 'vscode';
import * as fs from 'fs';


export default function getWebviewContent(panel: vscode.WebviewPanel, context: vscode.ExtensionContext): string {
    // Get the path to the index.html file
    const indexHtmlPath = path.join(context.extensionPath, 'src', 'webview', 'index.html');
    const indexHtmlContent = fs.readFileSync(indexHtmlPath, 'utf8'); // Read the file content

    // Get the path to the external script
    const scriptUri = vscode.Uri.file(path.join(context.extensionPath, 'src', 'webview', 'script.js'));
    const scriptSrc = panel.webview.asWebviewUri(scriptUri);

    // Replace the script src to use the webview URI
    const finalHtmlContent = indexHtmlContent.replace('<script src="script.js"></script>', `<script src="${scriptSrc}"></script>`);

    return finalHtmlContent;
}