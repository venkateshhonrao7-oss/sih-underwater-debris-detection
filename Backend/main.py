from pathlib import Path
import base64
import io
import time

import torch
from PIL import Image

from fastapi import FastAPI, File, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, JSONResponse

from ultralytics import YOLO


# ============================================================
# PATHS
# ============================================================

BASE_DIR = Path(__file__).resolve().parent.parent
FRONTEND_DIR = BASE_DIR / "Frontend"

MODEL_CANDIDATES = [
    BASE_DIR / "runs" / "detect" / "train-2" / "weights" / "best.pt",
    BASE_DIR / "runs" / "detect" / "train" / "weights" / "best.pt",
    BASE_DIR / "Frontend" / "best.pt",
]


# ============================================================
# YOLO SETTINGS
# ============================================================

DEFAULT_CONFIDENCE = 0.25
INFERENCE_SIZE = 320
MAX_DETECTIONS = 20
MAX_IMAGE_DIMENSION = 1600


# ============================================================
# FASTAPI APP
# ============================================================

app = FastAPI(
    title="Marine AI - Underwater Debris Detection",
    description="YOLO based underwater debris detection system",
    version="1.0.0",
)


# ============================================================
# CORS
# ============================================================

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ============================================================
# MODEL
# ============================================================

model = None
model_path = None
model_error = None


def load_model():
    global model
    global model_path
    global model_error

    model = None
    model_path = None
    model_error = None

    for candidate in MODEL_CANDIDATES:

        if candidate.exists():

            try:
                print("=" * 60)
                print(f"Loading YOLO model from:")
                print(candidate)
                print("=" * 60)

                model = YOLO(str(candidate))

                model_path = candidate

                print("YOLO model loaded successfully.")
                print(f"Model path: {model_path}")
                print("=" * 60)

                return

            except Exception as error:

                model_error = str(error)

                print("Failed to load model:")
                print(error)

    model_error = (
        "Trained YOLO model was not found. "
        "Expected best.pt in runs/detect/train-2/weights/"
    )

    print(model_error)


load_model()


# ============================================================
# CLASS NAMES
# ============================================================

CLASS_NAMES = {
    0: "crab_pot",
    1: "submarine_pipeline",
    2: "shipwreck",
    3: "ghost_net",
    4: "mine_cylinder",
}


# ============================================================
# HOME PAGE
# ============================================================

@app.get("/")
async def home():

    index_file = FRONTEND_DIR / "index.html"

    if not index_file.exists():

        return JSONResponse(
            status_code=404,
            content={
                "error": "Frontend index.html not found."
            },
        )

    return FileResponse(index_file)


# ============================================================
# STATIC FRONTEND FILES
# ============================================================

if FRONTEND_DIR.exists():

    app.mount(
        "/static",
        StaticFiles(directory=FRONTEND_DIR),
        name="static",
    )


# ============================================================
# STATUS API
# ============================================================

@app.get("/api/status")
async def status():

    classes = {
        str(key): value
        for key, value in CLASS_NAMES.items()
    }

    return {
        "model_ready": model is not None,
        "model_path": str(model_path) if model_path else None,
        "model_error": model_error,
        "confidence_threshold": DEFAULT_CONFIDENCE,
        "inference_size": INFERENCE_SIZE,
        "classes": classes,
    }


# ============================================================
# IMAGE VALIDATION
# ============================================================

def is_valid_image(image_bytes):

    try:

        image = Image.open(
            io.BytesIO(image_bytes)
        )

        image.verify()

        return True

    except Exception:

        return False


# ============================================================
# IMAGE PREPARATION
# ============================================================

def prepare_image(image):

    image.thumbnail(
        (
            MAX_IMAGE_DIMENSION,
            MAX_IMAGE_DIMENSION
        ),
        Image.Resampling.LANCZOS,
    )

    return image


# ============================================================
# YOLO DETECTION
# ============================================================

@app.post("/api/detect")
async def detect(
    file: UploadFile = File(...)
):

    start_time = time.perf_counter()


    # --------------------------------------------------------
    # CHECK MODEL
    # --------------------------------------------------------

    if model is None:

        return JSONResponse(
            status_code=500,
            content={
                "success": False,
                "error": "YOLO model is not loaded.",
                "model_error": model_error,
            },
        )


    # --------------------------------------------------------
    # READ IMAGE
    # --------------------------------------------------------

    try:

        image_bytes = await file.read()

    except Exception as error:

        return JSONResponse(
            status_code=400,
            content={
                "success": False,
                "error": f"Could not read uploaded file: {error}",
            },
        )


    if not image_bytes:

        return JSONResponse(
            status_code=400,
            content={
                "success": False,
                "error": "Uploaded file is empty.",
            },
        )


    # --------------------------------------------------------
    # VALIDATE IMAGE
    # --------------------------------------------------------

    if not is_valid_image(image_bytes):

        return JSONResponse(
            status_code=400,
            content={
                "success": False,
                "error": "Uploaded file is not a valid image.",
            },
        )


    # --------------------------------------------------------
    # OPEN IMAGE
    # --------------------------------------------------------

    try:

        image = Image.open(
            io.BytesIO(image_bytes)
        ).convert("RGB")

    except Exception as error:

        return JSONResponse(
            status_code=400,
            content={
                "success": False,
                "error": f"Could not open image: {error}",
            },
        )


    # Keep original dimensions
    original_width, original_height = image.size


    # Resize very large images
    image = prepare_image(image)


    # --------------------------------------------------------
    # RUN YOLO
    # --------------------------------------------------------

    try:

        print("=" * 60)
        print("Starting YOLO detection...")
        print(f"File: {file.filename}")
        print(
            f"Image size: "
            f"{image.width} x {image.height}"
        )

        with torch.inference_mode():

            results = model.predict(
                source=image,
                conf=DEFAULT_CONFIDENCE,
                imgsz=INFERENCE_SIZE,
                max_det=MAX_DETECTIONS,
                device="cpu",
                verbose=False,
            )

        print("YOLO detection completed.")

    except Exception as error:

        print("=" * 60)
        print("YOLO inference error:")
        print(error)
        print("=" * 60)

        return JSONResponse(
            status_code=500,
            content={
                "success": False,
                "error": f"YOLO inference failed: {error}",
            },
        )


    # --------------------------------------------------------
    # GET YOLO RESULT
    # --------------------------------------------------------

    result = results[0]

    detections = []


    # --------------------------------------------------------
    # EXTRACT DETECTIONS
    # --------------------------------------------------------

    if result.boxes is not None:

        boxes = result.boxes

        for i in range(len(boxes)):

            try:

                class_id = int(
                    boxes.cls[i].item()
                )

                confidence = float(
                    boxes.conf[i].item()
                )

                xyxy = (
                    boxes.xyxy[i]
                    .cpu()
                    .numpy()
                    .tolist()
                )

                class_name = CLASS_NAMES.get(
                    class_id,
                    str(class_id)
                )


                detection = {
                    "class_id": class_id,

                    "class_name": class_name,

                    "confidence": confidence,

                    "confidence_percent": (
                        confidence * 100
                    ),

                    "box": {
                        "x1": float(xyxy[0]),
                        "y1": float(xyxy[1]),
                        "x2": float(xyxy[2]),
                        "y2": float(xyxy[3]),
                    },
                }


                detections.append(detection)


            except Exception as error:

                print(
                    "Could not process detection:"
                )

                print(error)


    # --------------------------------------------------------
    # DETECTION COUNT
    # --------------------------------------------------------

    detection_count = len(detections)


    print("=" * 60)
    print(
        f"Detections found: {detection_count}"
    )


    for detection in detections:

        print(
            f"{detection['class_name']} "
            f"{detection['confidence_percent']:.2f}%"
        )


    # --------------------------------------------------------
    # AVERAGE CONFIDENCE
    # --------------------------------------------------------

    if detections:

        average_confidence = (
            sum(
                detection["confidence"]
                for detection in detections
            )
            / len(detections)
        )

    else:

        average_confidence = 0.0


    average_confidence_percent = (
        average_confidence * 100
    )


    # --------------------------------------------------------
    # CREATE ANNOTATED IMAGE
    # --------------------------------------------------------
    #
    # THIS IS THE IMPORTANT PART.
    #
    # YOLO draws the bounding boxes directly onto
    # the image using result.plot().
    #

    try:

        print("Creating annotated YOLO image...")

        plotted_image = result.plot(
            labels=True,
            boxes=True,
            conf=True,
        )


        # Ultralytics returns BGR.
        # Convert BGR -> RGB.

        plotted_image_rgb = (
            plotted_image[:, :, ::-1]
        )


        annotated_pil = Image.fromarray(
            plotted_image_rgb
        )


        # Compress image into memory

        output_buffer = io.BytesIO()


        annotated_pil.save(
            output_buffer,
            format="JPEG",
            quality=90,
            optimize=True,
        )


        # Convert image to Base64

        encoded_image = base64.b64encode(
            output_buffer.getvalue()
        ).decode("utf-8")


        # IMPORTANT:
        # This is already a complete image URL.
        #
        # Frontend should directly use:
        # resultImage.src = annotated_image

        result_image = (
            "data:image/jpeg;base64,"
            + encoded_image
        )


        print(
            "Annotated YOLO image created successfully."
        )

        print(
            f"Encoded image length: "
            f"{len(result_image)}"
        )


    except Exception as error:

        print("=" * 60)
        print("Could not create annotated image:")
        print(error)
        print("=" * 60)

        return JSONResponse(
            status_code=500,
            content={
                "success": False,
                "error": (
                    "Could not create "
                    f"result image: {error}"
                ),
            },
        )


    # --------------------------------------------------------
    # INFERENCE TIME
    # --------------------------------------------------------

    inference_time_ms = (
        time.perf_counter() - start_time
    ) * 1000


    print(
        f"Inference time: "
        f"{inference_time_ms:.2f} ms"
    )

    print("=" * 60)


    # --------------------------------------------------------
    # RETURN RESPONSE
    # --------------------------------------------------------

    return {

        "success": True,

        "filename": file.filename,

        "detection_count": detection_count,

        "detections": detections,

        "average_confidence": (
            average_confidence
        ),

        "average_confidence_percent": (
            average_confidence_percent
        ),

        "inference_time_ms": (
            inference_time_ms
        ),

        "original_width": original_width,

        "original_height": original_height,

        "processed_width": image.width,

        "processed_height": image.height,

        "confidence_threshold": (
            DEFAULT_CONFIDENCE
        ),

        "model_path": str(model_path),

        # Main result image
        "annotated_image": result_image,

        # Extra names for frontend compatibility
        "result_image": result_image,

        "image": result_image,
    }


# ============================================================
# STARTUP INFORMATION
# ============================================================

@app.on_event("startup")
async def startup_event():

    print()
    print("=" * 60)
    print(
        "Marine AI Underwater "
        "Debris Detection API"
    )
    print("=" * 60)

    print(
        f"Model ready: "
        f"{model is not None}"
    )

    print(
        f"Model path: "
        f"{model_path}"
    )

    print(
        f"Inference size: "
        f"{INFERENCE_SIZE}"
    )

    print(
        f"Confidence threshold: "
        f"{DEFAULT_CONFIDENCE}"
    )

    print("=" * 60)