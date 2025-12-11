import { GoogleGenerativeAI } from "@google/generative-ai";

const API_KEY = import.meta.env.VITE_GEMINI_API_KEY;

/**
 * Generate title and description for a marketplace item
 * @param {string} keywords - User-provided keywords about the item
 * @param {string} category - Item category
 * @param {string} imageDataUrl - Optional: Base64 image data URL for image analysis
 * @returns {Promise<{title: string, description: string}>}
 */
export const generateDescription = async (keywords, category, imageDataUrl = null) => {
  if (!API_KEY) {
    console.error("Error: VITE_GEMINI_API_KEY is missing from .env file");
    return {
      title: "Config Error",
      description: "API Key is missing. Please check your .env file and restart the server."
    };
  }

  try {
    const genAI = new GoogleGenerativeAI(API_KEY);
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

    // Build the prompt
    let prompt = `You are a professional copywriter for ReThrive, a university student secondhand marketplace at USM (Universiti Sains Malaysia).

Context:
- Category: ${category || "Not specified"}
- Item keywords/details: ${keywords || "Not provided"}

Task:
Create an engaging listing for this secondhand item that will appeal to students. The listing should be:
- Clear and honest about the item's condition
- Appealing to budget-conscious students
- Specific about what makes this item valuable
- Written in a friendly, casual tone suitable for a student marketplace

Requirements:
- Title: Maximum 60 characters, simple, catchy, casual and descriptive
- Description: 2-3 sentences that highlight key features, condition, and why it's a good deal

Return ONLY a valid JSON object with this exact format (no markdown, no code blocks):
{
  "title": "Your catchy title here",
  "description": "Your persuasive description here"
}`;

    // If image is provided, use vision model
    if (imageDataUrl) {
      try {
        // Convert data URL to base64
        const base64Data = imageDataUrl.split(',')[1];

        const result = await model.generateContent([
          prompt,
          {
            inlineData: {
              data: base64Data,
              mimeType: "image/jpeg"
            }
          }
        ]);

        const response = await result.response;
        const text = response.text();

        return parseAIResponse(text);
      } catch (visionError) {
        console.warn("Vision model failed, falling back to text-only:", visionError);
        // Fall through to text-only generation
      }
    }

    // Text-only generation
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    return parseAIResponse(text);

  } catch (error) {
    console.error("Gemini API Error:", error);
    return {
      title: keywords ? keywords.substring(0, 60) : "Item For Sale",
      description: `A great ${category || "item"} available for purchase. ${keywords ? `Details: ${keywords}` : ""}`
    };
  }
};

/**
 * Parse AI response and extract JSON
 */
const parseAIResponse = (text) => {
  // Remove markdown code blocks if present
  let cleanText = text.replace(/```json|```/g, '').trim();

  // Try to extract JSON object
  const jsonMatch = cleanText.match(/\{[\s\S]*\}/);
  if (jsonMatch) {
    cleanText = jsonMatch[0];
  }

  try {
    const parsed = JSON.parse(cleanText);
    return {
      title: parsed.title || "Item For Sale",
      description: parsed.description || cleanText
    };
  } catch (e) {
    // If JSON parsing fails, try to extract title and description manually
    const lines = cleanText.split('\n').filter(line => line.trim());
    const title = lines[0]?.replace(/["']/g, '').substring(0, 60) || "Item For Sale";
    const description = lines.slice(1).join(' ').substring(0, 300) || cleanText.substring(0, 300);

    return { title, description };
  }
};