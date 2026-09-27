/* ================================================================
   MARINE AI
   Frontend JavaScript
================================================================ */


/* ================================================================
   ELEMENTS
================================================================ */

const fileInput =
    document.getElementById("fileInput");

const dropzone =
    document.getElementById("dropzone");

const fileName =
    document.getElementById("fileName");

const detectButton =
    document.getElementById("detectButton");

const removeButton =
    document.getElementById("removeButton");

const resultImage =
    document.getElementById("resultImage");

const resultPlaceholder =
    document.getElementById("resultPlaceholder");

const detectionList =
    document.getElementById("detectionList");

const objectCount =
    document.getElementById("objectCount");

const inferenceTime =
    document.getElementById("inferenceTime");

const confidence =
    document.getElementById("confidence");

const errorMessage =
    document.getElementById("errorMessage");

const latitude =
    document.getElementById("latitude");

const longitude =
    document.getElementById("longitude");

const depth =
    document.getElementById("depth");


/* ================================================================
   STATE
================================================================ */

let selectedFile = null;


/* ================================================================
   ERROR HANDLING
================================================================ */

function showError(message) {

    if (!errorMessage) {
        return;
    }

    errorMessage.textContent = message;

    errorMessage.classList.remove("hidden");
}


function clearError() {

    if (!errorMessage) {
        return;
    }

    errorMessage.textContent = "";

    errorMessage.classList.add("hidden");
}


/* ================================================================
   FILE SELECTION
================================================================ */

function selectImage(file) {

    if (!file) {
        return;
    }


    if (!file.type.startsWith("image/")) {

        showError(
            "Please select a valid image file."
        );

        return;
    }


    clearError();

    selectedFile = file;


    if (fileName) {

        fileName.textContent =
            file.name;
    }


    if (detectButton) {

        detectButton.disabled = false;
    }


    /*
       Show the selected image immediately.
    */

    const reader =
        new FileReader();


    reader.onload = function(event) {

        if (!resultImage) {
            return;
        }

        resultImage.src =
            event.target.result;

        resultImage.classList.remove(
            "hidden"
        );


        if (resultPlaceholder) {

            resultPlaceholder.classList.add(
                "hidden"
            );
        }
    };


    reader.readAsDataURL(file);
}


/* ================================================================
   FILE INPUT
================================================================ */

if (fileInput) {

    fileInput.addEventListener(
        "change",
        function() {

            if (
                this.files &&
                this.files.length > 0
            ) {

                selectImage(
                    this.files[0]
                );
            }

        }
    );
}


/* ================================================================
   DRAG AND DROP
================================================================ */

if (dropzone) {

    dropzone.addEventListener(
        "dragover",
        function(event) {

            event.preventDefault();

            dropzone.classList.add(
                "drag-over"
            );
        }
    );


    dropzone.addEventListener(
        "dragleave",
        function() {

            dropzone.classList.remove(
                "drag-over"
            );
        }
    );


    dropzone.addEventListener(
        "drop",
        function(event) {

            event.preventDefault();

            dropzone.classList.remove(
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


/* ================================================================
   FORMAT CONFIDENCE
================================================================ */

function formatConfidence(value) {

    const number =
        Number(value);


    if (!Number.isFinite(number)) {

        return "0.0%";
    }


    let percentage =
        number;


    /*
       YOLO confidence may arrive as:
       0.93
       OR
       93.0
    */

    if (percentage <= 1) {

        percentage =
            percentage * 100;
    }


    return (
        percentage.toFixed(1)
        + "%"
    );
}


/* ================================================================
   FORMAT INFERENCE TIME
================================================================ */

function formatInferenceTime(value) {

    const time =
        Number(value);


    if (!Number.isFinite(time)) {

        return "--";
    }


    return (
        Math.round(time)
        + " ms"
    );
}


/* ================================================================
   RESET RESULT
================================================================ */

function resetResults() {

    if (resultImage) {

        resultImage.src = "";

        resultImage.classList.add(
            "hidden"
        );
    }


    if (resultPlaceholder) {

        resultPlaceholder.classList.remove(
            "hidden"
        );
    }


    if (detectionList) {

        detectionList.innerHTML = `
            <div class="empty-detection">
                No objects detected.
            </div>
        `;
    }


    if (objectCount) {

        objectCount.textContent =
            "0";
    }


    if (inferenceTime) {

        inferenceTime.textContent =
            "--";
    }


    if (confidence) {

        confidence.textContent =
            "0.0%";
    }


    /*
       Reset GPS and depth.
    */

    if (latitude) {

        latitude.textContent =
            "--";
    }


    if (longitude) {

        longitude.textContent =
            "--";
    }


    if (depth) {

        depth.textContent =
            "--";
    }
}


/* ================================================================
   REMOVE IMAGE
================================================================ */

if (removeButton) {

    removeButton.addEventListener(
        "click",
        function() {

            selectedFile = null;


            if (fileInput) {

                fileInput.value = "";
            }


            if (fileName) {

                fileName.textContent =
                    "No image selected";
            }


            if (detectButton) {

                detectButton.disabled =
                    true;
            }


            clearError();

            resetResults();

        }
    );
}


/* ================================================================
   UPDATE SURVEY DATA
================================================================ */

function updateSurveyData(data) {

    console.log(
        "Survey data received:",
        data
    );


    if (!data) {

        console.warn(
            "No survey data received."
        );

        return;
    }


    /*
       Backend format:

       {
           latitude: 18.5204,
           longitude: 73.8567,
           depth_m: 20.0
       }
    */


    if (
        latitude &&
        data.latitude !== undefined &&
        data.latitude !== null
    ) {

        latitude.textContent =
            Number(data.latitude)
                .toFixed(6);
    }


    if (
        longitude &&
        data.longitude !== undefined &&
        data.longitude !== null
    ) {

        longitude.textContent =
            Number(data.longitude)
                .toFixed(6);
    }


    if (
        depth &&
        data.depth_m !== undefined &&
        data.depth_m !== null
    ) {

        depth.textContent =
            Number(data.depth_m)
                .toFixed(1);
    }
}


/* ================================================================
   UPDATE DETECTION LIST
================================================================ */

function updateDetectionList(
    detections
) {

    if (!detectionList) {
        return;
    }


    if (
        !Array.isArray(detections) ||
        detections.length === 0
    ) {

        detectionList.innerHTML = `
            <div class="empty-detection">
                No objects detected.
            </div>
        `;

        return;
    }


    detectionList.innerHTML = "";


    detections.forEach(
        function(item, index) {

            /*
               Support different backend formats.
            */

            let name =
                item.name ??
                item.class_name ??
                item.label ??
                item.class ??
                "Unknown Object";


            let conf =
                item.confidence ??
                item.conf ??
                item.score ??
                0;


            const row =
                document.createElement(
                    "div"
                );

            row.className =
                "detection-item";


            row.innerHTML = `

                <div>

                    <span class="detection-number">
                        ${index + 1}.
                    </span>

                    <span class="detection-name">
                        ${escapeHtml(name)}
                    </span>

                </div>

                <div class="detection-confidence">
                    ${formatConfidence(conf)}
                </div>

            `;


            detectionList.appendChild(
                row
            );
        }
    );
}


/* ================================================================
   HTML ESCAPE
================================================================ */

function escapeHtml(value) {

    return String(value)
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}


/* ================================================================
   GET RESULT IMAGE
================================================================ */

function getResultImage(data) {

    /*
       Support common backend names.
    */

    return (
        data.result_image ||
        data.annotated_image ||
        data.output_image ||
        data.image ||
        data.result ||
        null
    );
}


/* ================================================================
   DETECTION
================================================================ */

if (detectButton) {

    detectButton.addEventListener(
        "click",
        async function() {

            if (!selectedFile) {

                showError(
                    "Please select a sonar image first."
                );

                return;
            }


            clearError();


            /*
               Disable button while processing.
            */

            detectButton.disabled =
                true;

            detectButton.textContent =
                "Detecting...";


            try {

                const formData =
                    new FormData();


                formData.append(
                    "file",
                    selectedFile
                );


                console.log(
                    "Sending image to /api/detect"
                );


                const response =
                    await fetch(
                        "/api/detect",
                        {
                            method: "POST",
                            body: formData
                        }
                    );


                /*
                   First check HTTP status.
                */

                if (!response.ok) {

                    const errorText =
                        await response.text();

                    throw new Error(
                        "Server error " +
                        response.status +
                        ": " +
                        errorText
                    );
                }


                const data =
                    await response.json();


                console.log(
                    "Detection response:",
                    data
                );


                if (
                    data.success === false
                ) {

                    throw new Error(
                        data.error ||
                        "Detection failed."
                    );
                }


                /* =================================================
                   RESULT IMAGE
                ================================================= */

                const outputImage =
                    getResultImage(data);


                if (outputImage) {

                    if (
                        typeof outputImage ===
                        "string"
                    ) {

                        /*
                           If backend already returns
                           data:image/... keep it.
                        */

                        resultImage.src =
                            outputImage;
                    }


                    resultImage.classList.remove(
                        "hidden"
                    );


                    if (resultPlaceholder) {

                        resultPlaceholder.classList.add(
                            "hidden"
                        );
                    }
                }


                /* =================================================
                   DETECTIONS
                ================================================= */

                const detections =
                    data.detections || [];


                updateDetectionList(
                    detections
                );


                /* =================================================
                   OBJECT COUNT
                ================================================= */

                if (objectCount) {

                    objectCount.textContent =
                        detections.length;
                }


                /* =================================================
                   INFERENCE TIME
                ================================================= */

                if (inferenceTime) {

                    inferenceTime.textContent =
                        formatInferenceTime(
                            data.inference_time_ms
                        );
                }


                /* =================================================
                   CONFIDENCE
                ================================================= */

                let averageConfidence =
                    data.average_confidence;


                /*
                   If backend doesn't send average
                   confidence, calculate it.
                */

                if (
                    averageConfidence ===
                    undefined &&
                    detections.length > 0
                ) {

                    let total = 0;


                    detections.forEach(
                        function(item) {

                            total += Number(
                                item.confidence ??
                                item.conf ??
                                item.score ??
                                0
                            );
                        }
                    );


                    averageConfidence =
                        total /
                        detections.length;
                }


                if (confidence) {

                    confidence.textContent =
                        formatConfidence(
                            averageConfidence
                        );
                }


                /* =================================================
                   GPS + DEPTH
                ================================================= */

                /*
                   Most important part.

                   Backend should return:

                   "survey": {
                       "latitude": ...,
                       "longitude": ...,
                       "depth_m": ...
                   }
                */

                updateSurveyData(
                    data.survey
                );


            } catch (error) {

                console.error(
                    "Detection error:",
                    error
                );


                showError(
                    error.message ||
                    "Unable to process image."
                );

            } finally {

                detectButton.disabled =
                    !selectedFile;

                detectButton.textContent =
                    "Detect Objects";
            }

        }
    );
}


/* ================================================================
   INITIAL STATE
================================================================ */

resetResults();


console.log(
    "Marine AI frontend loaded."
);