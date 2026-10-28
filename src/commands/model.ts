import ollama from "ollama";

export const listModels = async () => {
  const { models } = await ollama.list();
  console.log(models.map((m) => m.name).join("\n"));
};

export const modelDetails = async (modelName: string) => {
  const details = ollama.show({ model: modelName });
  console.log(details);
};

interface PullRequest {
  model: string;
  insecure?: boolean;
  stream?: boolean;
}

export const pullModel = async ({ model, stream }: PullRequest) => {
  return stream
    ? ollama.pull({ model, stream: true })
    : ollama.pull({ model, stream: false });
};

