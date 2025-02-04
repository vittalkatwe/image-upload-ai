# AI Image Analysis Application

This is a full-stack application that allows users to upload images and analyze them using AI. The application consists of a FastAPI backend for AI processing and a React frontend for the user interface.

## Project Structure

```
.
├── backend/
│   ├── main.py
│   └── requirements.txt
└── frontend/
    ├── src/
    │   ├── App.tsx
    │   ├── main.tsx
    │   └── index.css
    ├── package.json
    └── vite.config.ts
```

## Setup Instructions

### Backend Setup

1. Create a Python virtual environment:
   ```bash
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```

2. Install dependencies:
   ```bash
   cd backend
   pip install -r requirements.txt
   ```

3. Start the FastAPI server:
   ```bash
   uvicorn main:app --reload
   ```

The backend will run on `http://localhost:8000`

### Frontend Setup

1. Install dependencies:
   ```bash
   cd frontend
   npm install
   ```

2. Start the development server:
   ```bash
   npm run dev
   ```

The frontend will run on `http://localhost:5173`

## Features

- Drag and drop image upload
- Real-time image preview
- AI-powered image analysis
- Responsive design
- Loading states and error handling

## Technologies Used

### Backend
- FastAPI
- Python
- Transformers (Hugging Face)
- PyTorch

### Frontend
- React
- TypeScript
- Tailwind CSS
- Vite
- Axios
- React Dropzone
- Lucide React (icons)

## Usage

1. Open the application in your browser
2. Upload an image by dragging and dropping or clicking the upload area
3. Enter a prompt about what you'd like to know about the image
4. Click "Analyze Image" to get the AI's response

## Notes

- The backend uses the microsoft/git-base model for image analysis
- CORS is configured to allow requests from the frontend development server
- The frontend includes error handling and loading states
- The UI is fully responsive and works on both desktop and mobile devices#   i m a g e - u p l o a d - a i  
 #   i m a g e - u p l o a d - a i  
 #   i m a g e - u p l o a d - a i  
 #   i m a g e - u p l o a d - a i  
 