import OpenAI from "openai";
import type { ChatCompletion } from "openai/resources";

const openai = new OpenAI({
  baseURL: "https://generativelanguage.googleapis.com/v1beta/openai/",
  apiKey: process.env.GEMINI_API_KEY,
});

async function main(): Promise<void> {
  const completion: ChatCompletion = await openai.chat.completions.create({
    model: "gemini-3.8-flash",
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
console.log("working");
main();
