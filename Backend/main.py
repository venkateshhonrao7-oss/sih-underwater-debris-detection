from pathlib import Path
import base64
import io
import time

from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from PIL import Image
from ultralytics import YOLO


# ============================================================
# SIH UNDERWATER DEBRIS DETECTION BACKEND
# ============================================================

print()
print("=" * 70)
print("SIH UNDERWATER DEBRIS DETECTION")
print("=" * 70)


# ============================================================
# PATHS
# ============================================================

BASE_DIR = Path(__file__).resolve().parent
PROJECT_DIR = BASE_DIR.parent
FRONTEND_DIR = PROJECT_DIR / "Frontend"


# ============================================================
# YOLO CONFIDENCE THRESHOLD
# ============================================================
# This is INTERNAL.
# The user does NOT control this from the website.
#
# 0.25 means predictions below 25% confidence are filtered.
# The actual YOLO confidence values are still returned and shown.
# ============================================================

DEFAULT_CONFIDENCE = 0.25


# ============================================================
# MODEL PATHS
# ============================================================

MODEL_CANDIDATES = [
    PROJECT_DIR / "runs" / "detect" / "train-2" / "weights" / "best.pt",
    PROJECT_DIR / "runs" / "detect" / "train" / "weights" / "best.pt",
    FRONTEND_DIR / "best.pt",
]


# ============================================================
# FIND TRAINED MODEL
# ============================================================

MODEL_PATH = None

print()
print("Checking YOLO model...")

for candidate in MODEL_CANDIDATES:
    if candidate.exists():
        MODEL_PATH = candidate
        break


if MODEL_PATH is None:
    print()
    print("ERROR: Trained YOLO model was not found.")

    print()
    print("Expected locations:")

    for candidate in MODEL_CANDIDATES:
        print(candidate)


# ============================================================
# LOAD YOLO MODEL
# ============================================================

model = None
model_error = None


if MODEL_PATH is not None:

    try:

        print()
        print("Expected model:")
        print(MODEL_PATH)

        print()
        print("Loading your trained YOLO model...")

        model = YOLO(str(MODEL_PATH))

        print()
        print("YOLO MODEL LOADED SUCCESSFULLY!")

        print()
        print(MODEL_PATH)

        print()
        print("Classes:")
        print(model.names)

    except Exception as exc:

        model_error = str(exc)

        print()
        print("ERROR WHILE LOADING YOLO MODEL:")
        print(model_error)

else:

    model_error = "Trained YOLO model not found."


# ============================================================
# FASTAPI APP
# ============================================================

app = FastAPI(
    title="SIH Underwater Debris Detection",
    description="YOLO-based underwater debris detection system",
    version="1.0.0",
)


# ============================================================
# SERVE FRONTEND STATIC FILES
# ============================================================

if FRONTEND_DIR.exists():

    app.mount(
        "/static",
        StaticFiles(directory=str(FRONTEND_DIR)),
        name="static",
    )

else:

    print()
    print("WARNING: Frontend directory not found:")
    print(FRONTEND_DIR)


# ============================================================
# HOME PAGE
# ============================================================

@app.get("/")
async def home():

    index_file = FRONTEND_DIR / "index.html"

    if not index_file.exists():

        raise HTTPException(
            status_code=404,
            detail="Frontend index.html was not found.",
        )

    return FileResponse(index_file)


# ============================================================
# STATUS API
# ============================================================

@app.get("/api/status")
async def status():

    return {
        "model_ready": model is not None,
        "model_path": str(MODEL_PATH) if MODEL_PATH else None,
        "model_error": model_error,
        "confidence_threshold": DEFAULT_CONFIDENCE,
        "classes": model.names if model is not None else {},
    }


# ============================================================
# DETECTION API
# ============================================================

@app.post("/api/detect")
async def detect(
    file: UploadFile = File(...),
):

    print()
    print("=" * 70)
    print("NEW YOLO DETECTION")
    print("=" * 70)

    # --------------------------------------------------------
    # Check model
    # --------------------------------------------------------

    if model is None:

        raise HTTPException(
            status_code=503,
            detail=(
                "YOLO model is not available. "
                f"{model_error}"
            ),
        )

    # --------------------------------------------------------
    # Internal confidence threshold
    # --------------------------------------------------------

    confidence = DEFAULT_CONFIDENCE

    print()
    print(
        f"Confidence threshold: {confidence:.2f}"
    )

    # --------------------------------------------------------
    # Validate filename
    # --------------------------------------------------------

    if not file.filename:

        raise HTTPException(
            status_code=400,
            detail="No image file was uploaded.",
        )

    print()
    print(f"Received image: {file.filename}")

    # --------------------------------------------------------
    # Validate file type
    # --------------------------------------------------------

    allowed_types = {
        "image/jpeg",
        "image/jpg",
        "image/png",
        "image/webp",
    }

    if file.content_type not in allowed_types:

        raise HTTPException(
            status_code=400,
            detail=(
                "Unsupported image type. "
                "Please upload JPG, JPEG, PNG, or WEBP."
            ),
        )

    # --------------------------------------------------------
    # Read uploaded image
    # --------------------------------------------------------

    try:

        image_bytes = await file.read()

    except Exception as exc:

        raise HTTPException(
            status_code=400,
            detail=f"Could not read uploaded image: {exc}",
        )

    if not image_bytes:

        raise HTTPException(
            status_code=400,
            detail="Uploaded image is empty.",
        )

    print(
        f"Image size: {len(image_bytes) / 1024:.1f} KB"
    )

    # --------------------------------------------------------
    # Convert uploaded bytes to PIL image
    # --------------------------------------------------------

    try:

        image = Image.open(
            io.BytesIO(image_bytes)
        ).convert("RGB")

    except Exception as exc:

        raise HTTPException(
            status_code=400,
            detail=f"Could not open image: {exc}",
        )

    print(
        f"Image dimensions: {image.width} x {image.height}"
    )

    # --------------------------------------------------------
    # Run YOLO
    # --------------------------------------------------------

    print()
    print("Running YOLO inference...")

    start_time = time.perf_counter()

    try:

        results = model.predict(
            source=image,
            conf=confidence,
            verbose=False,
        )

    except Exception as exc:

        print()
        print("YOLO INFERENCE ERROR:")
        print(exc)

        raise HTTPException(
            status_code=500,
            detail=f"YOLO inference failed: {exc}",
        )

    inference_time_ms = (
        time.perf_counter() - start_time
    ) * 1000

    print(
        f"Inference time: {inference_time_ms:.2f} ms"
    )

    # --------------------------------------------------------
    # Process YOLO results
    # --------------------------------------------------------

    detections = []

    # There is normally one result because one image
    # was submitted.
    result = results[0]

    if result.boxes is not None:

        for box in result.boxes:

            try:

                # Class ID
                class_id = int(
                    box.cls[0].item()
                )

                # Actual YOLO confidence
                box_confidence = float(
                    box.conf[0].item()
                )

                # Actual bounding box
                x1, y1, x2, y2 = (
                    box.xyxy[0].tolist()
                )

                # Bounding-box dimensions in pixels
                box_width = x2 - x1
                box_height = y2 - y1

                # Get actual class name
                if isinstance(model.names, dict):

                    class_name = model.names.get(
                        class_id,
                        f"class_{class_id}",
                    )

                else:

                    class_name = model.names[
                        class_id
                    ]

                detection = {
    # ----------------------------------------------------
    # Object information
    # ----------------------------------------------------

    "class_id": class_id,

    # Main name
    "class": class_name,
    "name": class_name,

    # Extra aliases so the frontend can use
    # class_name / object_name / label if needed
    "class_name": class_name,
    "object_name": class_name,
    "label": class_name,

    # ----------------------------------------------------
    # YOLO confidence
    # ----------------------------------------------------

    "confidence": round(
        box_confidence,
        4,
    ),

    "confidence_percent": round(
        box_confidence * 100,
        1,
    ),

    # ----------------------------------------------------
    # Bounding box
    # ----------------------------------------------------

    "box": {
        "x1": round(x1, 2),
        "y1": round(y1, 2),
        "x2": round(x2, 2),
        "y2": round(y2, 2),
    },

    # ----------------------------------------------------
    # Detected object dimensions
    # ----------------------------------------------------

    "width": round(box_width, 2),
    "height": round(box_height, 2),

    # Human-readable size for your frontend
    "size": (
        f"{round(box_width)} × "
        f"{round(box_height)} px"
    ),

    # Structured size information
    "size_details": {
        "width": round(box_width, 2),
        "height": round(box_height, 2),
        "unit": "pixels",
    },
}

                detections.append(
                    detection
                )

            except Exception as exc:

                print(
                    "Warning: Could not process "
                    f"one detection: {exc}"
                )

    # --------------------------------------------------------
    # Detection statistics
    # --------------------------------------------------------

    detection_count = len(detections)

    if detection_count > 0:

        average_confidence = (
            sum(
                item["confidence"]
                for item in detections
            )
            / detection_count
        )

        average_confidence_percent = (
            average_confidence * 100
        )

    else:

        average_confidence = 0.0
        average_confidence_percent = 0.0

    print()
    print(
        f"Objects detected: {detection_count}"
    )

    for detection in detections:

        print(
            f"  {detection['class']}: "
            f"{detection['confidence_percent']:.1f}%"
        )

    # --------------------------------------------------------
    # Create annotated image
    # --------------------------------------------------------

    try:

        # Ultralytics plot() returns an annotated
        # NumPy image in BGR format.
        plotted_image = result.plot()

        # Convert BGR -> RGB for PIL.
        plotted_image_rgb = plotted_image[
            :, :, ::-1
        ]

        annotated_pil = Image.fromarray(
            plotted_image_rgb
        )

        output_buffer = io.BytesIO()

        annotated_pil.save(
            output_buffer,
            format="JPEG",
            quality=90,
        )

        encoded_image = base64.b64encode(
            output_buffer.getvalue()
        ).decode("utf-8")

        result_image = (
            "data:image/jpeg;base64,"
            + encoded_image
        )

    except Exception as exc:

        print()
        print(
            "Could not create annotated image:"
        )
        print(exc)

        raise HTTPException(
            status_code=500,
            detail=(
                "Detection succeeded, but the "
                f"result image could not be created: {exc}"
            ),
        )

    # --------------------------------------------------------
    # Final response
    # --------------------------------------------------------

    response = {
        "success": True,

        "detections": detections,

        "detection_count": detection_count,
        "count": detection_count,

        "inference_time_ms": round(
            inference_time_ms,
            2,
        ),

        "inference_time": round(
            inference_time_ms,
            2,
        ),

        "average_confidence": round(
            average_confidence,
            4,
        ),

        "average_confidence_percent": round(
            average_confidence_percent,
            1,
        ),

        "confidence_threshold": confidence,

        "result_image": result_image,
        "annotated_image": result_image,
        "image": result_image,

        "model_path": str(MODEL_PATH),
    }

    print()
    print("Detection completed successfully.")

    print("=" * 70)

    return response


# ============================================================
# STARTUP MESSAGE
# ============================================================

@app.on_event("startup")
async def startup_message():

    print()
    print("=" * 70)
    print("FastAPI application startup complete.")
    print("=" * 70)

    if model is not None:

        print()
        print("Active YOLO model:")
        print(MODEL_PATH)

        print()
        print("YOLO classes:")
        print(model.names)

        print()
        print(
            "Internal confidence threshold:"
            f" {DEFAULT_CONFIDENCE}"
        )

    else:

        print()
        print("WARNING: YOLO model is not loaded.")

    print()