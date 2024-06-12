// Define of window variable, necessary for scripts import
const window = self;
importScripts("https://cdnjs.cloudflare.com/ajax/libs/Chart.js/3.0.0-beta/chart.min.js");
importScripts("https://cdnjs.cloudflare.com/ajax/libs/json2csv/5.0.7/json2csv.umd.js");

// Transform the landmark data object format from Object to Array
function transformLandmarkData(landmarkData) {
    let transformedData = [];

    const keys = Object.keys(landmarkData);
    const length = landmarkData[keys[0]].length;

    for (let i = 0; i < length; i++) {
        let dataPoint = {};
        keys.forEach(key => {
            dataPoint[key] = landmarkData[key][i];
        });
        transformedData.push(dataPoint);
    }

    return transformedData;
}


const {Parser} = json2csv;
let charts = new Array();
canvases = new Object();

// Data
let landmarkData = {
    "time_stamps": new Array(),
    "angle": new Array(),
    "joint_x": new Array(),
    "joint_y": new Array(),
    "medial_x": new Array(),
    "medial_y": new Array(),
    "lateral_x": new Array(),
    "lateral_y": new Array(),
}


const fields = ["time_stamps", "angle", "joint_x", "joint_y", "medial_x", "medial_y", "lateral_x", "lateral_y"];
const json2csvParser = new Parser({ fields, defaultValue : "NA", includeEmptyRows : true , delimiter: ","});

// Settings for Chart.js
let configuration = {
    "angle": {
        type: "line",
        options: {
            title: {
                display: true,
                text: "Ángulo vs Tiempo (s)",
                font: {
                    color: "hsl(0deg 0% 0% / 1)",
                },
                padding: {
                    top: 2,
                    bottom: 5,
                }
            },
            legend: {
                display: false
            },
            scales: {
                y: {
                    suggestedMin: 0,
                    suggestedMax: 180,
                    ticks: {
                        font: {
                            color: "hsl(0deg 0% 0% / 1)",
                        },
                    }
                }
            },
            devicePixelRatio: 1.35,
            responsive: true,
            elements: {
                point: {
                    radius: 0,
                },
                line: {
                    fill: false,
                },
            },
        },
        data: {
            labels: landmarkData["time_stamps"],
            datasets: [
                {
                    data: landmarkData["angle"],
                    borderColor: "rgb(40, 220, 40)",
                    lineTension: 0.5,
                }
            ]
        }
    },
    "xPlot": {
        type: "line",
        options: {
            title: {
                display: true,
                text: "Posición X (pixel) vs Tiempo (s)",
                color: "hsl(0deg 0% 15% / 1)",
                font: {
                    color: "hsl(0deg 0% 0% / 1)",
                },
            },
            legend: {
                display: false
            },
            scales: {
                y: {
                    suggestedMin: 0,
                    suggestedMax: 1,
                    ticks: {
                        font: {
                            color: "hsl(0deg 0% 0% / 1)",
                        },
                    }
                }
            },
            devicePixelRatio: 1.35,
            responsive: true,
            elements: {
                point: {
                    radius: 0,
                },
                line: {
                    fill: false,
                },
            },
        },
        data: {
            labels: landmarkData["time_stamps"],
            datasets: [
                {
                    data: landmarkData["medial_x"],
                    borderColor: "rgb(40, 40, 220)",
                    lineTension: 0.5,
                },
                {
                    data: landmarkData["lateral_x"],
                    borderColor: "rgb(220, 40, 40)",
                    lineTension: 0.5,
                },
            ]
        }
    },
    "yPlot": {
        type: "line",
        options: {
            title: {
                display: true,
                text: "Posición Y (pixel) vs Tiempo (s)",
                color: "hsl(0deg 0% 15% / 1)",
                font: {
                    color: "hsl(0deg 0% 0% / 1)",
                },
            },
            legend: {
                display: false
            },
            scales: {
                y: {
                    suggestedMin: 0,
                    suggestedMax: 1,
                    ticks: {
                        font: {
                            color: "hsl(0deg 0% 0% / 1)",
                        },
                    }
                }
            },
            devicePixelRatio: 1.35,
            responsive: true,
            elements: {
                point: {
                    radius: 0,
                },
                line: {
                    fill: false,
                },
            },
        },
        data: {
            labels: landmarkData["time_stamps"],
            datasets: [
                {
                    data: landmarkData["medial_y"],
                    borderColor: "rgb(40, 40, 220)",
                    lineTension: 0.5,
                },
                {
                    data: landmarkData["lateral_y"],
                    borderColor: "rgb(220, 40, 40)",
                    lineTension: 0.5,
                },
                
            ]
        }
    },
}

addEventListener('message', MessageEvent => {
    let data = MessageEvent.data;
    if (data.message) {
        if (data.message === "stop-recording") {
            const transformedData = transformLandmarkData(landmarkData);
            const csvData = json2csvParser.parse(transformedData);
            const blob = new Blob([csvData], { type: 'text/csv' });
            const url = URL.createObjectURL(blob);
            self.postMessage({ csvUrl: url });
            // Reset landmark data
            landmarkData = {
                "time_stamps": new Array(),
                "angle": new Array(),
                "joint_x": new Array(),
                "joint_y": new Array(),
                "medial_x": new Array(),
                "medial_y": new Array(),
                "lateral_x": new Array(),
                "lateral_y": new Array(),
            };
        }
    }
    if (data.size) {
        width = data.size.width;
        height = data.size.height;
    }
    if (data.canvas) {
        if (data.message) {
            canvases[data.message] = data.canvas;
            canvases[data.message].width = width;
            canvases[data.message].height = height;
            let chart = new Chart(
                canvases[data.message].getContext('2d', { willReadFrequently: true }),
                configuration[data.message]
            );
            charts.push(chart);
        }
    }
    if (data.data) {
        landmarkData["time_stamps"].push(data.data.time*1);
        landmarkData["angle"].push(data.data.angle_value*1);
        landmarkData["joint_x"].push(data.data.joint_value.x*1);
        landmarkData["joint_y"].push(data.data.joint_value.y*1);
        landmarkData["medial_x"].push(data.data.medial_value.x*1);
        landmarkData["medial_y"].push(data.data.medial_value.y*1);
        landmarkData["lateral_x"].push(data.data.lateral_value.x*1);
        landmarkData["lateral_y"].push(data.data.lateral_value.y*1);
        charts.forEach(chart => {
            chart.update();
        });
    }
});
