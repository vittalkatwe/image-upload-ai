import React, { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, Send, Loader2, AlertCircle } from 'lucide-react';
import axios from 'axios';

interface AnalysisResponse {
  response: string;
  status: string;
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

    setLoading(true);
    setError('');
    setResponse(null);

    const formData = new FormData();
    formData.append('image', image);
    formData.append('prompt', prompt);

    try {
      const result = await axios.post<AnalysisResponse>(
        'http://localhost:8000/analyze',
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data', // Ensure content type is multipart
          },
        }
      );
      
      // If the response has an error message
      if (result.data.error) {
        setError(result.data.error);
      } else {
        setResponse(result.data);
      }
    } catch (error) {
      // Check if it's an axios error and display the message
      if (axios.isAxiosError(error)) {
        if (error.response?.data?.error) {
          setError(error.response.data.error);
        } else {
          setError('Error analyzing image. Please try again.');
        }
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
                    : 'bg-blue-500 hover:bg-blue-600'
                  }`}
              >
                {loading ? (
                  <Loader2 className="animate-spin h-5 w-5" />
                ) : (
                  <Send className="h-5 w-5" />
                )}
                <span>{loading ? 'Analyzing...' : 'Submit'}</span>
              </button>
            </form>
          </div>
        </div>

        {response && (
          <div className="mt-8 bg-gray-800 p-6 rounded-lg">
            <h3 className="text-xl font-semibold mb-4">Analysis Result</h3>
            <p>{response.response}</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;
