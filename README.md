# ASTRA

A terminal AI coding agent. Chat with a local [Ollama](https://ollama.com) model or a cloud LLM (Groq, Gemini, OpenRouter), let the agent read your codebase with tools, and keep every conversation saved on disk.

![Bun](https://img.shields.io/badge/runtime-Bun-000000?logo=bun&logoColor=white)
![TypeScript](https://img.shields.io/badge/language-TypeScript-3178C6?logo=typescript&logoColor=white)
![Providers](https://img.shields.io/badge/providers-Ollama%20%7C%20Groq%20%7C%20Gemini%20%7C%20OpenRouter-D97757)

## Features

- **Multiple providers** — local Ollama or cloud Groq / Gemini / OpenRouter through one OpenAI-compatible client.
- **Streaming chat** — replies stream token by token in the terminal.
- **Agent tool loop** — the model can call tools (currently `read_file`) for up to 10 rounds per turn.
- **Per-provider models** — each provider remembers the model you last used with it.
- **Persistent sessions** — transcripts are stored as JSONL and can be resumed later.
- **Slash commands** — manage providers, models, and sessions without leaving the chat, with tab completion.

## Requirements

- [Bun](https://bun.com) 1.4 or newer
- [Ollama](https://ollama.com) — only if you want local models
- An API key for each cloud provider you use

## Install

```bash
git clone <your-repo-url>
cd cli
bun install
```

## Quick start

```bash
# Interactive chat with the saved provider
bun run src/index.ts

# One-shot prompt, then exit
bun run src/index.ts -p "Summarize src/index.ts"

# Local model through Ollama
bun run src/index.ts --provider ollama -m qwen2.5-coder:0.5b

# Validate a provider and save it as the default
bun run src/index.ts provider set groq
bun run src/index.ts provider list
```

`bun run dev` is a shortcut for `bun run src/index.ts`. On first run ASTRA uses Ollama; switch with `--provider` or `provider set`.

### API keys

Keys are read from environment variables. Bun also loads a `.env` file in the project root automatically:

```bash
GROQ_API_KEY=your-key
GEMINI_API_KEY=your-key
OPENROUTER_API_KEY=your-key
```

In PowerShell:

```powershell
$env:GROQ_API_KEY = "your-key"
```

Ollama runs locally and needs no key.

## Providers

| Provider   | Type  | API key env var        | Default model          |
| ---------- | ----- | ---------------------- | ---------------------- |
| `ollama`   | local | —                      | `qwen2.5-coder:0.5b`   |
| `groq`     | cloud | `GROQ_API_KEY`         | `openai/gpt-oss-20b`   |
| `gemini`   | cloud | `GEMINI_API_KEY`       | `gemini-2.5-flash`     |
| `openrouter` | cloud | `OPENROUTER_API_KEY` | `openai/gpt-4o-mini`   |

`provider set` verifies access before saving: a rejected key or unreachable Ollama aborts the switch.

## CLI reference

| Command | Description |
| ------- | ----------- |
| `ASTRA` | Start interactive chat |
| `ASTRA -p "<prompt>"` | Run one prompt, print the answer, exit |
| `ASTRA -c` | Continue the most recent session |
| `ASTRA --provider <name>` | Provider for this run |
| `ASTRA -m, --model <name>` | Model for this run |
| `ASTRA --cwd <dir>` | Directory the agent works in (default: current directory) |
| `ASTRA --yes` | Skip permission prompts |
| `ASTRA models` | List models for the active provider |
| `ASTRA show <model>` | Show model details (Ollama) |
| `ASTRA pull <model>` | Download an Ollama model |
| `ASTRA provider list` | Show providers and the saved default |
| `ASTRA provider set <name> [-m <model>]` | Validate and set the default provider |

## In-chat commands

Type `/` at the prompt. Press **Tab** to complete a command name.

| Command | Description |
| ------- | ----------- |
| `/help` | List all commands |
| `/provider` | Show providers and the active one |
| `/provider set <name>` | Switch provider and save it as the default |
| `/model` | Show the current model and available models |
| `/model <name>` | Switch model for the current provider |
| `/tools` | List tools the agent can call |
| `/clear` | Start a fresh conversation |
| `/sessions` | List saved sessions |
| `/resume [number]` | Resume a saved session (most recent if omitted) |
| `/exit` | Quit |

## Agent and tools

Every user turn streams the model's answer and runs the tool calls it requests in a loop, up to 10 rounds. Tool calls and their results are printed inline so you can see what the agent is doing.

- **`read_file`** — read a workspace file with numbered lines. Supports `offset` and `limit` for large files (default 500 lines, max 2000).
- Paths are sandboxed to `--cwd`; anything that escapes the workspace is rejected.
- **Ctrl+C** stops an in-flight reply.

## Configuration and sessions

| Path | Contents |
| ---- | -------- |
| `~/.ASTRA/config.json` | Default provider and the saved model per provider |
| `~/.ASTRA/sessions/*.jsonl` | Conversation transcripts, one JSON message per line |

Both are plain text. Delete `config.json` to reset to the built-in defaults.

## Project structure

```
src/
  index.ts          CLI entry point (commander)
  ui.ts             terminal styling and banner
  agent/            system prompt and streaming tool-calling loop
  commands/         chat, model, and provider actions
  config/           settings persistence
  memory.ts         session transcript storage
  providers/        Ollama and OpenAI-compatible providers
  slash/            in-chat slash commands
  tools/            tool registry and read_file
```

## Development

```bash
bun install
bun run dev        # start the CLI
bun run typecheck  # bun check — no type errors expected
```

## Roadmap

- Arrow-key pickers for slash commands, providers, and models instead of typing names.
- Groq as the default provider on first run.
- More agent tools.
