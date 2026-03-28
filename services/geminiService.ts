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

// Compress image to ensure it fits within Firestore's 1MB limit
const compressImage = (base64Str: string, mimeType: string): Promise<string> => {
  return new Promise((resolve) => {
    const img = new Image();
    img.src = `data:${mimeType};base64,${base64Str}`;
    img.onload = () => {
      const canvas = document.createElement('canvas');
      let width = img.width;
      let height = img.height;
      
      // Max dimensions to keep size under ~800KB
      const MAX_WIDTH = 1024;
      const MAX_HEIGHT = 1024;
      
      if (width > height) {
        if (width > MAX_WIDTH) {
          height *= MAX_WIDTH / width;
          width = MAX_WIDTH;
        }
      } else {
        if (height > MAX_HEIGHT) {
          width *= MAX_HEIGHT / height;
          height = MAX_HEIGHT;
        }
      }
      
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      ctx?.drawImage(img, 0, 0, width, height);
      
      // Compress to JPEG with 0.8 quality
      const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.8);
      resolve(compressedDataUrl);
    };
    img.onerror = () => resolve(`data:${mimeType};base64,${base64Str}`); // Fallback
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
  
  const baseParts: any[] = [];
  
  for (const file of files) {
    const base64 = await fileToBase64(file);
    baseParts.push({
      inlineData: {
        data: base64,
        mimeType: file.type
      }
    });
  }

  if (referenceImage) {
    const refBase64 = await fileToBase64(referenceImage);
    baseParts.push({
      inlineData: {
        data: refBase64,
        mimeType: referenceImage.type
      }
    });
  }

  // Define angles for variation
  const angles = [
    "front-facing, eye-level angle",
    "dynamic low-angle shot",
    "top-down flat lay perspective",
    "close-up macro detail shot, slightly angled"
  ];

  // Define a consistent model description for lifestyle mode
  const consistentModel = "a stylish 25-year-old model with striking features, wearing neutral, elegant clothing";

  const generateSingle = async (index: number, attempt = 1): Promise<{url: string, prompt: string}> => {
    try {
      const parts = [...baseParts];
      const currentAngle = angles[index % angles.length];
      
      let promptText = "";
      if (referenceImage) {
        promptText = `Use the style, lighting, and composition of the second image to generate a highly aesthetic, professional product photo for the items in the first images. Angle: ${currentAngle}. Ensure the aspect ratio is exactly ${aspectRatio}.`;
      } else {
        const modePrompts = {
          [ShootMode.ECOMMERCE]: `Generate a highly aesthetic, premium e-commerce product photo. Clean, minimalist studio background with soft, diffused high-end lighting. Sharp focus, commercial quality. Angle: ${currentAngle}.`,
          [ShootMode.CREATIVE]: `Generate a breathtaking, creative, and artistic product photo. Use dramatic, cinematic lighting, interesting textures, and a highly stylized, visually striking background. Angle: ${currentAngle}.`,
          [ShootMode.LIFESTYLE]: `Generate an authentic, high-end lifestyle product photo showing the item in a natural, beautifully styled real-world setting with appropriate aesthetic props. Feature ${consistentModel} interacting naturally with the product. Angle: ${currentAngle}.`
        };
        promptText = `${modePrompts[mode]} Ensure the aspect ratio is exactly ${aspectRatio}.`;
      }
      
      parts.push({ text: promptText });

      if (outputMode === 'PROMPT') {
        const response = await ai.models.generateContent({
          model: "gemini-3-flash-preview",
          contents: { parts }
        });
        return { url: '', prompt: response.text || '' };
      }

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
            // Compress the image before returning to ensure it fits in Firestore
            const compressedUrl = await compressImage(part.inlineData.data, part.inlineData.mimeType);
            return {
              url: compressedUrl,
              prompt: promptText
            };
          }
        }
      }
      throw new Error("No image generated in the response.");
    } catch (error: any) {
      if (attempt < 3) {
        console.warn(`Generation attempt ${attempt} failed, retrying in 2s...`, error);
        await delay(2000);
        return generateSingle(index, attempt + 1);
      }
      throw error;
    }
  };

  const results = [];
  // Execute sequentially to avoid rate limits
  for (let i = 0; i < count; i++) {
    if (i > 0) await delay(1000);
    const result = await generateSingle(i);
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

  try {
    const response = await ai.models.generateContent({
      model,
      contents: {
        parts: [
          { inlineData: { data: base64, mimeType } },
          { text: `Recreate this exact image in pristine 4K resolution. Maintain all original details, lighting, and composition perfectly. Original prompt: ${prompt}` }
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
    throw new Error("No image generated in the response.");
  } catch (error) {
    console.error("Upscale error:", error);
    
    // Fallback: Client-side 2x upscale using Canvas if API fails
    return new Promise((resolve) => {
      const img = new Image();
      img.src = imageUrl;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.width * 2;
        canvas.height = img.height * 2;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = 'high';
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          resolve(canvas.toDataURL('image/png', 1.0));
        } else {
          resolve(imageUrl);
        }
      };
      img.onerror = () => resolve(imageUrl);
    });
  }
};
