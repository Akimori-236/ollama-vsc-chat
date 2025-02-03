
# DeepSeek VSC Chat

## Prerequisites

* Ollama
  * You can download Ollama at [https://ollama.com/download](https://ollama.com/download).
    1. Install Ollama
    2. After installing, run `ollama run deepseek-r1` on your terminal.
    3. You can verify with `ollama ps` on your terminal.
  * Or alternatively for [MAXIMUM SECURITY](https://youtu.be/7TR-FLWNVHY?si=e05gynmQfmM_37he)...

## Usage

1. Run `vsce package` to generate `.vsix` file
   * or use the ones provided in the repository
2. Install in VSCode via `Extensions` > `Install from VSIX...` > Select .vsix file
3. After installing, use `ctrl+shift+p` in VSCode and select "Start DeepSeek Chat"

## Versions

* 0.0.1
  * First version
* 0.0.2
  * UI updates
* 0.0.3
  * added Markdown & Latex formatting
