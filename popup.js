document.addEventListener('DOMContentLoaded', () => {
    const textInput = document.getElementById('text-input');
    const primaryActions = document.getElementById('primary-actions');
    const secondaryActions = document.getElementById('secondary-actions');
    const moreBtn = document.getElementById('more-btn');
    const resultsContent = document.getElementById('results-content');
    const copyButton = document.getElementById('copy-button');
    const translateBtn = document.getElementById('translate-btn');
    const langModal = document.getElementById('language-modal');
    const langSelect = document.getElementById('language-select');
    const translateConfirmBtn = document.getElementById('translate-confirm-btn');
    const translateCancelBtn = document.getElementById('translate-cancel-btn');

    const serverUrl = 'https://kensho-backend.onrender.com/api/process'; // <-- PASTE YOUR URL HERE

    function sendRequest(action) {
        const textToProcess = textInput.value.trim();
        if (!textToProcess) {
            resultsContent.innerHTML = `<p>Please select or enter some text first.</p>`;
            return;
        }
        document.querySelectorAll('.action-btn').forEach(btn => btn.classList.remove('active'));
        const activeBtn = document.querySelector(`.action-btn[data-action='${action}']`) || translateBtn;
        if(activeBtn) activeBtn.classList.add('active');
        resultsContent.innerHTML = `<p>Kenshō is thinking...</p>`;
        copyButton.classList.add('hidden');

        fetch(serverUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ text: textToProcess, action: action })
        })
        .then(res => res.ok ? res.json() : res.json().then(e => Promise.reject(e)))
        .then(data => {
            if (data.result) {
                resultsContent.innerHTML = `<p>${data.result.replace(/\n/g, '<br>')}</p>`;
                copyButton.classList.remove('hidden');
            } else { throw new Error(data.error || "An unknown error occurred."); }
        })
        .catch(error => {
            console.error('Fetch Error:', error);
            resultsContent.innerHTML = `<p><strong>An error occurred.</strong><br><span style="color: #aaa;">${error.message}</span></p>`;
            copyButton.classList.add('hidden');
        });
    }

    chrome.storage.local.get(['selectedText'], (result) => {
        if (result.selectedText && result.selectedText.trim() !== '') {
            textInput.value = result.selectedText;
            chrome.storage.local.set({ selectedText: '' });
        }
    });
    resultsContent.innerHTML = `<p>Select an action to begin.</p>`;

    primaryActions.addEventListener('click', e => { if (e.target.dataset.action) sendRequest(e.target.dataset.action); });
    secondaryActions.addEventListener('click', e => { if (e.target.dataset.action) sendRequest(e.target.dataset.action); });
    moreBtn.addEventListener('click', () => {
        secondaryActions.classList.toggle('hidden');
        moreBtn.classList.toggle('active');
        moreBtn.textContent = secondaryActions.classList.contains('hidden') ? 'More...' : 'Less';
    });
    translateBtn.addEventListener('click', () => langModal.classList.remove('hidden'));
    translateCancelBtn.addEventListener('click', () => langModal.classList.add('hidden'));
    translateConfirmBtn.addEventListener('click', () => {
        const langCode = langSelect.value;
        const action = `translate-${langCode}`;
        sendRequest(action);
        langModal.classList.add('hidden');
    });
    copyButton.addEventListener('click', () => {
        navigator.clipboard.writeText(resultsContent.innerText).then(() => {
            copyButton.innerText = 'Copied!';
            setTimeout(() => { copyButton.innerText = '📋'; }, 1500);
        });
    });
});