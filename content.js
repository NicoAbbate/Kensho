document.addEventListener('mouseup', () => {
    // Check if the extension context is still valid before proceeding.
    // chrome.runtime.id will be undefined if the extension has been reloaded.
    if (!chrome.runtime?.id) {
        return;
    }

    const selectedText = window.getSelection().toString().trim();
    if (selectedText.length > 0) {
        chrome.runtime.sendMessage({ action: "setText", text: selectedText });
    }
});