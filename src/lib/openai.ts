import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export const processBookImage = async (
  base64Image: string,
) => {
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: "You are a helpful assistant specialized in Buddhist literature. You help create book descriptions and extract information from book covers."
        },
        {
          role: "user",
          content: [
            {
              type: "text",
              text: "Please analyze this Buddhist book cover and provide:\n" +
                "1. Title in English and Chinese (if visible)\n" +
                "2. Brief description in English (100-150 words)\n" +
                "3. Brief description in Chinese (equivalent to English)\n" +
                "4. Relevant search tags\n" +
                "Format the response as JSON."
            },
            {
              type: "image_url",
              image_url: base64Image
            }
          ]
        }
      ],
      response_format: { type: "json_object" }
    });

    return response.choices[0].message.content;
  } catch (error) {
    console.error('Error processing book image:', error);
    throw new Error('Failed to process book image');
  }
}; 