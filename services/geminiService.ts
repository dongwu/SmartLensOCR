
import { GoogleGenAI, Type } from "@google/genai";
import { BoundingBox, TextRegion } from "../types";

const API_KEY = process.env.API_KEY || "";

export const detectRegions = async (base64Image: string): Promise<TextRegion[]> => {
  const ai = new GoogleGenAI({ apiKey: API_KEY });
  
  const prompt = `Identify all major blocks of text in this image. 
  
  Grouping Rule: Do not separate individual paragraphs if they are clearly one after another. Group adjacent paragraphs into a single logical region. Only create separate regions when there are clear, wide separations (like different columns, vastly different sections, or isolated sidebars).
  
  For each identified region, provide:
  1. A brief descriptive label (e.g., "Main Article Body", "Footer Disclaimer").
  2. Its bounding box coordinates [ymin, xmin, ymax, xmax] in normalized range (0 to 1000). 
  
  Ignore decorative elements without text.`;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: [
        {
          parts: [
            { text: prompt },
            {
              inlineData: {
                mimeType: 'image/png',
                data: base64Image
              }
            }
          ]
        }
      ],
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              description: { type: Type.STRING },
              ymin: { type: Type.NUMBER },
              xmin: { type: Type.NUMBER },
              ymax: { type: Type.NUMBER },
              xmax: { type: Type.NUMBER }
            },
            required: ["description", "ymin", "xmin", "ymax", "xmax"]
          }
        }
      }
    });

    const jsonStr = response.text || "[]";
    const rawRegions = JSON.parse(jsonStr);

    return rawRegions.map((r: any, index: number) => ({
      id: Math.random().toString(36).substr(2, 9),
      description: r.description,
      box: {
        ymin: r.ymin,
        xmin: r.xmin,
        ymax: r.ymax,
        xmax: r.xmax
      },
      order: index + 1,
      isActive: true
    }));
  } catch (error) {
    console.error("Error detecting regions:", error);
    throw error;
  }
};

export const extractTextFromRegions = async (
  base64Image: string, 
  regions: TextRegion[]
): Promise<string> => {
  const ai = new GoogleGenAI({ apiKey: API_KEY });
  
  // We only send the active regions in their specific order
  const activeRegions = [...regions]
    .filter(r => r.isActive)
    .sort((a, b) => a.order - b.order);

  if (activeRegions.length === 0) return "";

  const regionsDescription = activeRegions.map((r, i) => 
    `Region ${r.order} (Description: ${r.description}): coordinates [${r.box.ymin}, ${r.box.xmin}, ${r.box.ymax}, ${r.box.xmax}]`
  ).join('\n');

  const prompt = `Extract the exact text from the provided image for the following numbered regions. 
  Process them in the order specified by their numbers (Region 1 first, then Region 2, etc.).
  Return ONLY the concatenated text from all regions, separated by double newlines between each region's content.
  Do not add any preamble or commentary.

  Regions to extract:
  ${regionsDescription}`;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: [
        {
          parts: [
            { text: prompt },
            {
              inlineData: {
                mimeType: 'image/png',
                data: base64Image
              }
            }
          ]
        }
      ]
    });

    return response.text || "";
  } catch (error) {
    console.error("Error extracting text:", error);
    throw error;
  }
};
