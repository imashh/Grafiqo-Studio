import { GoogleGenAI } from "@google/genai";
import { ShootMode, AspectRatio, Tier } from "../types";

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Always use the user-provided API key
const API_KEY = "AIzaSyBBR1ZiBG84FVAtGHIF0nZUaw-O570q1CU";

const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      const base64 = (reader.result as string).split(',')[1];
      resolve(base64);
    };
    reader.onerror = reject;
  });
};

export const generateProductPhotos = async (
  files: File[],
  mode: ShootMode,
  aspectRatio: AspectRatio,
  referenceImage: File | null,
  outputMode: 'IMAGE' | 'PROMPT',
  count: number,
  tier: Tier
) => {
  const ai = new GoogleGenAI({ apiKey: API_KEY });
  const model = "gemini-3.1-flash-image-preview";
  
  const parts: any[] = [];
  
  for (const file of files) {
    const base64 = await fileToBase64(file);
    parts.push({
      inlineData: {
        data: base64,
        mimeType: file.type
      }
    });
  }

  if (referenceImage) {
    const refBase64 = await fileToBase64(referenceImage);
    parts.push({
      inlineData: {
        data: refBase64,
        mimeType: referenceImage.type
      }
    });
    parts.push({ text: `Use the style and composition of the second image to generate professional product photos for the items in the first images. Aspect ratio: ${aspectRatio}.` });
  } else {
    const modePrompts = {
      [ShootMode.ECOMMERCE]: "Generate professional e-commerce product photos with a clean, minimalist studio background. High-end lighting, sharp focus.",
      [ShootMode.CREATIVE]: "Generate creative, artistic product photos with dramatic lighting, interesting textures, and a stylized background.",
      [ShootMode.LIFESTYLE]: "Generate lifestyle product photos showing the item in a natural, real-world setting with appropriate props and atmosphere."
    };
    parts.push({ text: `${modePrompts[mode]} Aspect ratio: ${aspectRatio}.` });
  }

  if (outputMode === 'PROMPT') {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: { parts }
    });
    return [{ url: '', prompt: response.text || '' }];
  }

  const generateSingle = async (attempt = 1): Promise<{url: string, prompt: string}> => {
    try {
      const response = await ai.models.generateContent({
        model,
        contents: { parts },
        config: {
          imageConfig: {
            aspectRatio: aspectRatio as any,
            imageSize: "2K"
          }
        }
      });

      for (const candidate of response.candidates || []) {
        for (const part of candidate.content.parts || []) {
          if (part.inlineData) {
            return {
              url: `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`,
              prompt: ''
            };
          }
        }
      }
      throw new Error("No image generated in the response.");
    } catch (error: any) {
      if (attempt < 3) {
        console.warn(`Generation attempt ${attempt} failed, retrying in 2s...`, error);
        await delay(2000);
        return generateSingle(attempt + 1);
      }
      throw error;
    }
  };

  const results = [];
  // Execute sequentially to avoid rate limits (429 Too Many Requests)
  for (let i = 0; i < count; i++) {
    if (i > 0) await delay(1000); // Add a small delay between requests
    const result = await generateSingle();
    results.push(result);
  }

  return results;
};

export const editProductPhoto = async (imageUrl: string, prompt: string, tier: Tier) => {
  const ai = new GoogleGenAI({ apiKey: API_KEY });
  const model = "gemini-3.1-flash-image-preview";
  const base64 = imageUrl.split(',')[1];
  const mimeType = imageUrl.split(';')[0].split(':')[1];

  const response = await ai.models.generateContent({
    model,
    contents: {
      parts: [
        { inlineData: { data: base64, mimeType } },
        { text: prompt }
      ]
    },
    config: {
      imageConfig: { imageSize: "2K" }
    }
  });

  for (const candidate of response.candidates || []) {
    for (const part of candidate.content.parts || []) {
      if (part.inlineData) {
        return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
      }
    }
  }
  throw new Error("Failed to edit image");
};

export const upscaleImage = async (imageUrl: string, prompt: string, tier: Tier) => {
  const ai = new GoogleGenAI({ apiKey: API_KEY });
  const model = "gemini-3.1-flash-image-preview";
  const base64 = imageUrl.split(',')[1];
  const mimeType = imageUrl.split(';')[0].split(':')[1];

  const response = await ai.models.generateContent({
    model,
    contents: {
      parts: [
        { inlineData: { data: base64, mimeType } },
        { text: `Upscale this image to 4K resolution while maintaining all details. ${prompt}` }
      ]
    },
    config: {
      imageConfig: {
        imageSize: "4K"
      }
    }
  });

  for (const candidate of response.candidates || []) {
    for (const part of candidate.content.parts || []) {
      if (part.inlineData) {
        return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
      }
    }
  }
  throw new Error("Failed to upscale image");
};
