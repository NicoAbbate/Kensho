// Listens for the content script to send a message
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "setText") {
        // Store the text in local storage so the popup can get it
        chrome.storage.local.set({ selectedText: request.text });
    }
});

// This function creates the right-click menu item
function setupContextMenu() {
    chrome.contextMenus.create({
        id: "kensho-explain",
        title: "Explain with Kenshō",
        contexts: ["selection"]
    });
}

// Set up the menu when the extension is installed or updated
chrome.runtime.onInstalled.addListener(() => {
    setupContextMenu();
});

// Listen for a click on our menu item
chrome.contextMenus.onClicked.addListener((info, tab) => {
    if (info.menuItemId === "kensho-explain") {
        // When clicked, we store the selected text
        chrome.storage.local.set({ selectedText: info.selectionText }, () => {
            // Then we can optionally open the popup or perform another action.
            // For now, storing it is enough for the popup to pick it up.
        });
    }
});