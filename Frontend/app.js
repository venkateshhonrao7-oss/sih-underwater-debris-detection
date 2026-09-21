// ============================================================
// MARINE AI - UNDERWATER DEBRIS DETECTION
// Frontend JavaScript
// ============================================================


// ============================================================
// ELEMENTS
// ============================================================

const fileInput = document.getElementById("fileInput");
const dropZone = document.getElementById("dropZone");
const browseButton = document.getElementById("browseButton");

const selectedImageSection =
    document.getElementById("selectedImageSection");

const previewImage =
    document.getElementById("previewImage");

const fileName =
    document.getElementById("fileName");

const removeButton =
    document.getElementById("removeButton");

const detectButton =
    document.getElementById("detectButton");

const detectButtonText =
    document.getElementById("detectButtonText");

const errorBox =
    document.getElementById("errorBox");

const resultsSection =
    document.getElementById("resultsSection");

const resultImage =
    document.getElementById("resultImage");

const detectionCount =
    document.getElementById("detectionCount");

const detectionList =
    document.getElementById("detectionList");

const summaryCount =
    document.getElementById("summaryCount");

const inferenceTime =
    document.getElementById("inferenceTime");

const summaryConfidence =
    document.getElementById("summaryConfidence");

const statusText =
    document.getElementById("statusText");

const statusDot =
    document.getElementById("statusDot");


// ============================================================
// BACKEND URL
// ============================================================
//
// Because the frontend is served by FastAPI itself,
// we can use the relative API path.
//
// Local:
// http://127.0.0.1:8000/api/detect
//
// Render:
// https://your-render-url/api/detect
//

const API_BASE_URL = "";


// ============================================================
// SELECTED FILE
// ============================================================

let selectedFile = null;


// ============================================================
// INITIALIZATION
// ============================================================

console.log("Marine AI frontend loaded.");


// ============================================================
// ERROR MESSAGE
// ============================================================

function showError(message) {

    if (!errorBox) {
        console.error(message);
        return;
    }

    errorBox.textContent = message;

    errorBox.classList.remove("hidden");

}


// ============================================================
// CLEAR ERROR
// ============================================================

function clearError() {

    if (!errorBox) {
        return;
    }

    errorBox.textContent = "";

    errorBox.classList.add("hidden");

}


// ============================================================
// SET STATUS
// ============================================================

function setStatus(message, online = true) {

    if (statusText) {
        statusText.textContent = message;
    }

    if (statusDot) {

        statusDot.classList.toggle(
            "offline",
            !online
        );

    }

}


// ============================================================
// FORMAT CONFIDENCE
// ============================================================

function formatConfidence(value) {

    let confidence = Number(value);

    if (!Number.isFinite(confidence)) {
        return "0.0%";
    }

    // Backend normally sends 0.89
    // Convert to 89.0%

    if (confidence <= 1) {
        confidence = confidence * 100;
    }

    return confidence.toFixed(1) + "%";

}


// ============================================================
// FORMAT TIME
// ============================================================

function formatInferenceTime(value) {

    const time = Number(value);

    if (!Number.isFinite(time)) {
        return "--";
    }

    return Math.round(time) + " ms";

}


// ============================================================
// SELECT IMAGE
// ============================================================

function selectImage(file) {

    clearError();

    if (!file) {
        return;
    }


    console.log(
        "Selected file:",
        file.name,
        file.type,
        file.size
    );


    // --------------------------------------------------------
    // Check image type
    // --------------------------------------------------------

    if (!file.type.startsWith("image/")) {

        showError(
            "Please select a valid image file."
        );

        return;
    }


    // --------------------------------------------------------
    // Store selected file
    // --------------------------------------------------------

    selectedFile = file;


    // --------------------------------------------------------
    // Show filename
    // --------------------------------------------------------

    if (fileName) {
        fileName.textContent = file.name;
    }


    // --------------------------------------------------------
    // Preview original image
    // --------------------------------------------------------

    const reader = new FileReader();


    reader.onload = function (event) {

        if (previewImage) {

            previewImage.src =
                event.target.result;

            previewImage.removeAttribute(
                "hidden"
            );

            previewImage.classList.remove(
                "hidden"
            );

            previewImage.style.display =
                "block";

        }


        console.log(
            "Image successfully selected."
        );

    };


    reader.onerror = function () {

        showError(
            "Could not read the selected image."
        );

    };


    reader.readAsDataURL(file);


    // --------------------------------------------------------
    // Show selected image section
    // --------------------------------------------------------

    if (selectedImageSection) {

        selectedImageSection.classList.remove(
            "hidden"
        );

    }


    // --------------------------------------------------------
    // Enable detection button
    // --------------------------------------------------------

    if (detectButton) {

        detectButton.disabled = false;

    }


    // --------------------------------------------------------
    // Hide previous results
    // --------------------------------------------------------

    if (resultsSection) {

        resultsSection.classList.add(
            "hidden"
        );

    }


    if (resultImage) {

        resultImage.removeAttribute(
            "src"
        );

    }


    console.log(
        "Ready for detection."
    );

}


// ============================================================
// FILE INPUT
// ============================================================

if (fileInput) {

    fileInput.addEventListener(
        "change",
        function (event) {

            const files =
                event.target.files;

            if (
                files &&
                files.length > 0
            ) {

                selectImage(
                    files[0]
                );

            }

        }
    );

}


// ============================================================
// BROWSE BUTTON
// ============================================================

if (browseButton) {

    browseButton.addEventListener(
        "click",
        function () {

            if (fileInput) {
                fileInput.click();
            }

        }
    );

}


// ============================================================
// DRAG OVER
// ============================================================

if (dropZone) {

    dropZone.addEventListener(
        "dragover",
        function (event) {

            event.preventDefault();

            dropZone.classList.add(
                "drag-over"
            );

        }
    );


    // --------------------------------------------------------
    // DRAG LEAVE
    // --------------------------------------------------------

    dropZone.addEventListener(
        "dragleave",
        function () {

            dropZone.classList.remove(
                "drag-over"
            );

        }
    );


    // --------------------------------------------------------
    // DROP
    // --------------------------------------------------------

    dropZone.addEventListener(
        "drop",
        function (event) {

            event.preventDefault();

            dropZone.classList.remove(
                "drag-over"
            );


            const files =
                event.dataTransfer.files;


            if (
                files &&
                files.length > 0
            ) {

                selectImage(
                    files[0]
                );

            }

        }
    );

}


// ============================================================
// REMOVE IMAGE
// ============================================================

if (removeButton) {

    removeButton.addEventListener(
        "click",
        function () {

            selectedFile = null;


            if (fileInput) {
                fileInput.value = "";
            }


            if (previewImage) {

                previewImage.removeAttribute(
                    "src"
                );

            }


            if (fileName) {
                fileName.textContent = "";
            }


            if (selectedImageSection) {

                selectedImageSection.classList.add(
                    "hidden"
                );

            }


            if (resultsSection) {

                resultsSection.classList.add(
                    "hidden"
                );

            }


            if (resultImage) {

                resultImage.removeAttribute(
                    "src"
                );

            }


            if (detectButton) {

                detectButton.disabled = true;

            }


            clearError();


            console.log(
                "Selected image removed."
            );

        }
    );

}


// ============================================================
// DETECTION BUTTON
// ============================================================

if (detectButton) {

    detectButton.addEventListener(
        "click",
        async function () {

            console.log(
                "DETECT BUTTON CLICKED"
            );


            clearError();


            // ------------------------------------------------
            // Check selected file
            // ------------------------------------------------

            if (!selectedFile) {

                showError(
                    "Please select an image first."
                );

                return;

            }


            // ------------------------------------------------
            // Disable button
            // ------------------------------------------------

            detectButton.disabled = true;


            if (detectButtonText) {

                detectButtonText.textContent =
                    "Detecting...";

            }


            setStatus(
                "Running YOLO detection...",
                true
            );


            // ------------------------------------------------
            // Create FormData
            // ------------------------------------------------

            const formData =
                new FormData();

            formData.append(
                "file",
                selectedFile
            );


            console.log(
                "Sending image to YOLO backend..."
            );


            console.log(
                "POST /api/detect starting..."
            );


            try {

                // ====================================================
                // SEND IMAGE TO BACKEND
                // ====================================================

                const response =
                    await fetch(
                        API_BASE_URL +
                        "/api/detect",
                        {
                            method: "POST",
                            body: formData
                        }
                    );


                console.log(
                    "Backend response received:",
                    response.status
                );


                // ====================================================
                // READ RESPONSE
                // ====================================================

                let data;


                try {

                    data =
                        await response.json();

                } catch (jsonError) {

                    throw new Error(
                        "Backend returned invalid JSON."
                    );

                }


                console.log(
                    "Detection response:",
                    data
                );


                // ====================================================
                // BACKEND ERROR
                // ====================================================

                if (!response.ok) {

                    throw new Error(
                        data.error ||
                        "Detection failed."
                    );

                }


                if (!data.success) {

                    throw new Error(
                        data.error ||
                        "YOLO detection failed."
                    );

                }


                // ====================================================
                // GET DETECTIONS
                // ====================================================

                const detections =
                    Array.isArray(
                        data.detections
                    )
                        ? data.detections
                        : [];


                const count =
                    Number(
                        data.detection_count ??
                        detections.length
                    );


                // ====================================================
                // UPDATE DETECTION COUNT
                // ====================================================

                if (detectionCount) {

                    detectionCount.textContent =
                        count;

                }


                if (summaryCount) {

                    summaryCount.textContent =
                        count;

                }


                // ====================================================
                // UPDATE CONFIDENCE
                // ====================================================

                const averageConfidence =
                    data.average_confidence_percent ??
                    data.average_confidence ??
                    0;


                if (summaryConfidence) {

                    summaryConfidence.textContent =
                        formatConfidence(
                            averageConfidence
                        );

                }


                // ====================================================
                // UPDATE INFERENCE TIME
                // ====================================================

                if (inferenceTime) {

                    inferenceTime.textContent =
                        formatInferenceTime(
                            data.inference_time_ms
                        );

                }


                // ====================================================
                // BUILD DETECTION LIST
                // ====================================================

                if (detectionList) {

                    detectionList.innerHTML = "";


                    if (detections.length === 0) {

                        const emptyItem =
                            document.createElement(
                                "div"
                            );

                        emptyItem.className =
                            "detection-item";


                        emptyItem.textContent =
                            "No objects detected.";

                        detectionList.appendChild(
                            emptyItem
                        );

                    } else {

                        detections.forEach(
                            function (detection, index) {

                                const item =
                                    document.createElement(
                                        "div"
                                    );

                                item.className =
                                    "detection-item";


                                const className =
                                    detection.class_name ||
                                    "Unknown";


                                const confidence =
                                    detection.confidence_percent ??
                                    detection.confidence ??
                                    0;


                                item.innerHTML = `
                                    <div class="detection-name">
                                        ${index + 1}. ${className}
                                    </div>

                                    <div class="detection-confidence">
                                        ${formatConfidence(confidence)}
                                    </div>
                                `;


                                detectionList.appendChild(
                                    item
                                );

                            }
                        );

                    }

                }


                // ====================================================
                // GET ANNOTATED YOLO IMAGE
                // ====================================================

                const annotatedImage =
                    data.annotated_image ||
                    data.result_image ||
                    data.image;


                console.log(
                    "Annotated image available:",
                    Boolean(annotatedImage)
                );


                // ====================================================
                // DISPLAY ANNOTATED YOLO IMAGE
                // ====================================================

                if (
                    annotatedImage &&
                    resultImage
                ) {

                    console.log(
                        "Annotated YOLO image received."
                    );


                    console.log(
                        "Image prefix:",
                        annotatedImage.substring(
                            0,
                            60
                        )
                    );


                    console.log(
                        "Image length:",
                        annotatedImage.length
                    );


                    // ------------------------------------------------
                    // IMPORTANT:
                    //
                    // The backend ALREADY returns:
                    //
                    // data:image/jpeg;base64,/9j/...
                    //
                    // Therefore we DO NOT add another prefix.
                    // ------------------------------------------------

                    resultImage.src =
                        annotatedImage;


                    resultImage.removeAttribute(
                        "hidden"
                    );


                    resultImage.classList.remove(
                        "hidden"
                    );


                    resultImage.style.display =
                        "block";


                    resultImage.style.visibility =
                        "visible";


                    resultImage.style.opacity =
                        "1";


                    // ------------------------------------------------
                    // IMAGE LOAD SUCCESS
                    // ------------------------------------------------

                    resultImage.onload =
                        function () {

                            console.log(
                                "YOLO result image loaded successfully."
                            );


                            console.log(
                                "Result image dimensions:",
                                resultImage.naturalWidth,
                                "x",
                                resultImage.naturalHeight
                            );

                        };


                    // ------------------------------------------------
                    // IMAGE LOAD ERROR
                    // ------------------------------------------------

                    resultImage.onerror =
                        function (event) {

                            console.error(
                                "YOLO result image failed to load.",
                                event
                            );


                            console.error(
                                "Image source starts with:",
                                resultImage.src.substring(
                                    0,
                                    100
                                )
                            );


                            showError(
                                "YOLO detection completed, but the result image could not be displayed."
                            );

                        };


                } else {

                    console.error(
                        "No annotated image was returned by backend."
                    );


                    showError(
                        "Detection completed, but the backend did not return a result image."
                    );

                }


                // ====================================================
                // SHOW RESULTS SECTION
                // ====================================================

                if (resultsSection) {

                    resultsSection.classList.remove(
                        "hidden"
                    );


                    resultsSection.style.display =
                        "block";

                    resultsSection.style.visibility =
                        "visible";

                    resultsSection.style.opacity =
                        "1";

                }


                // ====================================================
                // STATUS
                // ====================================================

                setStatus(
                    "Detection completed",
                    true
                );


                console.log(
                    "Detection completed successfully."
                );


            } catch (error) {

                console.error(
                    "Detection error:",
                    error
                );


                showError(
                    error.message ||
                    "Something went wrong while detecting the image."
                );


                setStatus(
                    "Detection failed",
                    false
                );


            } finally {

                // ------------------------------------------------
                // Re-enable button
                // ------------------------------------------------

                detectButton.disabled = false;


                if (detectButtonText) {

                    detectButtonText.textContent =
                        "Detect Debris";

                }

            }

        }
    );

}


// ============================================================
// CHECK BACKEND STATUS
// ============================================================

async function checkBackendStatus() {

    try {

        console.log(
            "Checking YOLO backend status..."
        );


        const response =
            await fetch(
                API_BASE_URL +
                "/api/status"
            );


        if (!response.ok) {

            throw new Error(
                "Backend status request failed."
            );

        }


        const data =
            await response.json();


        console.log(
            "Backend status:",
            data
        );


        if (data.model_ready) {

            setStatus(
                "YOLO model ready",
                true
            );

        } else {

            setStatus(
                "YOLO model not ready",
                false
            );


            console.error(
                "Model error:",
                data.model_error
            );

        }


    } catch (error) {

        console.error(
            "Could not connect to backend:",
            error
        );


        setStatus(
            "Backend unavailable",
            false
        );

    }

}


// ============================================================
// START STATUS CHECK
// ============================================================

checkBackendStatus();


// ============================================================
// GLOBAL DEBUG MESSAGE
// ============================================================

console.log(
    "Marine AI app.js initialized successfully."
);