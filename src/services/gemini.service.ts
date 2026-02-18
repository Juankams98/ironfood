
import { Injectable } from '@angular/core';
import { GoogleGenAI, Type } from '@google/genai';
import { FoodItem } from '../models/app.models';

// This is a placeholder for the API key.
// In a real app, this should be handled securely.
declare const process: any;

@Injectable({
  providedIn: 'root'
})
export class GeminiService {
  private ai: GoogleGenAI | null = null;
  private readonly model = 'gemini-2.5-flash';

  constructor() {
    try {
      // It's assumed that process.env.API_KEY is available in the execution environment.
      this.ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    } catch (error) {
      console.error('Failed to initialize GoogleGenAI. Is API_KEY set?', error);
    }
  }

  async getMacrosFromImage(base64Image: string): Promise<Omit<FoodItem, 'id'>[]> {
    if (!this.ai) {
      throw new Error('Gemini AI client is not initialized. Please check your API key.');
    }

    const imagePart = {
      inlineData: {
        mimeType: 'image/jpeg',
        data: base64Image,
      },
    };
    
    const textPart = {
      text: `Analyze the food in this image. Provide a JSON array of food items with their estimated nutritional values. Include calories, protein, carbs, fat, saturatedFat, fiber, sugar (all in grams), and sodium (in milligrams). Each value should be a number. If a value isn't applicable or can't be estimated, it can be omitted. If you cannot identify any food, return an empty array. Make your best estimation based on visual cues.`,
    };

    try {
      const response = await this.ai.models.generateContent({
        model: this.model,
        contents: { parts: [imagePart, textPart] },
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                name: { type: Type.STRING, description: 'Name of the food item.' },
                calories: { type: Type.NUMBER, description: 'Estimated total calories.' },
                protein: { type: Type.NUMBER, description: 'Estimated grams of protein.' },
                carbs: { type: Type.NUMBER, description: 'Estimated grams of carbohydrates.' },
                fat: { type: Type.NUMBER, description: 'Estimated grams of fat.' },
                saturatedFat: { type: Type.NUMBER, description: 'Estimated grams of saturated fat.' },
                fiber: { type: Type.NUMBER, description: 'Estimated grams of fiber.' },
                sugar: { type: Type.NUMBER, description: 'Estimated grams of sugar.' },
                sodium: { type: Type.NUMBER, description: 'Estimated milligrams of sodium.' },
              },
              required: ['name', 'calories', 'protein', 'carbs', 'fat'],
            },
          },
        },
      });

      const jsonString = response.text.trim();
      const parsedResult = JSON.parse(jsonString);
      
      // Basic validation
      if (!Array.isArray(parsedResult)) {
        throw new Error('AI response is not a valid array.');
      }

      return parsedResult as Omit<FoodItem, 'id'>[];

    } catch (error) {
      console.error('Error calling Gemini API:', error);
      throw new Error('Failed to analyze food image. Please try again.');
    }
  }
}