
import React, { useState } from 'react';
import { GoogleGenAI } from "@google/genai";

interface VideoGeneratorProps {
  vehicleName: string;
  partName: string;
}

export const VideoGenerator: React.FC<VideoGeneratorProps> = ({ vehicleName, partName }) => {
  const [loading, setLoading] = useState(false);
  const [videoUri, setVideoUri] = useState<string | null>(null);
  const [status, setStatus] = useState<string>('');
  const [progress, setProgress] = useState(0);

  const generateCommercial = async () => {
    setLoading(true);
    setStatus('Inicializando Veo 3...');
    setProgress(5);

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      
      // Prompt optimizado para presentador en español/argentino
      const prompt = `Cinematic professional commercial for Cromosol Argentina. A friendly professional Argentine presenter speaking clearly in Spanish (español) while holding and demonstrating a ${partName} for a ${vehicleName}. The setting is a modern, high-end auto parts showroom. The presenter is charismatic and professional. High-end cinematography, soft studio lighting, 4k, photorealistic, premium automotive marketing style.`;

      let operation = await ai.models.generateVideos({
        model: 'veo-3.1-fast-generate-preview',
        prompt: prompt,
        config: {
          numberOfVideos: 1,
          resolution: '720p',
          aspectRatio: '16:9'
        }
      });

      setStatus('Generando comercial en español...');
      
      let attempts = 0;
      while (!operation.done && attempts < 60) {
        attempts++;
        setProgress(Math.min(10 + (attempts * 2), 90));
        await new Promise(resolve => setTimeout(resolve, 2000));
        operation = await ai.operations.getVideosOperation({ operation: operation });
      }

      if (operation.done && operation.response?.generatedVideos?.[0]?.video?.uri) {
        const baseUri = operation.response.generatedVideos[0].video.uri;
        setVideoUri(`${baseUri}&key=${process.env.API_KEY}`);
        setProgress(100);
      } else {
        setStatus('Error: No se pudo generar el video.');
      }

    } catch (error: any) {
      console.error("Video Gen Error:", error);
      setStatus(`Error: ${error.message || 'Falló la generación'}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mt-6 border-t border-slate-200 pt-6">
      <h4 className="font-bold text-slate-700 mb-3 flex items-center gap-2">
        <span className="text-xl">🎬</span> Comercial TV (Veo 3 AI)
      </h4>

      {!videoUri && !loading && (
        <div className="bg-slate-100 rounded-xl p-6 text-center border border-slate-200">
          <p className="text-sm text-slate-600 mb-4">
            Genera un comercial único donde un presentador ofrece el <strong>{partName}</strong> para el <strong>{vehicleName}</strong> en español.
          </p>
          <button
            onClick={generateCommercial}
            className="bg-gradient-to-r from-brand-600 to-blue-700 hover:from-brand-700 hover:to-blue-800 text-white px-6 py-3 rounded-full font-bold shadow-md transition-all hover:scale-105 flex items-center justify-center gap-2 mx-auto"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            Generar Comercial (Español)
          </button>
        </div>
      )}

      {loading && (
        <div className="bg-slate-50 rounded-xl p-6 text-center border border-slate-200">
          <div className="flex flex-col items-center">
            <div className="w-16 h-16 relative mb-4">
                <div className="absolute inset-0 border-4 border-slate-200 rounded-full"></div>
                <div className="absolute inset-0 border-4 border-brand-600 rounded-full border-t-transparent animate-spin"></div>
            </div>
            <h5 className="font-bold text-slate-700 mb-1">{status}</h5>
            <div className="w-full bg-slate-200 rounded-full h-2 mt-3 max-w-xs mx-auto">
              <div className="bg-brand-600 h-2 rounded-full transition-all duration-500" style={{ width: `${progress}%` }}></div>
            </div>
            <p className="text-xs text-slate-400 mt-2">La IA de Google Veo está renderizando el comercial...</p>
          </div>
        </div>
      )}

      {videoUri && (
        <div className="rounded-xl overflow-hidden shadow-lg border border-slate-200 bg-black">
          <video 
            src={videoUri} 
            controls 
            autoPlay 
            className="w-full aspect-video"
          />
          <div className="bg-white p-3 flex justify-between items-center">
            <span className="text-xs font-semibold text-brand-700 uppercase tracking-wider">Publicidad Cromosol AI</span>
            <button 
                onClick={() => setVideoUri(null)} 
                className="text-xs text-slate-500 hover:text-red-500 underline"
            >
                Cerrar Video
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
