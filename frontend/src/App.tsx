import React, { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, Image as ImageIcon, Send, Loader2, AlertCircle, Clock, Cpu } from 'lucide-react';
import axios from 'axios';



interface AnalysisResponse {
  response: string;
  processing_time: number;
  model_info: {
    name: string;
    device: string;
  };
}

function App() {
  const [image, setImage] = useState<File | null>(null);
  const [preview, setPreview] = useState<string>('');
  const [prompt, setPrompt] = useState('');
  const [response, setResponse] = useState<AnalysisResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (file.size > 10 * 1024 * 1024) { // 10MB limit
      setError('Image size must be less than 10MB');
      return;
    }
    setImage(file);
    setPreview(URL.createObjectURL(file));
    setError('');
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.png', '.jpg', '.jpeg', '.gif']
    },
    multiple: false,
    maxSize: 10 * 1024 * 1024 // 10MB
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!image || !prompt) return;

    if (prompt.length < 3) {
      setError('Prompt must be at least 3 characters long');
      return;
    }

    if (prompt.length > 500) {
      setError('Prompt must be less than 500 characters');
      return;
    }

    setLoading(true);
    setError('');
    setResponse(null);

    const formData = new FormData();
    formData.append('image', image);
    formData.append('prompt', prompt);

    try {
      const response = await axios.post<AnalysisResponse>(
        'http://localhost:8000/analyze',
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        }
      );
      setResponse(response.data);
    } catch (error) {
      if (axios.isAxiosError(error)) {
        setError(error.response?.data?.detail || 'Error analyzing image. Please try again.');
      } else {
        setError('An unexpected error occurred. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-gray-800 text-white p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl font-bold text-center mb-8">AI Image Analysis</h1>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="space-y-6">
            <div
              {...getRootProps()}
              className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors
                ${isDragActive ? 'border-blue-500 bg-blue-500/10' : 'border-gray-600 hover:border-gray-500'}
                ${error ? 'border-red-500' : ''}`}
            >
              <input {...getInputProps()} />
              <Upload className="mx-auto h-12 w-12 mb-4" />
              <p className="text-lg">
                {isDragActive
                  ? 'Drop the image here'
                  : 'Drag & drop an image here, or click to select'}
              </p>
              <p className="text-sm text-gray-400 mt-2">Maximum size: 10MB</p>
            </div>

            {preview && (
              <div className="relative aspect-video rounded-lg overflow-hidden bg-gray-800">
                <img
                  src={preview}
                  alt="Preview"
                  className="w-full h-full object-contain"
                />
              </div>
            )}

            {error && (
              <div className="bg-red-500/10 border border-red-500 rounded-lg p-4 flex items-start gap-3">
                <AlertCircle className="h-5 w-5 text-red-500 mt-0.5" />
                <p className="text-red-200">{error}</p>
              </div>
            )}
          </div>

          <div className="space-y-6">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label htmlFor="prompt" className="block text-sm font-medium mb-2">
                  What would you like to know about this image?
                </label>
                <textarea
                  id="prompt"
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  className="w-full px-4 py-2 rounded-lg bg-gray-800 border border-gray-700 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                  rows={4}
                  placeholder="Enter your prompt here (3-500 characters)..."
                  maxLength={500}
                />
                <p className="text-sm text-gray-400 mt-1">
                  {prompt.length}/500 characters
                </p>
              </div>

              <button
                type="submit"
                disabled={!image || !prompt || loading || prompt.length < 3}
                className={`w-full py-3 px-4 rounded-lg flex items-center justify-center space-x-2
                  ${loading || !image || !prompt || prompt.length < 3
                    ? 'bg-gray-700 cursor-not-allowed'
                    : 'bg-blue-600 hover:bg-blue-700'
                  }`}
              >
                {loading ? (
                  <>
                    <Loader2 className="animate-spin" />
                    <span>Analyzing...</span>
                  </>
                ) : (
                  <>
                    <Send className="h-5 w-5" />
                    <span>Analyze Image</span>
                  </>
                )}
              </button>
            </form>

            {response && (
              <div className="bg-gray-800 rounded-lg p-6 space-y-4">
                <h2 className="text-xl font-semibold mb-4">Analysis Result</h2>
                <p className="text-gray-300">{response.response}</p>
                
                <div className="border-t border-gray-700 pt-4 mt-4">
                  <div className="flex items-center gap-2 text-sm text-gray-400">
                    <Clock className="h-4 w-4" />
                    <span>Processing time: {response.processing_time.toFixed(2)}s</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-gray-400 mt-2">
                    <Cpu className="h-4 w-4" />
                    <span>Model: {response.model_info.name} ({response.model_info.device})</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;