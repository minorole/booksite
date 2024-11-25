import OpenAI from 'openai';

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  maxRetries: 3,
});

export async function chatWithGPT4o(messages: any[]) {
  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o", // Exactly as specified in PRD
      messages,
      temperature: 0.7,
      max_tokens: 16384, // As per PRD
    });

    return completion.choices[0].message;
  } catch (error) {
    console.error('OpenAI API Error:', error);
    throw error;
  }
}

export { openai }; 