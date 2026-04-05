import { GoogleGenAI } from "@google/genai";

export class GeminiService {
  /**
   * Checks if the API Key is provided in the environment.
   */
  static isConfigured(): boolean {
    return (
      !!import.meta.env.VITE_API_KEY &&
      import.meta.env.VITE_API_KEY !== "undefined" &&
      import.meta.env.VITE_API_KEY !== ""
    );
  }

  private static getAI() {
    if (!this.isConfigured()) {
      console.warn("API Key missing for GeminiService");
      throw new Error("API_KEY_MISSING");
    }
    return new GoogleGenAI({ apiKey: import.meta.env.VITE_API_KEY });
  }

  static async getDesignAdvice(
    prompt: string,
    history: { role: "user" | "model"; parts: { text: string }[] }[],
  ) {
    if (!this.isConfigured()) {
      return "Modo Demostración: Como no se ha detectado una API Key, estoy simulando ser ETNA AI. Te recomendaría nuestra línea Orbital Suspension para espacios centrales o Monolith Floor para iluminación ambiental. Visítanos en nuestro showroom.";
    }
    try {
      const ai = this.getAI();
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: [...history, { role: "user", parts: [{ text: prompt }] }],
        config: {
          systemInstruction: `Eres 'ETNA AI', un consultor de iluminación arquitectónica para ETNA.
        
            IDENTIDAD:
            - Tono: Sofisticado, técnico, artístico, minimalista. Hable de "temperatura de luz", "índice de reproducción cromática (CRI)", "lúmenes" y "atmósfera".
            - Formato: Usa MARKDOWN para estructurar tu respuesta (negritas **texto**, listas bullets, etc).
            - RESTRICCIÓN: NO uses emojis ni iconos visuales en el texto.
            
            INFORMACIÓN DE LA EMPRESA:
            - Concepto: "Arquitectura de la Luz". No vendemos lámparas, creamos atmósferas.
            - Enfoque: Diseño paramétrico, LEDs de alta fidelidad, integración Smart Home (Matter/DALI).
            
            CATÁLOGO PRINCIPAL:
            1. PENDANT (Suspensión): Orbital, Linear. Para comedores, recepciones, doble altura.
            2. FLOOR (Pie): Monolith, Arc. Luz indirecta, esculturas lumínicas.
            3. TABLE (Mesa): Lumina, Task. Para trabajo de precisión o lectura.
            4. TECH (Smart): Paneles modulares, tiras LED inteligentes.
    
            OBJETIVO:
            Asesora al cliente sobre cómo esculpir el espacio con luz. Pregunta por el uso del espacio (trabajo, relax, social) y recomienda temperatura y tipo de luminaria.`,
        },
      });
      return response.text;
    } catch (error: any) {
      if (error.message === "API_KEY_MISSING")
        return "Error: API Key faltante.";
      console.error("Gemini API Error:", error);
      return "Mis sistemas están recalibrando. Por favor intente nuevamente en unos instantes.";
    }
  }

  /**
   * Generates a simulation of the product in the user's room.
   * Uses gemini-3-pro-image-preview for direct contextual image editing/placement.
   */
  static async visualizeLighting(
    roomImageBase64: string,
    productImageBase64: string,
    productName: string,
    userPrompt: string,
  ) {
    if (!this.isConfigured()) {
      console.warn("API Key missing");
      return roomImageBase64;
    }

    try {
      const ai = this.getAI();

      const cleanRoom = roomImageBase64.includes(",")
        ? roomImageBase64.split(",")[1]
        : roomImageBase64;
      const cleanProduct = productImageBase64.includes(",")
        ? productImageBase64.split(",")[1]
        : productImageBase64;

      const response = await ai.models.generateContent({
        model: "gemini-3-pro-image-preview",
        contents: {
          parts: [
            {
              inlineData: {
                data: cleanRoom,
                mimeType: "image/jpeg",
              },
            },
            {
              inlineData: {
                data: cleanProduct,
                mimeType: "image/jpeg",
              },
            },
            {
              text: `Image 1 is a photo of my room. Image 2 is the "${productName}" lighting product. Please realistically place the product from Image 2 into the room shown in Image 1. Maintain perspective, lighting, and shadow consistency. Additional instructions: ${userPrompt}`,
            },
          ],
        },
      });

      for (const part of response.candidates?.[0]?.content?.parts || []) {
        if (part.inlineData) {
          return `data:image/png;base64,${part.inlineData.data}`;
        }
      }

      return roomImageBase64;
    } catch (error) {
      console.error("Gemini Vision Error:", error);
      return roomImageBase64;
    }
  }
}
