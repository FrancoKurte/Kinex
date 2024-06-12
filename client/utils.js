// CSFR Token for django
const csrfToken = document.head.querySelector("[name~=csrf_token][content]").content;

// Get the URL of the current location
const getCurrentURL = function () {
    const url = new URL(window.location.href);
    return url;
}

// Decide if ws or wss protocol will be used according to the current protocol
const resolveScheme = function () {
    const url = getCurrentURL();
    if(url.protocol === "http:") {
        return 'ws:'
    } else if (url.protocol === "https:"){
        return 'wss:'
    }
}
