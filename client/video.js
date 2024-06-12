// Import workers
const plottingWorker = new Worker("../client/plotting_worker.js");
const framesWorker = new Worker("../client/frames_worker.js");

// Cache DOM elements
const videoCanvasData = document.querySelector(".video__canvasData");
const videoPlayerContainer = document.querySelector(".video__video-player-container");
const videoRecordToggle = document.querySelector(".video__record-toggle");
const videoRecordToggleCloseBtn = document.querySelector(".video__record-toggle-close-btn");
const videoRecordToggleBack = document.querySelector(".video__record-toggle-back-btn");
const videoRecordToggleSubcontainer = document.querySelector(".video__record-toggle-subcontainer");
const videoLocalRecord = document.querySelector(".video__local-record");
const videoExternalRecord = document.querySelector(".video__external-record");
const videoRecordCodeContainer = document.querySelector(".video__record-code-container");
const videoRecordCode = document.querySelector(".video__record-code");
const videoRecordBtn = document.querySelector(".video__record-btn");
const videoStopRecordingBtn = document.querySelector(".video__stop-recording-btn");
const videoStartTransmisionBtn = document.querySelector(".video__start-transmission-btn");
const videoSelectSide = document.querySelector(".video__select-side");
const videoSelectJoint = document.querySelector(".video__select-joint");
const videoDownloadCSV = document.querySelector(".video__download-csv");
const videoCodeToggle = document.querySelector(".video__code-toggle");
const videoCloseCodeToggle = document.querySelector(".video__code-toggle-close-btn");
const videoSubmitCode = document.querySelector(".video__submit-code");
const videoInputCode = document.querySelector(".video__code-input");
const videoPlayer = document.querySelector(".video__video-player");
const mainImage = document.querySelector(".video__mainImage");
const videoPlotAngle = document.querySelector(".video__plot-angle");
const videoPlotX = document.querySelector(".video__plot-x").transferControlToOffscreen();
const videoPlotY = document.querySelector(".video__plot-y").transferControlToOffscreen();
const videoPlotAngleOffScreen = videoPlotAngle.transferControlToOffscreen();

let videoWidth = videoPlayerContainer.clientWidth;
let videoHeight = videoPlayerContainer.clientHeight;
let stream, videoStream, track, imageCapture, frameInterval;
let user_id = null;
let type = "desktop";
let isRecording = false;
let code = generateCode();
let side = "Izquierdo";
let jointName = "";
let startTime = 0;

// Initialize offscreen canvas
const offscreenCanvas = videoCanvasData.transferControlToOffscreen();

// Define joint triplets for angles
const triplets = {
    "Glenohumeral": {"Izquierdo": "left-shoulder", "Derecho": "right-shoulder"},
    "Humeroulnar": {"Izquierdo": "left-elbow", "Derecho": "right-elbow"},
    "Coxofemoral": {"Izquierdo": "left-hip", "Derecho": "right-hip"},
    "Tibiofemoral": {"Izquierdo": "left-knee", "Derecho": "right-knee"}
};

// Set constraints for video
const constraints = {
    video: {
        frameRate: 60,
        ...(window.innerWidth <= 720 ? { facingMode: "environment" } : { width: videoWidth, height: videoHeight })
    }
};

// Initialize WebSocket
let socket = new WebSocket(`${resolveScheme()}${getCurrentURL().host}${getCurrentURL().pathname}`);
socket.onopen = () => console.log("New WebSocket Session Initiated");
socket.onerror = error => console.log(error);
socket.onmessage = handleSocketMessage;
socket.onclose = () => console.log("WebSocket Session Terminated");
window.onbeforeunload = () => {
    socket.send(JSON.stringify({"id": user_id, "message":"disconnect", "data": 0}));
    socket.close();
};

// Workers' message handlers
framesWorker.onmessage = handleFramesWorkerMessage;
plottingWorker.onmessage = handlePlottingWorkerMessage;

// Event listeners
videoRecordBtn.addEventListener("click", () => videoRecordToggle.style.display = "flex");
videoRecordToggle.addEventListener("click", handleVideoRecordToggleClick);
videoStopRecordingBtn.addEventListener("click", stopRecording);
videoStartTransmisionBtn.addEventListener("click", () => videoCodeToggle.style.display = "block");
videoCodeToggle.addEventListener("click", handleVideoCodeToggleClick);
videoSelectSide.onchange = event => side = event.target.value || side;
videoSelectJoint.onchange = event => jointName = event.target.value || jointName;

// Generate a random code (string) of exactly 5 characters
function generateCode() {
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    return Array.from({length: 5}, () => characters.charAt(Math.floor(Math.random() * characters.length))).join('');
}

// Function to record the current time in seconds
function recordFrameTimestamp(startTime) {
    let currentTime = new Date().getTime();
    return (currentTime - startTime)/1000;
}

// Handle messages from frames worker
function handleFramesWorkerMessage(event) {
    if (event.data && event.data.blob) {
        socket.send(event.data.blob);
    }
}

// Handle messages from plotting worker
function handlePlottingWorkerMessage(MessageEvent) {
    let workerData = MessageEvent.data;
    if (workerData.csvUrl) {
        videoDownloadCSV.innerText = "Descargar .CSV";
        videoDownloadCSV.setAttribute("href", workerData.csvUrl);
        videoDownloadCSV.setAttribute("download", "landmark_data.csv");
        videoDownloadCSV.style.backgroundColor = "hsl(100deg 65% 25% / 1)";
    }
}

// Handle messages from WebSocket
function handleSocketMessage(MessageEvent) {
    if (MessageEvent.data.substring(0, 5) === "iVBOR") {
        if (!isRecording) return;
        mainImage.src = `data:image/png;base64,${MessageEvent.data}`;
    } else {
        let jsonEvent = JSON.parse(MessageEvent.data);
        let { id, message, data } = jsonEvent;

        switch (message) {
            case "user-id":
                user_id = id;
                console.log("Message data: ", MessageEvent.data);
                if (window.innerWidth <= 720) type = "mobile";
                socket.send(JSON.stringify({"id": user_id, "message": "set-user-type", "data": type}));
                break;
            case "invalid-code":
                console.log("Message data: ", MessageEvent.data);
                window.alert("Invalid Code.");
                break;
            case "landmark-data":
                if (!isRecording) return;
                processLandmarkData(data);
                break;
        }
    }
}

// Process landmark data received from WebSocket
function processLandmarkData(data) {
    let { joint, medial, lateral } = data;
    let angle = Math.abs((Math.atan2(lateral[1] - joint[1], lateral[0] - joint[0])
        - Math.atan2(medial[1] - joint[1], medial[0] - joint[0])) * (180 / Math.PI));
    if (angle < 0) {angle =-angle}
    if (joint[1] > 1) {joint[1] = 0}
    if (medial[1] > 1) {medial[1] = 0}
    if (lateral[1] > 1) {lateral[1] = 0}
    let dataToWorker = {
        time: recordFrameTimestamp(startTime),
        angle_value: parseInt(angle),
        joint_value: { x: joint[0], y: joint[1] },
        medial_value: { x: medial[0], y: medial[1] },
        lateral_value: { x: lateral[0], y: lateral[1] }
    };
    plottingWorker.postMessage({ data: dataToWorker });
}

// Check if selection of joint and side is valid
function checkSelection() {
    if (!jointName) {
        window.alert("Selecciona una Articulación");
        return true;
    }
    if (!side) {
        window.alert("Selecciona una Lado");
        return true;
    }
    return false;
}

// Initialize web camera for video stream
async function initWebCamera(video, constraints) {
    try {
        isRecording = true;
        videoDownloadCSV.innerText = "Guardando Datos";
        videoDownloadCSV.style.backgroundColor = "hsl(300deg 50% 15% / 1)";
        stream = await navigator.mediaDevices.getUserMedia(constraints);
        video.srcObject = stream;
        framesWorker.postMessage({
            size: { width: videoWidth, height: videoHeight },
            offscreenCanvas: offscreenCanvas
        }, [offscreenCanvas]);
        return stream;
    } catch (e) {
        console.error(e);
    }
}

// Start recording video stream
async function startRecording(video, stream) {
    if (!video.srcObject) video.srcObject = await stream;
    videoStream = videoPlayer.captureStream();
    [track] = videoStream.getVideoTracks();
    imageCapture = new ImageCapture(track);

    if (frameInterval) clearInterval(frameInterval);
    frameInterval = setInterval(frameFromCamera, 190); // from 170 to 190, ideal range
}

// Capture frame from camera at intervals
async function frameFromCamera() {
    try {
        if (!isRecording) return;
        const imageBitmap = await imageCapture.grabFrame();
        framesWorker.postMessage({ imageBitmap }, [imageBitmap]);
    } catch (e) {
        console.error(e);
    }
}

// Stop recording video stream
function stopRecording() {
    if (!isRecording) return;
    isRecording = false;
    clearInterval(frameInterval);
    try {
        stream.getTracks().forEach(track => track.stop());
    } catch (error) {
        console.error(error);
    }
    socket.send(JSON.stringify({
        "id": user_id,
        "message": "stop-recording",
        "data": code,
    }));
    plottingWorker.postMessage({ message: "stop-recording" });
}

// Handle click events on video record toggle
function handleVideoRecordToggleClick(event) {
    const target = event.target;

    if (target === videoRecordToggleCloseBtn) {
        videoRecordToggle.style.display = "none";
        videoRecordToggleSubcontainer.style.display = "flex";
        videoRecordCodeContainer.style.display = "none";
        videoRecordToggleBack.style.display = "none";

    } else if (target === videoLocalRecord) {
        if (checkSelection()) return;
        videoRecordToggle.style.display = "none";
        startRecording(videoPlayer, initWebCamera(videoPlayer, constraints));
        startTime = new Date().getTime();
        const triplet = triplets[jointName][side];
        socket.send(JSON.stringify({"id": user_id, "message": "set-triplet", "data": triplet}));
        socket.send(JSON.stringify({"id": user_id, "message": "start-recording", "data": true}));

    } else if (target === videoExternalRecord) {
        if (checkSelection()) return;
        videoRecordToggleSubcontainer.style.display = "none";
        videoRecordCodeContainer.style.display = "flex";
        videoRecordToggleBack.style.display = "block";
        videoRecordCode.innerHTML = code;
        socket.send(JSON.stringify({"id": user_id, "message": "set-code", "data": code}));
        plottingWorker.postMessage({ message: "start-transmission" });

    } else if (target === videoRecordToggleBack) {
        videoRecordToggleSubcontainer.style.display = "flex";
        videoRecordCodeContainer.style.display = "none";
        videoRecordToggleBack.style.display = "none";
    }
}

// Handle click events on video code toggle
function handleVideoCodeToggleClick(event) {
    const target = event.target;
    if (target === videoCloseCodeToggle) {
        videoCodeToggle.style.display = "none";
    } else if (target === videoSubmitCode) {
        if (videoInputCode.value) {
            videoCodeToggle.style.display = "none";
            socket.send(JSON.stringify({"id": user_id, "message": "start-transmission", "data": videoInputCode.value}));
            socket.send(JSON.stringify({"id": user_id, "message": "start-recording", "data": true}));
            startRecording(videoPlayer, initWebCamera(videoPlayer, constraints));
            startTime = new Date().getTime();
            plottingWorker.postMessage({ message: "start-recording" });
        } else {
            window.alert("Por favor ingresar código.");
        }
    }
}

// Initialize plotting worker
plottingWorker.postMessage({ size: { width: videoPlotAngle.clientWidth, height: videoPlotAngle.clientHeight } });
plottingWorker.postMessage({ canvas: videoPlotAngleOffScreen, message: "angle" }, [videoPlotAngleOffScreen]);
plottingWorker.postMessage({ canvas: videoPlotX, message: "xPlot" }, [videoPlotX]);
plottingWorker.postMessage({ canvas: videoPlotY, message: "yPlot" }, [videoPlotY]);

videoDownloadCSV.setAttribute("href", "javascript:void(0)");
