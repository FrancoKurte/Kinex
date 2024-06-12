console.log(`Successfully connected to ${getCurrentURL()}`);

// Create an element with an HTML template written inside.
const createElementFromHTML = function(element, template) {
    const newElement = document.createElement(element);
    newElement.classList.add('img-pro__box-container');
    newElement.innerHTML = template;
    return newElement;
}

// Calculate the new dimensions for the canvas to draw the image
const drawImageOnCanvas = function (image, canvas) {
    const context = canvas.getContext('2d');
    canvas.width = image.width;
    canvas.height = image.height;
    context.drawImage(image, 0, 0);
}

// Request handling using fetch, for actual the image processing
const imageRequest = async function (url, file, purpose) {
    const formData = new FormData();
    formData.append('file', file);

    try {
        const response = await fetch(url, {
            method: "POST",
            body: formData,
            headers: {
                'X-CSRFToken': csrfToken,
                'x-post-purpose': purpose,
            },
            credentials: "same-origin",
        });

        if (response.ok) {
            const jsonResponse = await response.json();
            return jsonResponse;
        } else {
            console.error("Error processing image:", await response.text());
        }
    } catch (error) {
        console.error("Error sending request:", error);
    }
};

const templates = {
    // Template for the box container of a saved image.
    imgProBoxContainer: `
        <button class="img-pro__remove-box-btn">x</button>
        <div class="img-pro__box-img-container">
            <img class="img-pro__box-img" alt="image">
        </div>
        <div class="img-pro__box-details">
            <h2 class="img-pro__box-title"></h2>
        </div>`,
}

const imgProClearContent = document.querySelector(".img-pro__delete-image-btn");
const imgProVisualizationOriginal = document.querySelector(".img-pro__visualization-original");
const imgProVisualizationProcessed = document.querySelector(".img-pro__visualization-processed");
const imgProBoxes = document.querySelector('.img-pro__boxes');
const imgProAddBoxButton = document.querySelector(".img-pro__add-box-btn");
const imgProStart = document.querySelector(".img-pro__start-btn");
const imgProDownloadDataButton = document.querySelector(".img-pro__download-data-btn");
const resultsContainer = document.querySelector(".img-pro__numerical-results");
const imgProCanvas = {
    general: document.querySelector(".img-pro__canvas"),
    original: document.querySelector(".img-pro__canvas-original"),
    processed: document.querySelector(".img-pro__canvas-processed"),
}
const imgProCanvasButtons = new Array(
    document.querySelector('.img-pro__upload-label'),
    document.querySelector(".img-pro__img-uploader"),
    document.querySelector(".img-pro__processing-btn")
)
const postPurposes = {
    processing: "image-processing",
    save: "save-image",
}

let uploadedFile = false;
let imgProNumberOfBoxes = new Array();
let savedImagesData = [];

const triplets = {
    "Glenohumeral": {"Izquierdo": "left-shoulder", "Derecho": "right-shoulder"},
    "Humeroulnar": {"Izquierdo": "left-elbow", "Derecho": "right-elbow"},
    "Coxofemoral": {"Izquierdo": "left-hip", "Derecho": "right-hip"},
    "Tibiofemoral": {"Izquierdo": "left-knee", "Derecho": "right-knee"}
};

imgProClearContent.addEventListener("click", () => {
    uploadedFile = false;
    imgProCanvasButtons[1].value = null;
    imgProCanvasButtons.forEach((btn) => {btn.style.display = 'block';})
    Object.entries(imgProCanvas).forEach(([key, value]) => {
        value.getContext("2d").clearRect(0,0, value.width, value.height);
    })
    imgProCanvasButtons[1].disabled="";
    let resultsTable = `
    <div class="img-pro__numerical-results">
        <h3 class="img-pro__data-title">Resultados</h3>
        <table class='img-pro__results-table'><tr><th>Joint</th><th>Angle</th></tr>
    </div>`;
    resultsContainer.innerHTML = resultsTable;
})

// Manage the uploaded image on the visualization UI ('canvas.original')
imgProVisualizationOriginal.addEventListener("click", (event) =>{
    const target = event.target;
    if(target.matches(".img-pro__img-uploader")) {
        target.addEventListener("change", () => {
            const image = new Image();
            uploadedFile = target.files;
            try {image.src = URL.createObjectURL(uploadedFile[0]);}
            catch{console.log("Failed to upload a file.")}
            image.onload = () => drawImageOnCanvas(image, imgProCanvas.original);
            imgProCanvasButtons.slice(0, 1).forEach((btn) => {btn.style.display = 'none';})
            target.disabled="disabled";
        })
    }
})

// Manage the processed image on the visualization UI. ('canvas.processed')
imgProVisualizationProcessed.addEventListener("click", async (event) => {
    const target = event.target;
    if(target.matches(".img-pro__processing-btn") && uploadedFile) {
        imgProCanvasButtons.forEach((btn) => {btn.style.display = 'none';})
        const processedData = await imageRequest(
            getCurrentURL(),
            uploadedFile[0],
            postPurposes.processing
        );
        if (processedData) {
            const processedImage = new Image();
            processedImage.src = 'data:image/png;base64,' + processedData.image;
            processedImage.onload = () => drawImageOnCanvas(
                processedImage,
                imgProCanvas.processed
            );

            // Display numerical results
            let resultsTable = `
                <h3 class="img-pro__table-title">Resultados</h3>
                <table class="img-pro__results-table">
                <tr class="img-pro__table-data"><th class="table-header">Joint</th><th class="table-header">Angle</th></tr>`
            for (const [joint, data] of Object.entries(processedData.angles)) {
                const jointName = Object.keys(triplets).find(triplet => Object.values(triplets[triplet]).includes(joint));
                const jointSide = Object.keys(triplets[jointName]).find(side => triplets[jointName][side] === joint);
                resultsTable += `<tr class="table-row"><td>${jointName} (${jointSide})</td><td>${data.angle.toFixed(2)}</td></tr>`;
            }
            resultsTable += `</table>
            <style>
            .table-header:nth-child(2) {
                text-align: left;
            }
            </style>`;
            resultsContainer.innerHTML = resultsTable;
        }
    }
})

// If button 'Add image' is clicked, a new box is created
imgProAddBoxButton.addEventListener("click", () => {
    if (imgProCanvas.processed.width > 0) {
        const newBox = createElementFromHTML('div', templates.imgProBoxContainer);
        imgProBoxes.append(newBox);
        const boxImg = newBox.querySelector('.img-pro__box-img');
        boxImg.src = imgProCanvas.processed.toDataURL();
        const angles = {}; // Store angles with triplet names
        const resultsRows = document.querySelectorAll(".img-pro__numerical-results table tr");
        resultsRows.forEach((row, index) => {
            if (index > 0) { // Skip header row
                const joint = row.cells[0].textContent;
                const angle = parseFloat(row.cells[1].textContent);
                angles[joint] = angle;
            }
        });
        savedImagesData.push({ image: boxImg.src, angles });
        imgProNumberOfBoxes.push(imgProNumberOfBoxes.length + 1);
    }
});

// Download Data Button
imgProDownloadDataButton.addEventListener("click", () => {
    const zip = new JSZip();
    const json2csvParser = new json2csv.Parser();

    savedImagesData.forEach((data, index) => {
        const base64Data = data.image.split(',')[1];
        const imageBlob = atob(base64Data);
        const arrayBuffer = new ArrayBuffer(imageBlob.length);
        const uintArray = new Uint8Array(arrayBuffer);
        for (let i = 0; i < imageBlob.length; i++) {
            uintArray[i] = imageBlob.charCodeAt(i);
        }
        zip.file(`image_${index + 1}.png`, arrayBuffer);

        const csv = json2csvParser.parse(Object.entries(data.angles).map(([joint, angle]) => ({ Joint: joint, Angle: angle })));
        zip.file(`angles_${index + 1}.csv`, csv);
    });

    zip.generateAsync({ type: "blob" }).then(function(content) {
        saveAs(content, "images_and_angles.zip");
    });
});

// Set of listeners for events occurring inside the boxes container
imgProBoxes.addEventListener("click", (event) => {
    let target = event.target;

    // Delete the target box if the 'X' button is clicked
    if(target.matches(".img-pro__remove-box-btn")) {
        const index = Array.from(imgProBoxes.children).indexOf(target.parentElement);
        savedImagesData.splice(index, 1);
        target.parentElement.remove();
        imgProNumberOfBoxes.splice(-1,1);
    }
});

// Draw available created boxes 
for (i in imgProNumberOfBoxes){
    imgProBoxes.append(createElementFromHTML('div', templates.imgProBoxContainer));
}
