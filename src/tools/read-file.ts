import { readFile } from "node:fs/promises";
import path from "node:path";
import { z } from "zod";
import type { Tool } from "./registry";

const schema = z.object({
  path: z.string().min(1),
  offset: z.number().int().min(1).optional(),
  limit: z.number().int().min(1).max(2000).optional(),
});

const DEFAULT_LINES = 500;
const MAX_CHARS = 50_000;

export function resolveInside(cwd: string, file: string): string {
  const resolved = path.resolve(cwd, file);
  const rel = path.relative(cwd, resolved);
  if (rel && (rel.startsWith("..") || path.isAbsolute(rel))) {
    throw new Error(`path escapes the workspace: ${file}`);
  }
  return resolved;
}

export const readFileTool: Tool = {
  name: "read_file",
  schema,
  description:
    "Read a text file from the workspace. Returns numbered lines. Use offset and limit for large files.",
  parameters: {
    type: "object",
    properties: {
      path: {
        type: "string",
        description: "File path relative to the workspace root",
      },
      offset: {
        type: "integer",
        description: "First line to return (1-based)",
      },
      limit: {
        type: "integer",
        description: `Maximum lines to return (default ${DEFAULT_LINES}, max 2000)`,
      },
    },
    required: ["path"],
  },

  async execute(args, ctx) {
    const { path: file, offset, limit } = schema.parse(args);
    const target = resolveInside(ctx.cwd, file);
    const text = await readFile(target, "utf8");
    if (!text) return "(empty file)";

    const lines = text.split("\n");
    const start = (offset ?? 1) - 1;
    const count = limit ?? DEFAULT_LINES;
    const slice = lines.slice(start, start + count);
    if (!slice.length) {
      return `(no content at line ${start + 1}; file has ${lines.length} lines)`;
    }

    const numbered = slice
      .map((line, i) => `${start + i + 1}\t${line}`)
      .join("\n");
    const remaining = lines.length - start - slice.length;
    const out = remaining > 0 ? `${numbered}\n… (${remaining} more lines)` : numbered;
    return out.length > MAX_CHARS ? out.slice(0, MAX_CHARS) + "\n… (truncated)" : out;
  },
};
