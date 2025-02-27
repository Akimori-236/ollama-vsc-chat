# Ollama VSC Chat

## Prerequisites

* Ollama
  * You can download Ollama at [https://ollama.com/download](https://ollama.com/download).
    1. Install Ollama
    2. After installing, run eg.`ollama run deepseek-r1` on your terminal.
    3. You can verify with `ollama ps` on your terminal.
  * Or alternatively for [MAXIMUM SECURITY](https://youtu.be/7TR-FLWNVHY?si=e05gynmQfmM_37he)...

## Usage

1. Run `vsce package` to generate `.vsix` file
   * or use the ones provided in the repository
2. Install in VSCode via `Extensions` > `Install from VSIX...` > Select .vsix file
3. After installing, use `ctrl+shift+p` in VSCode and select "Start Ollama Chat"

## Credits

Thank you [Fireship](https://youtube.com/@beyondfireship?si=zWoZxPfQUvpgsNzJ) for the [tutorial](https://youtu.be/clJCDHml2cA?si=4OtjgYU6vWYvCcCb)!

## Versions

* 0.0.1
  * First version
* 0.0.2
  * UI updates
* 0.0.3
  * added Markdown & Latex formatting
* 0.0.4
  * Dynamically get one of DeepSeek models from user's Ollama
* 0.0.5
  * Allow user to select which ollama model to use
