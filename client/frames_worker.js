let canvas;
let context;
let width;
let height;

addEventListener('message', event => {
    if (event.data.size) {
        width = event.data.size.width;
        height = event.data.size.height;
    }
    if (event.data.offscreenCanvas) {
        canvas = event.data.offscreenCanvas;
        canvas.width = width;
        canvas.height = height;
        context = canvas.getContext('2d', { willReadFrequently: true });
    }
    if (event.data.imageBitmap && context) {
        context.drawImage(event.data.imageBitmap, 0, 0, width, height);
        canvas.convertToBlob()
            .then(blob => {
                self.postMessage({ blob });
            })
            .catch(err => {
                console.error('Error converting canvas to blob:', err);
            });
    }
});


