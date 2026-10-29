import { appendFile, mkdir, readdir, readFile } from "node:fs/promises";
import { homedir } from "node:os";
import path from "node:path";
import type { Message } from "ollama";

const DIR = path.join(homedir(), ".ASTRA", "sessions");

export async function newSession() {
  await mkdir(DIR, { recursive: true });
  return path.join(DIR, `${Date.now()}.jsonl`);
}

export async function latestSession() {
  try {
    const files = (await readdir(DIR))
      .filter((f) => f.endsWith(".jsonl"))
      .sort();
    const last = files.at(-1);
    return last ? path.join(DIR, last) : undefined;
  } catch {
    return undefined;
  }
}

export async function loadSession(file: string): Promise<Message[]> {
  const text = await readFile(file, "utf8");
  return text
    .split("\n")
    .filter(Boolean)
    .map((line) => JSON.parse(line));
}

export async function saveMessage(file: string, msg: Message) {
  await appendFile(file, JSON.stringify(msg) + "\n");
}
