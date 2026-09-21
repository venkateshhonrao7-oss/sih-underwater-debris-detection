// ============================================================
// MARINE AI - SIH26057
// FRONTEND JAVASCRIPT
// ============================================================

let selectedFile = null;


// ============================================================
// GET HTML ELEMENTS
// ============================================================

const fileInput = document.getElementById("fileInput");
const browseButton = document.getElementById("browseButton");
const dropZone = document.getElementById("dropZone");

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

const statusDot =
    document.getElementById("statusDot");

const statusText =
    document.getElementById("statusText");


// ============================================================
// CHECK ELEMENTS
// ============================================================

console.log("Marine AI JavaScript loaded.");

console.log("fileInput:", fileInput);
console.log("browseButton:", browseButton);
console.log("dropZone:", dropZone);


// ============================================================
// UPDATE CONFIDENCE
// ============================================================




// ============================================================
// SHOW ERROR
// ============================================================

function showError(message) {

    console.error(message);

    errorBox.textContent =
        message;

    errorBox.classList.remove("hidden");

}


// ============================================================
// HIDE ERROR
// ============================================================

function hideError() {

    errorBox.textContent = "";

    errorBox.classList.add("hidden");

}


// ============================================================
// OPEN FILE PICKER
// ============================================================

function openFilePicker() {

    console.log("Opening file picker...");

    fileInput.click();

}


// ============================================================
// BROWSE BUTTON
// ============================================================

browseButton.addEventListener(
    "click",
    function(event) {

        event.preventDefault();
        event.stopPropagation();

        openFilePicker();

    }
);


// ============================================================
// DROPZONE CLICK
// ============================================================

dropZone.addEventListener(
    "click",
    function(event) {

        // Don't trigger twice when the actual button is clicked.
        if (
            event.target === browseButton ||
            browseButton.contains(event.target)
        ) {
            return;
        }

        openFilePicker();

    }
);


// ============================================================
// FILE INPUT CHANGE
// ============================================================

fileInput.addEventListener(
    "change",
    function(event) {

        console.log(
            "File input changed."
        );

        const files =
            event.target.files;

        console.log(
            "Files selected:",
            files
        );


        if (!files || files.length === 0) {

            console.log(
                "No file selected."
            );

            return;

        }


        handleSelectedFile(
            files[0]
        );

    }
);


// ============================================================
// HANDLE SELECTED FILE
// ============================================================

function handleSelectedFile(file) {

    console.log(
        "Selected file:",
        file.name,
        file.type,
        file.size
    );


    hideError();


    // Check file type

    if (!file.type.startsWith("image/")) {

        showError(
            "Please select an image file such as JPG, PNG, or WEBP."
        );

        return;

    }


    selectedFile = file;


    // ========================================================
    // CREATE IMAGE PREVIEW
    // ========================================================

    const imageURL =
        URL.createObjectURL(file);


    previewImage.src =
        imageURL;


    previewImage.onload =
        function() {

            console.log(
                "Image preview loaded successfully."
            );

        };


    previewImage.onerror =
        function() {

            console.error(
                "Could not display image preview."
            );

            showError(
                "The image could not be displayed."
            );

        };


    // ========================================================
    // SHOW FILE INFORMATION
    // ========================================================

    fileName.textContent =
        `${file.name} • ${formatFileSize(file.size)}`;


    // ========================================================
    // SHOW SELECTED IMAGE SECTION
    // ========================================================

    selectedImageSection.classList.remove(
        "hidden"
    );


    // ========================================================
    // ENABLE DETECTION
    // ========================================================

    detectButton.disabled =
        false;


    // Remove old results

    resultsSection.classList.add(
        "hidden"
    );


    console.log(
        "Image successfully selected."
    );

}


// ============================================================
// FORMAT FILE SIZE
// ============================================================

function formatFileSize(bytes) {

    if (bytes < 1024) {

        return `${bytes} B`;

    }

    if (bytes < 1024 * 1024) {

        return `${(
            bytes / 1024
        ).toFixed(1)} KB`;

    }

    return `${(
        bytes /
        (1024 * 1024)
    ).toFixed(1)} MB`;

}


// ============================================================
// DRAG OVER
// ============================================================

dropZone.addEventListener(
    "dragover",
    function(event) {

        event.preventDefault();

        event.stopPropagation();

        dropZone.classList.add(
            "dragover"
        );

    }
);


// ============================================================
// DRAG LEAVE
// ============================================================

dropZone.addEventListener(
    "dragleave",
    function(event) {

        event.preventDefault();

        dropZone.classList.remove(
            "dragover"
        );

    }
);


// ============================================================
// DROP IMAGE
// ============================================================

dropZone.addEventListener(
    "drop",
    function(event) {

        event.preventDefault();

        event.stopPropagation();

        dropZone.classList.remove(
            "dragover"
        );


        console.log(
            "Image dropped."
        );


        const files =
            event.dataTransfer.files;


        if (!files || files.length === 0) {

            return;

        }


        handleSelectedFile(
            files[0]
        );

    }
);


// ============================================================
// REMOVE IMAGE
// ============================================================

removeButton.addEventListener(
    "click",
    function() {

        console.log(
            "Removing selected image."
        );


        selectedFile = null;


        fileInput.value = "";


        previewImage.src = "";


        fileName.textContent = "";


        selectedImageSection.classList.add(
            "hidden"
        );


        detectButton.disabled =
            true;


        resultsSection.classList.add(
            "hidden"
        );


        hideError();

    }
);


// ============================================================
// CONFIDENCE SLIDER
// ============================================================




// ============================================================
// DETECT BUTTON
// ============================================================

detectButton.addEventListener(
    "click",
    detectObjects
);


// ============================================================
// YOLO DETECTION
// ============================================================

async function detectObjects() {
    console.log("DETECT BUTTON CLICKED");

    hideError();

    // ---------------------------------------------
    // Make sure an image was selected
    // ---------------------------------------------

    if (!selectedFile) {

        showError(
            "Please select an image first."
        );

        return;
    }


    // ---------------------------------------------
    // Disable button while AI is working
    // ---------------------------------------------

    detectButton.disabled = true;

    detectButtonText.textContent =
        "Running YOLO...";


    // ---------------------------------------------
    // Put image into FormData
    // ---------------------------------------------

    const formData = new FormData();

    formData.append(
        "file",
        selectedFile
    );


    try {

        console.log(
            "Sending image to YOLO backend..."
        );


        // -----------------------------------------
        // Send image to FastAPI
        // -----------------------------------------

        const response =
            await fetch(
                "/api/detect",
                {
                    method: "POST",
                    body: formData
                }
            );


        console.log(
            "Backend response:",
            response.status
        );


        // -----------------------------------------
        // Make sure backend returned JSON
        // -----------------------------------------

        const contentType =
            response.headers.get(
                "content-type"
            );


        if (
            !contentType ||
            !contentType.includes(
                "application/json"
            )
        ) {

            const text =
                await response.text();

            console.error(
                "Backend did not return JSON:",
                text
            );

            throw new Error(
                "Backend returned an invalid response."
            );
        }


        // -----------------------------------------
        // Convert response to JSON
        // -----------------------------------------

        const data =
            await response.json();


        // -----------------------------------------
        // Check for backend error
        // -----------------------------------------

        if (!response.ok) {

            throw new Error(
                data.detail ||
                "YOLO detection failed."
            );
        }


        // -----------------------------------------
        // Display YOLO results
        // -----------------------------------------

        displayResults(
            data
        );

    }

    catch (error) {

        console.error(
            "Detection error:",
            error
        );

        showError(
            error.message
        );

    }

    finally {

        // -----------------------------------------
        // Enable button again
        // -----------------------------------------

        detectButton.disabled =
            false;

        detectButtonText.textContent =
            "Detect Objects";

    }

}


// ============================================================
// DISPLAY RESULTS
// ============================================================

function displayResults(data) {

    resultsSection.classList.remove(
        "hidden"
    );


    resultImage.src =
        data.annotated_image;


    const detections =
        data.detections || [];


    const count =
        detections.length;


    detectionCount.textContent =
        `${count} ${
            count === 1
                ? "object"
                : "objects"
        }`;


    summaryCount.textContent =
        count;


    if (
        data.summary &&
        data.summary.inference_time_ms !== undefined
    ) {

        inferenceTime.textContent =
            `${data.summary.inference_time_ms} ms`;

    }


    if (data.settings) {

        summaryConfidence.textContent =
            `${Math.round(
                data.settings.confidence_threshold * 100
            )}%`;

    }


    detectionList.innerHTML = "";


    if (detections.length === 0) {

        detectionList.innerHTML = `
            <div class="detection-item">

                <div class="detection-class">
                    No objects detected
                </div>

                <div class="detection-box">
                    Try lowering the confidence threshold.
                </div>

            </div>
        `;

        return;

    }


    detections.forEach(
        function(detection) {

            const item =
                document.createElement(
                    "div"
                );


            item.className =
                "detection-item";


            const box =
                detection.box;


            item.innerHTML = `

                <div class="detection-top">

                    <div class="detection-class">
                        ${escapeHTML(
                            detection.class_name
                        )}
                    </div>

                    <div class="detection-confidence">
                        ${detection.confidence_percent}%
                    </div>

                </div>

                <div class="detection-box">

                    Bounding box:
                    (${box.x1}, ${box.y1})
                    →
                    (${box.x2}, ${box.y2})

                    <br>

                    Size:
                    ${box.width} × ${box.height}

                </div>

            `;


            detectionList.appendChild(
                item
            );

        }
    );

}


// ============================================================
// ESCAPE HTML
// ============================================================

function escapeHTML(value) {

    return String(value)
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");

}


// ============================================================
// CHECK BACKEND
// ============================================================

async function checkBackend() {

    try {

        const response =
            await fetch(
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

            statusDot.classList.add(
                "online"
            );

            statusText.textContent =
                "AI MODEL ONLINE";

        } else {

            statusText.textContent =
                "MODEL NOT READY";

        }


    } catch (error) {

        console.error(
            "Backend connection error:",
            error
        );

        statusText.textContent =
            "BACKEND ERROR";

    }

}


// ============================================================
// START APPLICATION
// ============================================================



checkBackend();