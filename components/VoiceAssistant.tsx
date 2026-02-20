
import React, { useState, useRef, useEffect } from 'react';
import { GoogleGenAI, LiveServerMessage, Modality } from "@google/genai";

export const VoiceAssistant: React.FC = () => {
  const [isActive, setIsActive] = useState(false);
  const [status, setStatus] = useState<'idle' | 'connecting' | 'listening' | 'speaking'>('idle');
  const [error, setError] = useState<string | null>(null);
  
  const inputAudioContextRef = useRef<AudioContext | null>(null);
  const outputAudioContextRef = useRef<AudioContext | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const sessionRef = useRef<any>(null);
  
  const nextStartTimeRef = useRef<number>(0);
  const audioSourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());

  const decodeAudioData = async (
    base64String: string,
    ctx: AudioContext
  ): Promise<AudioBuffer> => {
    const binaryString = atob(base64String);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
        bytes[i] = binaryString.charCodeAt(i);
    }
    
    const int16Data = new Int16Array(bytes.buffer);
    const float32Data = new Float32Array(int16Data.length);
    for(let i=0; i<int16Data.length; i++) {
        float32Data[i] = int16Data[i] / 32768.0;
    }

    const buffer = ctx.createBuffer(1, float32Data.length, 24000);
    buffer.copyToChannel(float32Data, 0);
    return buffer;
  };

  const float32ToBase64PCM = (float32Array: Float32Array) => {
    const int16Array = new Int16Array(float32Array.length);
    for (let i = 0; i < float32Array.length; i++) {
      let s = Math.max(-1, Math.min(1, float32Array[i]));
      int16Array[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
    }
    const bytes = new Uint8Array(int16Array.buffer);
    let binary = '';
    const len = bytes.byteLength;
    for (let i = 0; i < len; i++) {
        binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  };

  const startSession = async () => {
    setError(null);
    setStatus('connecting');
    
    try {
      const InputContextClass = (window.AudioContext || (window as any).webkitAudioContext);
      inputAudioContextRef.current = new InputContextClass({ sampleRate: 16000 });
      outputAudioContextRef.current = new InputContextClass({ sampleRate: 24000 });
      nextStartTimeRef.current = outputAudioContextRef.current.currentTime;

      streamRef.current = await navigator.mediaDevices.getUserMedia({ audio: true });

      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      
      const sessionPromise = ai.live.connect({
        model: 'gemini-2.5-flash-native-audio-preview-09-2025',
        config: {
            responseModalities: [Modality.AUDIO],
            // Instrucción en español para el contexto de la empresa
            systemInstruction: "Eres un asistente experto de la empresa Cromosol en Argentina. Tu objetivo es ayudar a los analistas a entender la cobertura del parque automotor. Responde siempre en español rioplatense (de Argentina), de manera profesional, cordial y eficiente. Puedes analizar tendencias de stock, faltantes y sugerir acciones comerciales basándote en los datos de la tabla.",
            speechConfig: {
                voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Zephyr' } }
            }
        },
        callbacks: {
            onopen: () => {
                setStatus('listening');
                setIsActive(true);
                
                if (!inputAudioContextRef.current || !streamRef.current) return;
                
                sourceRef.current = inputAudioContextRef.current.createMediaStreamSource(streamRef.current);
                processorRef.current = inputAudioContextRef.current.createScriptProcessor(4096, 1, 1);
                
                processorRef.current.onaudioprocess = (e) => {
                    const inputData = e.inputBuffer.getChannelData(0);
                    const base64PCM = float32ToBase64PCM(inputData);
                    
                    sessionPromise.then(session => {
                        session.sendRealtimeInput({
                            media: {
                                mimeType: 'audio/pcm;rate=16000',
                                data: base64PCM
                            }
                        });
                    });
                };

                sourceRef.current.connect(processorRef.current);
                processorRef.current.connect(inputAudioContextRef.current.destination);
            },
            onmessage: async (msg: LiveServerMessage) => {
                if (msg.serverContent?.modelTurn?.parts?.[0]?.inlineData) {
                    setStatus('speaking');
                    const base64Audio = msg.serverContent.modelTurn.parts[0].inlineData.data;
                    
                    if (outputAudioContextRef.current) {
                        const audioBuffer = await decodeAudioData(base64Audio, outputAudioContextRef.current);
                        const source = outputAudioContextRef.current.createBufferSource();
                        source.buffer = audioBuffer;
                        source.connect(outputAudioContextRef.current.destination);
                        
                        const currentTime = outputAudioContextRef.current.currentTime;
                        const startTime = Math.max(currentTime, nextStartTimeRef.current);
                        
                        source.start(startTime);
                        nextStartTimeRef.current = startTime + audioBuffer.duration;
                        
                        audioSourcesRef.current.add(source);
                        source.onended = () => {
                            audioSourcesRef.current.delete(source);
                            if (audioSourcesRef.current.size === 0) {
                                setStatus('listening');
                            }
                        };
                    }
                }
                
                if (msg.serverContent?.interrupted) {
                    audioSourcesRef.current.forEach(s => s.stop());
                    audioSourcesRef.current.clear();
                    if (outputAudioContextRef.current) {
                        nextStartTimeRef.current = outputAudioContextRef.current.currentTime;
                    }
                    setStatus('listening');
                }
            },
            onclose: () => {
                stopSession();
            },
            onerror: (e) => {
                console.error("Live API Error", e);
                setError("Error de conexión");
                stopSession();
            }
        }
      });
      
      sessionRef.current = sessionPromise;

    } catch (err: any) {
        console.error(err);
        setError("No se pudo iniciar la sesión de voz");
        stopSession();
    }
  };

  const stopSession = () => {
    setIsActive(false);
    setStatus('idle');
    inputAudioContextRef.current?.close();
    outputAudioContextRef.current?.close();
    streamRef.current?.getTracks().forEach(t => t.stop());
    sourceRef.current?.disconnect();
    processorRef.current?.disconnect();
    sessionRef.current = null; 
  };

  return (
    <div className="fixed bottom-6 right-6 z-50">
      {error && (
        <div className="absolute bottom-16 right-0 bg-red-100 text-red-800 px-3 py-1 rounded text-xs whitespace-nowrap mb-2 shadow-md">
            {error}
        </div>
      )}
      
      <button
        onClick={isActive ? stopSession : startSession}
        className={`flex items-center gap-2 px-4 py-3 rounded-full shadow-lg font-bold transition-all transform hover:scale-105 ${
            isActive 
            ? 'bg-red-500 hover:bg-red-600 text-white animate-pulse' 
            : 'bg-brand-600 hover:bg-brand-700 text-white'
        }`}
      >
        {status === 'connecting' ? (
             <svg className="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
        ) : isActive ? (
            <>
                <div className="flex gap-1 h-3 items-end">
                    <div className="w-1 bg-white animate-[bounce_1s_infinite] h-2"></div>
                    <div className="w-1 bg-white animate-[bounce_1s_infinite_0.2s] h-3"></div>
                    <div className="w-1 bg-white animate-[bounce_1s_infinite_0.4s] h-1"></div>
                </div>
                <span>{status === 'speaking' ? 'Hablando...' : 'Escuchando...'}</span>
            </>
        ) : (
            <>
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" /></svg>
                <span>Asistente Cromosol</span>
            </>
        )}
      </button>
    </div>
  );
};
