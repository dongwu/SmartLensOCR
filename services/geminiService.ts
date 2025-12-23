
import { GoogleGenAI, Type } from "@google/genai";
import { BoundingBox, TextRegion } from "../types";

/**
 * SERVICE LAYER
 * Python Analogy: This is equivalent to a Python module using 'google-generativeai'.
 * 
 * We initialize the client inside the functions to ensure we always use
 * the most recent API key selected by the user in the AI Studio environment.
 */
const getClient = () => new GoogleGenAI({ apiKey: process.env.API_KEY });

/**
 * Phase 1: Layout Analysis
 * Uses 'gemini-3-flash-preview' for speed and cost-efficiency.
 * It's perfect for "Basic Text Tasks" like finding boxes.
 */
export const detectRegions = async (base64Image: string): Promise<TextRegion[]> => {
  const ai = getClient();
  
  const prompt = `Identify all major blocks of text in this image. 
  
  Grouping Rule: Do not separate individual paragraphs if they are clearly one after another. 
  Group adjacent paragraphs into a single logical region. Only create separate regions when 
  there are clear, wide separations.
  
  Coordinates must be in normalized range (0 to 1000).`;

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
        // 'responseSchema' is like a Pydantic model for the AI's output.
        // It guarantees the AI returns valid JSON matching this structure.
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

    // Map raw AI output to our internal TextRegion model
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
  } catch (error: any) {
    console.error("Error detecting regions:", error);
    throw error;
  }
};

/**
 * Phase 2: High-Precision OCR
 * Uses 'gemini-3-pro-preview' for "Complex Text Tasks".
 * It handles the actual text extraction with better reasoning for reordering.
 */
export const extractTextFromRegions = async (
  base64Image: string, 
  regions: TextRegion[]
): Promise<string> => {
  const ai = getClient();
  
  // Python: [r for r in regions if r.isActive].sort(key=lambda x: x.order)
  const activeRegions = [...regions]
    .filter(r => r.isActive)
    .sort((a, b) => a.order - b.order);

  if (activeRegions.length === 0) return "";

  const regionsDescription = activeRegions.map((r) => 
    `Region ${r.order}: coordinates [${r.box.ymin}, ${r.box.xmin}, ${r.box.ymax}, ${r.box.xmax}]`
  ).join('\n');

  const prompt = `Perform OCR on the provided image following the sequence of regions below.
  Return only the extracted text, separated by double newlines.
  
  Regions to process:
  ${regionsDescription}`;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: [
        {
          parts: [
            { text: prompt },
            {
              inlineData: { mimeType: 'image/png', data: base64Image }
            }
          ]
        }
      ],
      config: {
        // 'thinkingBudget' allows the model more reasoning time for complex OCR tasks.
        thinkingConfig: { thinkingBudget: 4000 } 
      }
    });

    return response.text || "";
  } catch (error: any) {
    console.error("Error extracting text:", error);
    throw error;
  }
};
