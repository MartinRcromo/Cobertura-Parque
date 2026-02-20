
import React, { useState, useEffect } from 'react';
import { GoogleGenAI } from "@google/genai";

interface ImageGeneratorProps {
  vehicleName: string;
  partName?: string;
}

export const ImageGenerator: React.FC<ImageGeneratorProps> = ({ vehicleName, partName }) => {
  const [frontImage, setFrontImage] = useState<string | null>(null);
  const [detailImage, setDetailImage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [zoomedImage, setZoomedImage] = useState<string | null>(null);

  useEffect(() => {
    if (vehicleName) {
      generateImages();
    }
  }, [vehicleName, partName]);

  const generateSingleImage = async (prompt: string): Promise<string | null> => {
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: {
          parts: [{ text: prompt }],
        },
      });

      if (response.candidates?.[0]?.content?.parts) {
        for (const part of response.candidates[0].content.parts) {
          if (part.inlineData) {
            return `data:image/png;base64,${part.inlineData.data}`;
          }
        }
      }
      return null;
    } catch (e) {
      console.error("AI Image Generation Error:", e);
      return null;
    }
  };

  const generateImages = async () => {
    setLoading(true);
    setError(null);
    setFrontImage(null);
    setDetailImage(null);

    try {
      const frontPrompt = `A high quality, realistic studio photo of the front view of a ${vehicleName} car, white background, professional automotive photography.`;
      
      const promises = [generateSingleImage(frontPrompt)];
      
      if (partName && partName !== 'ALL' && partName !== 'Total') {
         const detailPrompt = `A high quality, realistic close-up photo of the ${partName} of a ${vehicleName} car, zoomed in, white background, detailed automotive photography.`;
         promises.push(generateSingleImage(detailPrompt));
      } else {
         promises.push(Promise.resolve(null));
      }

      const [front, detail] = await Promise.all(promises);
      
      if (front) setFrontImage(front);
      if (detail) setDetailImage(detail);
      
      if (!front && !detail) {
        setError("No se pudieron generar las imágenes.");
      }

    } catch (err: any) {
      console.error("Error generating images:", err);
      setError("Error al conectar con el servicio de IA.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      {loading && (
        <div className="flex flex-col items-center justify-center h-40 bg-slate-100 rounded-lg border border-slate-200">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-600 mb-2"></div>
          <span className="text-xs text-slate-500 animate-pulse">Generando imágenes con IA...</span>
        </div>
      )}

      {error && !loading && (
        <div className="text-center p-4 bg-red-50 rounded-lg border border-red-100">
           <p className="text-red-500 text-xs mb-2">{error}</p>
           <button onClick={generateImages} className="text-xs bg-white border border-red-200 text-red-600 px-3 py-1 rounded hover:bg-red-50">Reintentar</button>
        </div>
      )}

      {!loading && !error && (
        <>
            {/* Front View */}
            <div 
              className="relative group rounded-lg overflow-hidden border border-slate-200 shadow-sm bg-white cursor-zoom-in"
              onClick={() => frontImage && setZoomedImage(frontImage)}
            >
                {frontImage ? (
                    <>
                        <img src={frontImage} alt="Frente" className="w-full h-48 object-cover hover:scale-105 transition-transform duration-500" />
                        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-2 flex justify-between items-end">
                            <span className="text-white text-xs font-semibold">Vista Frontal</span>
                            <span className="text-white/80 text-[10px] bg-black/30 px-1.5 rounded">🔍 Zoom</span>
                        </div>
                    </>
                ) : (
                    <div className="h-48 flex items-center justify-center text-slate-400 text-xs">Imagen frontal no disponible</div>
                )}
            </div>

            {/* Detail View */}
            {partName && partName !== 'ALL' && (
                <div 
                  className="relative group rounded-lg overflow-hidden border border-slate-200 shadow-sm bg-white cursor-zoom-in"
                  onClick={() => detailImage && setZoomedImage(detailImage)}
                >
                    {detailImage ? (
                        <>
                            <img src={detailImage} alt={partName} className="w-full h-48 object-cover hover:scale-105 transition-transform duration-500" />
                            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-2 flex justify-between items-end">
                                <span className="text-white text-xs font-semibold">Detalle: {partName}</span>
                                <span className="text-white/80 text-[10px] bg-black/30 px-1.5 rounded">🔍 Zoom</span>
                            </div>
                        </>
                    ) : (
                        <div className="h-48 flex items-center justify-center text-slate-400 text-xs">Detalle no disponible</div>
                    )}
                </div>
            )}
        </>
      )}
      
      {!loading && !frontImage && !error && (
         <button onClick={generateImages} className="w-full py-2 text-xs text-brand-600 border border-brand-200 rounded hover:bg-brand-50">Generar Imágenes</button>
      )}

      {/* Lightbox / Zoom Modal */}
      {zoomedImage && (
        <div 
          className="fixed inset-0 z-[60] bg-black/90 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200"
          onClick={() => setZoomedImage(null)}
        >
          <button 
            className="absolute top-4 right-4 text-white/70 hover:text-white bg-white/10 hover:bg-white/20 rounded-full p-2"
            onClick={() => setZoomedImage(null)}
          >
            <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
          <img 
            src={zoomedImage} 
            alt="Zoomed" 
            className="max-w-full max-h-full rounded-lg shadow-2xl scale-100 transition-transform"
            onClick={(e) => e.stopPropagation()} 
          />
        </div>
      )}
    </div>
  );
};
