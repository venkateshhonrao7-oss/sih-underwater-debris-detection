from pathlib import Path
from io import BytesIO
import base64
import time

from fastapi import FastAPI, UploadFile, File
from fastapi.responses import FileResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware

from PIL import Image, ImageDraw

from ultralytics import YOLO

from .survey_simulator import get_demo_survey_data


# ============================================================
# PATHS
# ============================================================

BASE_DIR = Path(__file__).resolve().parent.parent

BACKEND_DIR = BASE_DIR / "Backend"
FRONTEND_DIR = BASE_DIR / "Frontend"

# Your trained YOLO models
MODEL_CANDIDATES = [
    BASE_DIR / "runs" / "detect" / "train" / "weights" / "best.pt",
    BASE_DIR / "runs" / "detect" / "train-2" / "weights" / "best.pt",
    BASE_DIR / "yolov11n.pt",
    BASE_DIR / "Training" / "yolov11n.pt",
]


# ============================================================
# FASTAPI APP
# ============================================================

app = FastAPI(
    title="Marine AI",
    description="Underwater Object Detection using YOLO",
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
# SERVE FRONTEND
# ============================================================

if not FRONTEND_DIR.exists():
    print("WARNING: Frontend directory not found:")
    print(FRONTEND_DIR)


app.mount(
    "/static",
    StaticFiles(directory=str(FRONTEND_DIR)),
    name="static",
)


@app.get("/")
async def serve_frontend():
    """
    Serve the main frontend page.
    """

    return FileResponse(
        str(FRONTEND_DIR / "index.html")
    )


@app.get("/app.js")
async def serve_javascript():
    """
    Direct compatibility route.
    """

    return FileResponse(
        str(FRONTEND_DIR / "app.js"),
        media_type="application/javascript",
    )


@app.get("/style.css")
async def serve_css():
    """
    Direct compatibility route.
    """

    return FileResponse(
        str(FRONTEND_DIR / "style.css"),
        media_type="text/css",
    )


# ============================================================
# FIND YOLO MODEL
# ============================================================

MODEL_PATH = None

for candidate in MODEL_CANDIDATES:

    if candidate.exists():

        MODEL_PATH = candidate

        break


# ============================================================
# LOAD YOLO MODEL
# ============================================================

model = None
model_error = None

if MODEL_PATH is not None:

    try:

        print("=" * 60)
        print("LOADING YOLO MODEL")
        print("=" * 60)

        print(f"Model path: {MODEL_PATH}")

        model = YOLO(str(MODEL_PATH))

        print("YOLO MODEL LOADED SUCCESSFULLY")

        print("=" * 60)

    except Exception as exc:

        model_error = str(exc)

        print("ERROR LOADING YOLO MODEL:")
        print(model_error)

else:

    model_error = "No YOLO model file found."

    print("=" * 60)
    print("ERROR: YOLO MODEL NOT FOUND")
    print("=" * 60)

    for candidate in MODEL_CANDIDATES:
        print(candidate)

    print("=" * 60)


# ============================================================
# DEMO SURVEY POINT
# ============================================================

demo_point_number = 0


# ============================================================
# IMAGE TO BASE64
# ============================================================

def image_to_base64(image: Image.Image) -> str:

    buffer = BytesIO()

    image.save(
        buffer,
        format="JPEG",
        quality=90,
    )

    encoded = base64.b64encode(
        buffer.getvalue()
    ).decode("utf-8")

    return "data:image/jpeg;base64," + encoded


# ============================================================
# HEALTH CHECK
# ============================================================

@app.get("/api/health")
async def health():

    return {
        "success": True,
        "status": "online",
        "model_loaded": model is not None,
        "model_path": (
            str(MODEL_PATH)
            if MODEL_PATH
            else None
        ),
        "model_exists": (
            MODEL_PATH.exists()
            if MODEL_PATH
            else False
        ),
        "model_error": model_error,
    }


# ============================================================
# MODEL STATUS
# ============================================================

@app.get("/api/model-status")
async def model_status():

    return {
        "success": True,
        "model_loaded": model is not None,
        "model_path": (
            str(MODEL_PATH)
            if MODEL_PATH
            else None
        ),
        "model_exists": (
            MODEL_PATH.exists()
            if MODEL_PATH
            else False
        ),
        "model_error": model_error,
    }


# ============================================================
# DETECTION API
# ============================================================

@app.post("/api/detect")
async def detect(
    file: UploadFile = File(...)
):

    global demo_point_number

    # --------------------------------------------------------
    # CHECK MODEL
    # --------------------------------------------------------

    if model is None:

        return JSONResponse(
            status_code=500,
            content={
                "success": False,
                "error": "YOLO model is not loaded.",
                "model_loaded": False,
                "model_path": (
                    str(MODEL_PATH)
                    if MODEL_PATH
                    else None
                ),
                "model_error": model_error,
            },
        )


    # --------------------------------------------------------
    # CHECK FILE
    # --------------------------------------------------------

    if file is None or not file.filename:

        return JSONResponse(
            status_code=400,
            content={
                "success": False,
                "error": "No image file was uploaded.",
            },
        )


    # --------------------------------------------------------
    # CHECK IMAGE TYPE
    # --------------------------------------------------------

    allowed_types = {
        "image/jpeg",
        "image/jpg",
        "image/png",
        "image/webp",
        "image/bmp",
    }

    if file.content_type not in allowed_types:

        return JSONResponse(
            status_code=400,
            content={
                "success": False,
                "error": (
                    "Please upload a valid image "
                    "(JPG, PNG, WEBP or BMP)."
                ),
            },
        )


    # --------------------------------------------------------
    # READ IMAGE
    # --------------------------------------------------------

    try:

        file_bytes = await file.read()

        original_image = Image.open(
            BytesIO(file_bytes)
        ).convert("RGB")

    except Exception as exc:

        return JSONResponse(
            status_code=400,
            content={
                "success": False,
                "error": "Could not read uploaded image.",
                "details": str(exc),
            },
        )


    # --------------------------------------------------------
    # GENERATE DEMO GPS + DEPTH
    # --------------------------------------------------------

    survey_data = get_demo_survey_data(
        demo_point_number
    )

    demo_point_number += 1


    # --------------------------------------------------------
    # RUN YOLO
    # --------------------------------------------------------

    start_time = time.perf_counter()

    try:

        results = model.predict(
            source=original_image,
            conf=0.25,
            verbose=False,
        )

    except Exception as exc:

        return JSONResponse(
            status_code=500,
            content={
                "success": False,
                "error": "YOLO inference failed.",
                "details": str(exc),
            },
        )

    inference_time_ms = (
        time.perf_counter() - start_time
    ) * 1000


    # --------------------------------------------------------
    # PROCESS RESULTS
    # --------------------------------------------------------

    detections = []

    annotated_image = original_image.copy()

    draw = ImageDraw.Draw(
        annotated_image
    )


    for result in results:

        boxes = result.boxes

        if boxes is None:
            continue


        for box in boxes:

            try:

                class_id = int(
                    box.cls[0].item()
                )

                confidence = float(
                    box.conf[0].item()
                )

                coordinates = box.xyxy[0].tolist()

            except Exception:

                continue


            # ------------------------------------------------
            # CLASS NAME
            # ------------------------------------------------

            class_name = str(
                class_id
            )

            try:

                if hasattr(model, "names"):

                    if isinstance(
                        model.names,
                        dict
                    ):

                        class_name = model.names.get(
                            class_id,
                            str(class_id),
                        )

                    elif (
                        isinstance(
                            model.names,
                            list
                        )
                        and class_id < len(model.names)
                    ):

                        class_name = model.names[
                            class_id
                        ]

            except Exception:

                class_name = str(class_id)


            # ------------------------------------------------
            # BOUNDING BOX
            # ------------------------------------------------

            x1, y1, x2, y2 = coordinates

            x1 = int(x1)
            y1 = int(y1)
            x2 = int(x2)
            y2 = int(y2)


            # ------------------------------------------------
            # DRAW BOX
            # ------------------------------------------------

            draw.rectangle(
                [
                    x1,
                    y1,
                    x2,
                    y2,
                ],
                outline="red",
                width=3,
            )


            label = (
                f"{class_name} "
                f"{confidence * 100:.1f}%"
            )


            # Draw label background

            try:

                text_bbox = draw.textbbox(
                    (x1, y1),
                    label,
                )

                draw.rectangle(
                    text_bbox,
                    fill="red",
                )

            except Exception:

                pass


            draw.text(
                (x1, y1),
                label,
                fill="white",
            )


            # ------------------------------------------------
            # SAVE DETECTION
            # ------------------------------------------------

            detections.append(
                {
                    "class_id": class_id,
                    "class_name": class_name,
                    "confidence": round(
                        confidence,
                        4,
                    ),
                    "confidence_percent": round(
                        confidence * 100,
                        2,
                    ),
                    "bbox": {
                        "x1": x1,
                        "y1": y1,
                        "x2": x2,
                        "y2": y2,
                    },
                }
            )


    # ========================================================
    # STATISTICS
    # ========================================================

    object_count = len(
        detections
    )


    if object_count > 0:

        average_confidence = (
            sum(
                item["confidence"]
                for item in detections
            )
            / object_count
        )

    else:

        average_confidence = 0.0


    # ========================================================
    # ENCODE RESULT IMAGE
    # ========================================================

    result_image_base64 = image_to_base64(
        annotated_image
    )


    # ========================================================
    # FINAL RESPONSE
    # ========================================================

    return {
        "success": True,

        "filename": file.filename,

        "model_loaded": True,

        "model_path": str(
            MODEL_PATH
        ),

        "object_count": object_count,

        "objects": object_count,

        "detections": detections,

        "inference_time_ms": round(
            inference_time_ms,
            2,
        ),

        "average_confidence": round(
            average_confidence,
            4,
        ),

        "average_confidence_percent": round(
            average_confidence * 100,
            2,
        ),

        "result_image": result_image_base64,

        "image": result_image_base64,

        # IMPORTANT:
        # This is the simulated survey metadata.
        "survey": survey_data,

        "gps": {
            "latitude": survey_data[
                "latitude"
            ],
            "longitude": survey_data[
                "longitude"
            ],
            "source": "demo_simulation",
        },

        "depth": {
            "depth_m": survey_data[
                "depth_m"
            ],
            "source": "demo_simulation",
        },

        "gps_source": "demo_simulation",

        "depth_source": "demo_simulation",
    }


# ============================================================
# RUN INFORMATION
# ============================================================

@app.get("/api/info")
async def info():

    return {
        "project": "Marine AI",
        "description": (
            "Underwater Object Detection "
            "using YOLO"
        ),

        "frontend": str(
            FRONTEND_DIR
        ),

        "model": (
            str(MODEL_PATH)
            if MODEL_PATH
            else None
        ),

        "model_loaded": model is not None,

        "demo_mode": True,

        "gps_source": "demo_simulation",

        "depth_source": "demo_simulation",
    }