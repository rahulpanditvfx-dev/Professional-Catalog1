import React, { useState, useRef, useEffect } from 'react';
import { Camera, Upload, RefreshCw, Download, Layers, Shirt, User, Image as ImageIcon, Sparkles, AlertCircle, FileText, Palette, Copy, Check } from 'lucide-react';

// NOTE: In a production environment, never expose API keys on the client side.
// This is a demo using the execution environment's provided key.
// Apni khud ki website ke liye, is variable mein apni Google Gemini API Key daalein.
const apiKey = ""; 

const FashionGenApp = ({ className = "" }) => {
  const [selectedImage, setSelectedImage] = useState(null);
  const [generatedImage, setGeneratedImage] = useState(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState('');
  const [dragActive, setDragActive] = useState(false);
  const [loadingStep, setLoadingStep] = useState(0);

  // New State for LLM Features
  const [productDetails, setProductDetails] = useState(null);
  const [styleAdvice, setStyleAdvice] = useState(null);
  const [loadingText, setLoadingText] = useState({ details: false, styling: false });

  const steps = [
    "Analysing garment structure...",
    "Detecting fabric texture & patterns...",
    "Generating flat-lay front view...",
    "Synthesizing back view...",
    "Rendering model composite...",
    "Finalizing lighting & background..."
  ];

  // Animation loop for loading text
  useEffect(() => {
    let interval;
    if (isGenerating) {
      interval = setInterval(() => {
        setLoadingStep((prev) => (prev + 1) % steps.length);
      }, 2500);
    }
    return () => clearInterval(interval);
  }, [isGenerating]);

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  const handleChange = (e) => {
    e.preventDefault();
    if (e.target.files && e.target.files[0]) {
      handleFile(e.target.files[0]);
    }
  };

  const handleFile = (file) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onloadend = () => {
      setSelectedImage(reader.result);
      setGeneratedImage(null);
      setProductDetails(null); // Reset LLM data
      setStyleAdvice(null);    // Reset LLM data
      setError('');
    };
  };

  // --- Image Generation Logic (Existing) ---
  const generateComposite = async () => {
    if (!selectedImage) return;

    setIsGenerating(true);
    setError('');
    setLoadingStep(0);

    try {
      const base64Data = selectedImage.split(',')[1];
      const mimeType = selectedImage.split(';')[0].split(':')[1];

      const promptText = `
        Act as an expert fashion-product image generator.
        Analyze the uploaded garment photo.
        Generate a single high-resolution 3-panel composite image on a pure white background.
        
        Strict Layout:
        [Left: Flat-lay FRONT view] | [Middle: Flat-lay BACK view] | [Right: Model wearing it]

        Rules:
        1. Detect garment type, sleeves, neck, pattern, and color from the input.
        2. Create a realistic Back View matching the front style.
        3. Create a generic AI model (natural proportions, smiling) wearing the exact garment.
        4. Style: Pure white background, soft lighting, no shadows, no props.
        5. Ensure the garment is perfectly aligned and wrinkle-free in flat lays.
        6. High photorealism.
      `;

      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-image-preview:generateContent?key=${apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: promptText }, { inlineData: { mimeType, data: base64Data } }] }],
            generationConfig: { responseModalities: ["IMAGE"], temperature: 0.4 }
          }),
        }
      );

      if (!response.ok) throw new Error(`API Error: ${response.statusText}`);

      const data = await response.json();
      const imagePart = data.candidates?.[0]?.content?.parts?.find(p => p.inlineData?.mimeType?.startsWith('image/'));

      if (imagePart) {
        setGeneratedImage(`data:${imagePart.inlineData.mimeType};base64,${imagePart.inlineData.data}`);
      } else {
        throw new Error("Model generated text instead of an image. Please try again.");
      }
    } catch (err) {
      console.error(err);
      setError('Generation failed. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  // --- New LLM Feature 1: Product Description ---
  const generateProductDetails = async () => {
    if (!selectedImage) return;
    setLoadingText(prev => ({ ...prev, details: true }));

    try {
      const base64Data = selectedImage.split(',')[1];
      const mimeType = selectedImage.split(';')[0].split(':')[1];

      const prompt = `
        Analyze this fashion item image.
        Generate a JSON object with the following fields:
        1. "title": A catchy, SEO-friendly product title.
        2. "description": A 2-sentence engaging marketing description.
        3. "hashtags": A string of 5 relevant hashtags.
        Respond ONLY with the JSON.
      `;

      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }, { inlineData: { mimeType, data: base64Data } }] }],
            generationConfig: { responseMimeType: "application/json" }
          }),
        }
      );

      const data = await response.json();
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
      if (text) setProductDetails(JSON.parse(text));

    } catch (e) {
      console.error(e);
      alert("Failed to generate details.");
    } finally {
      setLoadingText(prev => ({ ...prev, details: false }));
    }
  };

  // --- New LLM Feature 2: Style Advice ---
  const generateStyling = async () => {
    if (!selectedImage) return;
    setLoadingText(prev => ({ ...prev, styling: true }));

    try {
      const base64Data = selectedImage.split(',')[1];
      const mimeType = selectedImage.split(';')[0].split(':')[1];

      const prompt = `
        Act as a professional fashion stylist.
        Based on the image of this garment, suggest 3 distinct outfit combinations (e.g., Casual, Chic, Office).
        Format the output as a bulleted list using markdown. Keep it concise.
      `;

      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }, { inlineData: { mimeType, data: base64Data } }] }]
          }),
        }
      );

      const data = await response.json();
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
      if (text) setStyleAdvice(text);

    } catch (e) {
      console.error(e);
      alert("Failed to generate styling advice.");
    } finally {
      setLoadingText(prev => ({ ...prev, styling: false }));
    }
  };

  const downloadImage = () => {
    if (generatedImage) {
      const link = document.createElement('a');
      link.href = generatedImage;
      link.download = 'fashion-composite-output.png';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  // 'className' prop allows integration into custom containers
  return (
    <div className={`min-h-screen bg-slate-50 font-sans text-slate-800 ${className}`}>
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="bg-indigo-600 p-2 rounded-lg">
              <Layers className="h-6 w-6 text-white" />
            </div>
            <span className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 to-violet-600">
              FashionGen AI
            </span>
          </div>
          <div className="flex items-center space-x-4 text-sm font-medium text-slate-500">
            <span className="hidden sm:inline-block">Auto-Composite Generator</span>
            <div className="h-4 w-px bg-slate-300"></div>
            <span className="text-indigo-600">v2.5 Flash</span>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        {/* Intro Section */}
        <div className="text-center mb-10">
          <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 mb-4">
            Transform Garment Photos into <br/>
            <span className="text-indigo-600">Professional Catalog Assets</span>
          </h1>
          <p className="max-w-2xl mx-auto text-lg text-slate-600">
            Upload a raw photo of a cloth. Our AI will automatically generate a clean 3-panel composite: 
            Front Flat-lay, Back Flat-lay, and On-Model view.
          </p>
        </div>

        {/* Main Workspace */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
          
          {/* Input Column */}
          <div className="space-y-6">
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
              <div className="p-4 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
                <h3 className="font-semibold text-slate-700 flex items-center gap-2">
                  <Camera className="w-4 h-4" /> Input Image
                </h3>
                {selectedImage && (
                  <button 
                    onClick={() => {
                      setSelectedImage(null); 
                      setGeneratedImage(null);
                      setProductDetails(null);
                      setStyleAdvice(null);
                    }}
                    className="text-xs text-red-500 hover:text-red-600 font-medium"
                  >
                    Remove
                  </button>
                )}
              </div>
              
              <div className="p-6">
                {!selectedImage ? (
                  <div 
                    className={`border-2 border-dashed rounded-xl h-80 flex flex-col items-center justify-center transition-colors duration-200 ease-in-out cursor-pointer
                      ${dragActive ? 'border-indigo-500 bg-indigo-50' : 'border-slate-300 hover:border-indigo-400 hover:bg-slate-50'}`}
                    onDragEnter={handleDrag}
                    onDragLeave={handleDrag}
                    onDragOver={handleDrag}
                    onDrop={handleDrop}
                    onClick={() => document.getElementById('image-upload').click()}
                  >
                    <input 
                      id="image-upload" 
                      type="file" 
                      className="hidden" 
                      accept="image/*" 
                      onChange={handleChange} 
                    />
                    <div className="bg-indigo-100 p-4 rounded-full mb-4">
                      <Upload className="w-8 h-8 text-indigo-600" />
                    </div>
                    <p className="text-lg font-medium text-slate-700 mb-1">Click to upload or drag & drop</p>
                    <p className="text-sm text-slate-500">Supports JPG, PNG (Max 5MB)</p>
                  </div>
                ) : (
                  <div className="relative h-80 w-full bg-slate-100 rounded-xl overflow-hidden flex items-center justify-center">
                    <img 
                      src={selectedImage} 
                      alt="Input" 
                      className="max-h-full max-w-full object-contain" 
                    />
                  </div>
                )}
              </div>

              {selectedImage && !generatedImage && !isGenerating && (
                <div className="p-6 pt-0">
                  <button
                    onClick={generateComposite}
                    className="w-full py-3 px-4 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl shadow-md transition-all transform hover:scale-[1.02] flex items-center justify-center gap-2"
                  >
                    <Sparkles className="w-5 h-5" />
                    Generate 3-Panel Composite
                  </button>
                </div>
              )}
            </div>

            {/* Steps Info / LLM Features */}
            {!selectedImage ? (
              <div className="bg-blue-50 border border-blue-100 rounded-xl p-4">
                <h4 className="font-semibold text-blue-900 mb-2 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4" /> How it works
                </h4>
                <ul className="text-sm text-blue-800 space-y-1 ml-5 list-disc">
                  <li>AI detects the garment type, color, and texture.</li>
                  <li>It reconstructs a <strong>Back View</strong> based on the front design.</li>
                  <li>It generates a <strong>Virtual Model</strong> wearing your item.</li>
                  <li>All merged into one seamless white-background image.</li>
                </ul>
              </div>
            ) : (
              // LLM Feature Buttons (Visible after upload)
              <div className="grid grid-cols-2 gap-4">
                <button
                  onClick={generateProductDetails}
                  disabled={loadingText.details || loadingText.styling}
                  className="p-4 bg-white border border-slate-200 rounded-xl shadow-sm hover:border-indigo-300 hover:shadow-md transition-all text-left group"
                >
                  <div className="flex items-center gap-2 mb-2 text-indigo-600 font-semibold">
                    <FileText className="w-5 h-5 group-hover:scale-110 transition-transform" />
                    <span>Copywriter ✨</span>
                  </div>
                  <p className="text-xs text-slate-500">Generate title, description & hashtags.</p>
                  {loadingText.details && <div className="mt-2 h-1 w-full bg-indigo-100 overflow-hidden rounded"><div className="h-full bg-indigo-500 animate-progress"></div></div>}
                </button>

                <button
                  onClick={generateStyling}
                  disabled={loadingText.details || loadingText.styling}
                  className="p-4 bg-white border border-slate-200 rounded-xl shadow-sm hover:border-violet-300 hover:shadow-md transition-all text-left group"
                >
                   <div className="flex items-center gap-2 mb-2 text-violet-600 font-semibold">
                    <Palette className="w-5 h-5 group-hover:scale-110 transition-transform" />
                    <span>Style Advisor ✨</span>
                  </div>
                  <p className="text-xs text-slate-500">Get outfit ideas & matching tips.</p>
                  {loadingText.styling && <div className="mt-2 h-1 w-full bg-violet-100 overflow-hidden rounded"><div className="h-full bg-violet-500 animate-progress"></div></div>}
                </button>
              </div>
            )}
          </div>

          {/* Output Column */}
          <div className="space-y-6">
             <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden min-h-[500px] flex flex-col">
              <div className="p-4 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
                <h3 className="font-semibold text-slate-700 flex items-center gap-2">
                  <ImageIcon className="w-4 h-4" /> Generated Result
                </h3>
                {generatedImage && (
                  <span className="bg-green-100 text-green-700 text-xs px-2 py-1 rounded-full font-medium">
                    Complete
                  </span>
                )}
              </div>

              <div className="flex-1 p-6 flex items-center justify-center bg-slate-50 relative">
                {isGenerating ? (
                  <div className="text-center">
                    <div className="relative w-24 h-24 mx-auto mb-6">
                       <div className="absolute inset-0 border-4 border-indigo-100 rounded-full"></div>
                       <div className="absolute inset-0 border-4 border-indigo-600 rounded-full border-t-transparent animate-spin"></div>
                       <Sparkles className="absolute inset-0 m-auto text-indigo-600 w-8 h-8 animate-pulse" />
                    </div>
                    <h3 className="text-xl font-bold text-slate-800 mb-2">Processing Image</h3>
                    <p className="text-indigo-600 font-medium animate-pulse">
                      {steps[loadingStep]}
                    </p>
                  </div>
                ) : error ? (
                  <div className="text-center max-w-xs">
                    <div className="bg-red-100 p-4 rounded-full inline-block mb-4">
                      <AlertCircle className="w-8 h-8 text-red-600" />
                    </div>
                    <p className="text-slate-800 font-medium mb-2">Something went wrong</p>
                    <p className="text-slate-500 text-sm">{error}</p>
                    <button 
                      onClick={generateComposite}
                      className="mt-4 text-indigo-600 hover:text-indigo-800 font-medium text-sm flex items-center justify-center gap-1 mx-auto"
                    >
                      <RefreshCw className="w-3 h-3" /> Try Again
                    </button>
                  </div>
                ) : generatedImage ? (
                  <div className="w-full h-full flex flex-col">
                    <div className="relative group flex-1 bg-white shadow-sm border border-slate-200 rounded-lg overflow-hidden">
                      <img 
                        src={generatedImage} 
                        alt="Generated Composite" 
                        className="w-full h-full object-contain"
                      />
                    </div>
                    <div className="grid grid-cols-3 gap-2 mt-4 text-center text-xs font-semibold text-slate-500 uppercase tracking-wider">
                      <div className="flex items-center justify-center gap-1"><Shirt className="w-3 h-3"/> Front View</div>
                      <div className="flex items-center justify-center gap-1"><Shirt className="w-3 h-3 transform scale-x-[-1]"/> Back View</div>
                      <div className="flex items-center justify-center gap-1"><User className="w-3 h-3"/> Model View</div>
                    </div>
                  </div>
                ) : (
                  <div className="text-center text-slate-400">
                    <div className="bg-slate-100 p-4 rounded-full inline-block mb-4">
                      <Layers className="w-12 h-12 text-slate-300" />
                    </div>
                    <p>Generated image will appear here</p>
                  </div>
                )}
              </div>

              {generatedImage && (
                <div className="p-6 border-t border-slate-100 bg-white">
                  <button 
                    onClick={downloadImage}
                    className="w-full py-3 px-4 bg-slate-900 hover:bg-slate-800 text-white font-semibold rounded-xl shadow-lg transition-all flex items-center justify-center gap-2"
                  >
                    <Download className="w-5 h-5" />
                    Download High-Res
                  </button>
                </div>
              )}
            </div>

            {/* Display AI Text Results */}
            {(productDetails || styleAdvice) && (
              <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
                {productDetails && (
                  <div className="bg-white rounded-xl shadow-sm border border-indigo-100 p-5">
                    <h4 className="font-bold text-slate-800 flex items-center gap-2 mb-3">
                      <FileText className="w-4 h-4 text-indigo-600" />
                      Generated Details
                    </h4>
                    <div className="space-y-3">
                      <div>
                        <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Title</span>
                        <p className="font-medium text-slate-900">{productDetails.title}</p>
                      </div>
                      <div>
                        <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Description</span>
                        <p className="text-sm text-slate-600 leading-relaxed">{productDetails.description}</p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                         {productDetails.hashtags.split(' ').map((tag, i) => (
                           <span key={i} className="text-xs bg-indigo-50 text-indigo-600 px-2 py-1 rounded-md font-medium">
                             {tag}
                           </span>
                         ))}
                      </div>
                    </div>
                  </div>
                )}

                {styleAdvice && (
                  <div className="bg-white rounded-xl shadow-sm border border-violet-100 p-5">
                     <h4 className="font-bold text-slate-800 flex items-center gap-2 mb-3">
                      <Palette className="w-4 h-4 text-violet-600" />
                      Stylist's Advice
                    </h4>
                    <div className="prose prose-sm prose-violet text-slate-600">
                       <div className="whitespace-pre-line text-sm">{styleAdvice}</div>
                    </div>
                  </div>
                )}
              </div>
            )}

          </div>

        </div>
      </main>
      <style jsx global>{`
        @keyframes progress {
          0% { width: 0%; margin-left: 0; }
          50% { width: 100%; margin-left: 0; }
          100% { width: 0%; margin-left: 100%; }
        }
        .animate-progress {
          animation: progress 1.5s infinite ease-in-out;
        }
      `}</style>
    </div>
  );
};

export default FashionGenApp;
