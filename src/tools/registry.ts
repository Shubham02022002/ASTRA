import type { z } from "zod";
import type { ToolDefinition } from "../providers/provider.interface";
import { readFileTool } from "./read-file";

export type ToolContext = { cwd: string; yes: boolean };

export interface Tool {
  name: string;
  description: string;
  parameters: Record<string, unknown>;
  schema: z.ZodType;
  execute(args: Record<string, unknown>, ctx: ToolContext): Promise<string>;
}

const tools: Tool[] = [readFileTool];

export function toolDefinitions(): ToolDefinition[] {
  return tools.map(({ name, description, parameters }) => ({
    name,
    description,
    parameters,
  }));
}

export function toolList(): Tool[] {
  return tools;
}

export async function runTool(
  name: string,
  args: Record<string, unknown>,
  ctx: ToolContext,
): Promise<string> {
  const tool = tools.find((t) => t.name === name);
  if (!tool) return `unknown tool: ${name}`;
  const parsed = tool.schema.safeParse(args);
  if (!parsed.success) return `invalid arguments for ${name}: ${parsed.error.message}`;
  try {
    return await tool.execute(args, ctx);
  } catch (err) {
    return `error: ${err instanceof Error ? err.message : String(err)}`;
  }
}
