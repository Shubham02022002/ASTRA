import { saveMessage } from "../memory";
import type { ChatMessage, LLMResponse } from "../providers/provider.interface";
import type { Ctx } from "../slash";
import { runTool, toolDefinitions } from "../tools/registry";
import { ui } from "../ui";

export const MAX_ITERATIONS = 10;

function summarize(args: Record<string, unknown>): string {
  return Object.entries(args)
    .map(([k, v]) => `${k}: ${typeof v === "string" ? v : JSON.stringify(v)}`)
    .join(", ");
}

function firstLine(s: string): string {
  const line = s.split("\n", 1)[0] ?? "";
  return line.length > 80 ? line.slice(0, 80) + "…" : line;
}

export async function runAgent(ctx: Ctx): Promise<void> {
  for (let round = 0; round < MAX_ITERATIONS; round++) {
    const controller = new AbortController();
    ctx.abort = () => controller.abort();
    let streamed = "";
    let response: LLMResponse;
    try {
      response = await ctx.llm.chat(ctx.messages, {
        tools: toolDefinitions(),
        signal: controller.signal,
        onToken: (text) => {
          process.stdout.write(text);
          streamed += text;
        },
      });
    } catch (err) {
      const name = (err as Error).name;
      if (!controller.signal.aborted && name !== "AbortError") throw err;
      process.stdout.write(ui.stopped() + "\n");
      return;
    } finally {
      ctx.abort = undefined;
    }

    const content = response.content ?? streamed;

    if (!response.toolCalls.length) {
      process.stdout.write("\n");
      if (content) {
        const msg: ChatMessage = { role: "assistant", content };
        ctx.messages.push(msg);
        await saveMessage(ctx.sessionFile, msg);
      }
      return;
    }

    process.stdout.write("\n");
    const assistant: ChatMessage = {
      role: "assistant",
      content: content || "",
      toolCalls: response.toolCalls,
    };
    ctx.messages.push(assistant);
    await saveMessage(ctx.sessionFile, assistant);

    for (const call of response.toolCalls) {
      process.stderr.write(ui.tool(call.name, summarize(call.arguments)) + "\n");
      const result = await runTool(call.name, call.arguments, ctx);
      process.stderr.write(ui.toolResult(firstLine(result)) + "\n");

      const msg: ChatMessage = {
        role: "tool",
        content: result,
        toolCallId: call.id,
        toolName: call.name,
      };
      ctx.messages.push(msg);
      await saveMessage(ctx.sessionFile, msg);
    }
  }

  ui.warn(`stopped after ${MAX_ITERATIONS} tool rounds without a final answer`);
}
