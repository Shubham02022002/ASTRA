import OpenAI from "openai";
import type { ChatCompletion } from "openai/resources";

const openai = new OpenAI({
  baseURL: "https://openrouter.ai/api/v1",
  apiKey: process.env.OPENROUTER_API_KEY,
});

async function main(): Promise<void> {
  const completion: ChatCompletion = await openai.chat.completions.create({
    model: "~openai/gpt-sol-latest",
    max_tokens: 1000,
    messages: [
      {
        role: "user",
        content: "What is the meaning of life?",
      },
    ],
  });

  const choice = completion.choices[0];

  if (choice) {
    console.log(choice.message);
  }
}
main();
