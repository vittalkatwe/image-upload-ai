from fastapi import FastAPI, File, Form, UploadFile, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from PIL import Image
import io
import torch
from transformers import AutoModelForCausalLM
import logging
from datetime import datetime
import sys
from motor.motor_asyncio import AsyncIOMotorClient
import base64

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)
logger = logging.getLogger(__name__)

app = FastAPI(
    title="AI Image Analysis API",
    description="Advanced image analysis API using Moondream2 model",
    version="1.0.0",
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Global variables
model = None
device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
mongo_client = None
db = None

# MongoDB configuration
MONGO_URI = "mongodb+srv://vittalkatwe:vittalkatwe@cautious.rh2qklo.mongodb.net/database_name?retryWrites=true&w=majority&appName=cautious"
DB_NAME = "database_name"
COLLECTION_NAME = "image_analysis"

def init_model():
    """Initialize the model with proper error handling"""
    global model
    try:
        logger.info(f"Loading Moondream2 model on {device}...")
        model = AutoModelForCausalLM.from_pretrained(
            "vikhyatk/moondream2",
            revision="2025-01-09",
            trust_remote_code=True,
        ).to(device)
        
        if device.type == "cuda":
            model = model.half()
        
        logger.info("Model loaded successfully")
        return True
    except Exception as e:
        logger.error(f"Failed to load model: {str(e)}")
        return False

async def init_mongodb():
    """Initialize MongoDB connection"""
    global mongo_client, db
    try:
        mongo_client = AsyncIOMotorClient(MONGO_URI)
        db = mongo_client[DB_NAME]
        await db[COLLECTION_NAME].create_index("timestamp")
        logger.info("MongoDB connection established successfully")
    except Exception as e:
        logger.error(f"Failed to connect to MongoDB: {str(e)}")
        raise e

@app.on_event("startup")
async def startup_event():
    """Initialize model and MongoDB when the application starts"""
    init_model()
    await init_mongodb()

@app.on_event("shutdown")
async def shutdown_event():
    """Close MongoDB connection when the application shuts down"""
    if mongo_client:
        mongo_client.close()

@app.post("/analyze")
async def analyze_image(
    image: UploadFile = File(...),
    prompt: str = Form(...),
    max_new_tokens: int = Form(default=100)
):
    start_time = datetime.now()
    logger.info(f"Received image: {image.filename}, prompt: {prompt}")
    
    if model is None:
        logger.error("Model not initialized")
        raise HTTPException(status_code=500, detail="Model not initialized. Please try again later.")
    
    try:
        # Read and validate image
        contents = await image.read()
        try:
            img = Image.open(io.BytesIO(contents))
            if max(img.size) > 1024:
                img.thumbnail((1024, 1024), Image.Resampling.LANCZOS)
            if img.mode != 'RGB':
                img = img.convert('RGB')
        except Exception as e:
            logger.error(f"Image processing error: {str(e)}")
            raise HTTPException(status_code=400, detail="Invalid image format")

        # Initialize results dictionary
        analysis_results = {}
        
        try:
            with torch.inference_mode():
                # Get caption
                caption_result = model.caption(img, length="short")
                analysis_results["short_caption"] = caption_result["caption"] if caption_result else "Caption generation failed"
                
                # Get answer to user's prompt
                query_result = model.query(img, prompt, max_new_tokens=max_new_tokens)
                analysis_results["prompt_response"] = query_result["answer"] if query_result else "Query processing failed"
            
        except Exception as e:
            logger.error(f"Model inference error: {str(e)}")
            analysis_results["error"] = f"Analysis partially failed: {str(e)}"

        process_time = (datetime.now() - start_time).total_seconds()
        logger.info(f"Analysis completed in {process_time:.2f} seconds with results: {analysis_results}")
        
        # Store in MongoDB
        try:
            # Convert image to base64 for storage
            img_byte_arr = io.BytesIO()
            img.save(img_byte_arr, format=img.format or 'JPEG')
            img_byte_arr = img_byte_arr.getvalue()
            img_base64 = base64.b64encode(img_byte_arr).decode('utf-8')
            
            mongo_doc = {
                "timestamp": datetime.now(),
                "filename": image.filename,
                "prompt": prompt,
                "analysis_results": analysis_results,
                "processing_time": process_time,
                "image_data": img_base64
            }
            
            await db[COLLECTION_NAME].insert_one(mongo_doc)
            logger.info("Analysis results stored in MongoDB")
        except Exception as e:
            logger.error(f"MongoDB storage error: {str(e)}")
            # Continue with the response even if storage fails
        
        return JSONResponse(
            content={
                "status": "success",
                "analysis": analysis_results,
                "processing_time": process_time
            }
        )
    
    except HTTPException as he:
        raise he
    except Exception as e:
        logger.error(f"Unexpected error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

# Add endpoint to retrieve historical analyses
@app.get("/history")
async def get_history(limit: int = 10):
    """Retrieve recent image analyses from MongoDB"""
    try:
        cursor = db[COLLECTION_NAME].find(
            {},
            {"image_data": 0}  # Exclude image data from response for performance
        ).sort("timestamp", -1).limit(limit)
        
        history = []
        async for doc in cursor:
            doc["_id"] = str(doc["_id"])  # Convert ObjectId to string
            doc["timestamp"] = doc["timestamp"].isoformat()
            history.append(doc)
            
        return JSONResponse(content={"history": history})
    except Exception as e:
        logger.error(f"Error retrieving history: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to retrieve history")

@app.get("/health")
async def health_check():
    """Check if the service is healthy and model is loaded."""
    mongo_status = "connected" if mongo_client else "disconnected"
    return {
        "status": "healthy" if model is not None and mongo_client else "degraded",
        "model_loaded": model is not None,
        "device": str(device),
        "cuda_available": torch.cuda.is_available(),
        "cuda_device_count": torch.cuda.device_count() if torch.cuda.is_available() else 0,
        "mongodb_status": mongo_status,
        "timestamp": datetime.now().isoformat(),
        "python_version": sys.version
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)