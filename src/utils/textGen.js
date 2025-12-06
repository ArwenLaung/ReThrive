import { GoogleGenerativeAI } from "@google/generative-ai";

const API_KEY = import.meta.env.VITE_GEMINI_API_KEY;

export const generateDescription = async (keywords, category) => {
  if (!API_KEY) {
    console.error("Error: VITE_GEMINI_API_KEY is missing from .env file");
    return { title: "Config Error", description: "API Key is missing. Please check your .env file and restart the server." };
  }

  try {
    const genAI = new GoogleGenerativeAI(API_KEY);
    
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

    const prompt = `You are a copywriter for an university student secondhand marketplace.
    Category: ${category}
    Item keywords: ${keywords}
    
    Return a JSON object with this exact format:
    {
      "title": "Catchy Title (max 60 chars)",
      "description": "Persuasive description (2 sentences)"
    }`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    const cleanText = text.replace(/```json|```/g, '').trim();
    
    try {
      const parsed = JSON.parse(cleanText);
      return { title: parsed.title, description: parsed.description };
    } catch (e) {
      return { title: "Item For Sale", description: cleanText };
    }

  } catch (error) {
    console.error("Gemini Error:", error);
    return { 
      title: "AI Error", 
      description: `Error: ${error.message}.` 
    };
  }
};