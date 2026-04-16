import { GoogleGenAI, Type } from "@google/genai";

// Initialization with lazy check as per instructions
let genAI: any = null;

export function getGenAI() {
  if (!genAI) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY is not defined. Please set it in the AI Studio Secrets panel.");
    }
    genAI = new GoogleGenAI({ apiKey });
  }
  return genAI;
}

export async function processNoteImage(base64Image: string, mimeType: string) {
  const ai = getGenAI();
  
  const prompt = `Analyze this handwritten or printed note image. 
  1. Extract a short summary of the content (first few lines) to characterize the note.
  2. Detect any explicit page numbers written on the page (e.g., "1", "Page 1", "1/10").
  3. Suggest if the image needs rotation or enhancement.
  
  Return the result in JSON format.`;

  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: [
      {
        parts: [
          {
            inlineData: {
              data: base64Image.split(',')[1] || base64Image,
              mimeType: mimeType
            }
          },
          { text: prompt }
        ]
      }
    ],
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          text: { type: Type.STRING, description: "A summary or snippet of the extracted text." },
          pageNumber: { type: Type.NUMBER, description: "The detected page number, or null if not found.", nullable: true },
          needsEnhancement: { type: Type.BOOLEAN },
          rotationNeeded: { type: Type.NUMBER, description: "Rotation degrees if needed (0, 90, 180, 270)." }
        },
        required: ["text", "pageNumber"]
      }
    }
  });

  try {
    return JSON.parse(response.text);
  } catch (e) {
    console.error("Failed to parse Gemini response", response.text);
    return { text: "Error processing text", pageNumber: null };
  }
}

export async function determineSmartSequence(notes: { id: string, text: string, pageNumber: number | null }[]) {
  const ai = getGenAI();

  const prompt = `Given the following list of note summaries and detected page numbers, determine the most logical sequential order. 
  Notes:
  ${notes.map((n, i) => `ID: ${n.id}, Page: ${n.pageNumber}, Content: ${n.text}`).join('\n')}
  
  Return an array of IDs in the correct order.`;

  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.ARRAY,
        items: { type: Type.STRING }
      }
    }
  });

  try {
    return JSON.parse(response.text) as string[];
  } catch (e) {
    console.error("Failed to parse Gemini sequence response", response.text);
    return notes.map(n => n.id);
  }
}
