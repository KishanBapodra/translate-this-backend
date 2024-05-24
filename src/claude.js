import Anthropic from "@anthropic-ai/sdk";

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

const translateText = async (text, language) => {
  try {
    const response = await anthropic.messages.create({
      max_tokens: 1024,
      messages: [
        {
          role: "user",
          content: `Translate following text into ${language} without adding anything else: ${text}`,
        },
      ],
      model: "claude-3-opus-20240229",
    });

    return response.content;
  } catch (err) {
    console.error(err);
    throw new Error("Failed to translate text");
  }
};
export default translateText;
