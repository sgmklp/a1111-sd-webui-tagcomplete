var editMode = 1;
var resultCount = 0;
var modeCount = 2;
var acActive = true;
var styleAdded = false;
var hideBlocked = false;
var acConfig = null;
var selectedTag = null;
var wildcards = {};
var wildcardFiles = [];
var embeddings = [];
var classObjectList = [];
var classColorList = [];
var allTags = [];
var results = [];
var tagWord = "";

// Style for new elements. Gets appended to the Gradio root.
let autocompleteCSS_dark = `
    .autocompleteResults {
        position: absolute;
        z-index: 999;
        margin: 5px 0 0 0;
        background-color: #0b0f19 !important;
        border: 1px solid #4b5563 !important;
        border-radius: 12px !important;
        overflow-y: auto;
    }
    .autocompleteResultsList > li:nth-child(odd) {
        background-color: #111827;
    }
    .autocompleteResultsList > li {
        list-style-type: none;
        padding: 10px;
        cursor: pointer;
    }
    .autocompleteResultsList > li:hover {
        background-color: #1f2937;
    }
    .autocompleteResultsList > li.selected {
        background-color: #374151;
    }
`;
let autocompleteCSS_light = `
    .autocompleteResults {
        position: absolute;
        z-index: 999;
        margin: 5px 0 0 0;
        background-color: #ffffff !important;
        border: 1.5px solid #e5e7eb !important;
        border-radius: 12px !important;
        overflow-y: auto;
    }
    .autocompleteResultsList > li:nth-child(odd) {
        background-color: #f9fafb;
    }
    .autocompleteResultsList > li {
        list-style-type: none;
        padding: 10px;
        cursor: pointer;
    }
    .autocompleteResultsList > li:hover {
        background-color: #f5f6f8;
    }
    .autocompleteResultsList > li.selected {
        background-color: #e5e7eb;
    }
    `;

// Debounce function to prevent spamming the autocomplete function
var dbTimeOut;
const debounce = (func, wait = 300) => {
    return function (...args) {
        if (dbTimeOut) {
            clearTimeout(dbTimeOut);
        }

        dbTimeOut = setTimeout(() => {
            func.apply(this, args);
        }, wait);
    }
}

// Parse the CSV file into a 2D array. Doesn't use regex, so it is very lightweight.
function parseCSV(str) {
    var arr = [];
    var quote = false;  // 'true' means we're inside a quoted field

    // Iterate over each character, keep track of current row and column (of the returned array)
    for (var row = 0, col = 0, c = 0; c < str.length; c++) {
        var cc = str[c], nc = str[c + 1];        // Current character, next character
        arr[row] = arr[row] || [];             // Create a new row if necessary
        arr[row][col] = arr[row][col] || '';   // Create a new column (start with empty string) if necessary

        // If the current character is a quotation mark, and we're inside a
        // quoted field, and the next character is also a quotation mark,
        // add a quotation mark to the current column and skip the next character
        if (cc == '"' && quote && nc == '"') { arr[row][col] += cc; ++c; continue; }

        // If it's just one quotation mark, begin/end quoted field
        if (cc == '"') { quote = !quote; continue; }

        // If it's a comma and we're not in a quoted field, move on to the next column
        if (cc == ',' && !quote) { ++col; continue; }

        // If it's a newline (CRLF) and we're not in a quoted field, skip the next character
        // and move on to the next row and move to column 0 of that new row
        if (cc == '\r' && nc == '\n' && !quote) { ++row; col = 0; ++c; continue; }

        // If it's a newline (LF or CR) and we're not in a quoted field,
        // move on to the next row and move to column 0 of that new row
        if (cc == '\n' && !quote) { ++row; col = 0; continue; }
        if (cc == '\r' && !quote) { ++row; col = 0; continue; }

        // Otherwise, append the current character to the current column
        arr[row][col] += cc;
    }
    return arr;
}

// Load file
function readFile(filePath) {
    let request = new XMLHttpRequest();
    request.open("GET", filePath, false);
    request.send(null);
    return request.responseText;
}

// Load CSV
function loadCSV(path) {
    let text = readFile(path);
    return parseCSV(text);
}


function findEditStart(text, cursorPos) {
    let i = null;
    switch (editMode) {
        case 0:
            for (i = cursorPos - 1; i > 0; i--) {
                if (text[i] === ',') {
                    break;
                }
            }
            break;
        case 1:
            for (i = cursorPos - 1; i > 0; i--) {
                if (text[i] === ' ' || text[i] === ',') {
                    break;
                }
            }
            while (i >= 0 && text[i] === ' ') {
                i--;
            }
            if (i !== 0) {
                i++;
            }
            break;
        default:
            break;
    }
    return i;
}

function findEditEnd(text, cursorPos) {
    let i = null;
    let length = text.length;
    switch (editMode) {
        case 0:
            for (i = cursorPos; i < length; i++) {
                if (text[i] === ',') {
                    break;
                }
            }
            break;
        case 1:
            for (i = cursorPos; i < length; i++) {
                if (text[i] === ' ' || text[i] === ',') {
                    break;
                }
            }
            while (i < length && text[i] === ' ') {
                i++;
            }
            if (i !== length && text[i] !== ',') {
                i--;
            }
            break;
        default:
            break;
    }
    return i;
}

// Get the identifier for the text area to differentiate between positive and negative
function getTextAreaIdentifier(textArea) {
    let txt2img_p = gradioApp().querySelector('#txt2img_prompt > label > textarea');
    let txt2img_n = gradioApp().querySelector('#txt2img_neg_prompt > label > textarea');
    let img2img_p = gradioApp().querySelector('#img2img_prompt > label > textarea');
    let img2img_n = gradioApp().querySelector('#img2img_neg_prompt > label > textarea');

    let modifier = "";
    switch (textArea) {
        case txt2img_p:
            modifier = ".txt2img.p";
            break;
        case txt2img_n:
            modifier = ".txt2img.n";
            break;
        case img2img_p:
            modifier = ".img2img.p";
            break;
        case img2img_n:
            modifier = ".img2img.n";
            break;
        default:
            break;
    }
    return modifier;
}

// Create the result list div and necessary styling
function createResultsDiv(textArea) {
    let resultsDiv = document.createElement("div");
    let resultsList = document.createElement('ul');

    let textAreaId = getTextAreaIdentifier(textArea);
    let typeClass = textAreaId.replaceAll(".", " ");

    resultsDiv.style.setProperty("max-height", acConfig.maxResults * 50 + "px");
    resultsDiv.setAttribute('class', `autocompleteResults ${typeClass}`);
    resultsList.setAttribute('class', 'autocompleteResultsList');
    resultsDiv.appendChild(resultsList);

    return resultsDiv;
}

// Create the checkbox to enable/disable autocomplete
function createConfigBar() {
    let configBar = document.createElement("div");
    let input = document.createElement("input");
    let span = document.createElement("span");
    let select = document.createElement("select");
    let tagMode = document.createElement("option");
    let wordMode = document.createElement("option");

    configBar.setAttribute('id', 'autoCompleteConfigBar');
    configBar.setAttribute('class', 'flex items-center text-gray-700 text-sm rounded-lg cursor-pointer dark:bg-transparent');
    input.setAttribute('type', 'checkbox');
    input.setAttribute('class', 'ml-2 gr-check-radio gr-checkbox')
    span.setAttribute('class', 'ml-2');
    select.setAttribute("class", 'ml-2 gr-box gr-input disabled:cursor-not-allowed');


    select.add(tagMode, null);
    select.add(wordMode, null);
    configBar.appendChild(select);
    configBar.appendChild(span);
    configBar.appendChild(input);

    span.textContent = "Enable Autocomplete";
    tagMode.textContent = "Tag Mode"
    wordMode.textContent = "Word Mode"
    input.checked = acActive;
    select.selectedIndex = editMode;

    return configBar;
}


// Show or hide the results div
function isVisible(textArea) {
    let textAreaId = getTextAreaIdentifier(textArea);
    let resultsDiv = gradioApp().querySelector('.autocompleteResults' + textAreaId);
    return resultsDiv.style.display === "block";
}
function showResults(textArea) {
    let textAreaId = getTextAreaIdentifier(textArea);
    let resultsDiv = gradioApp().querySelector('.autocompleteResults' + textAreaId);
    resultsDiv.style.display = "block";
}
function hideResults(textArea) {
    let textAreaId = getTextAreaIdentifier(textArea);
    let resultsDiv = gradioApp().querySelector('.autocompleteResults' + textAreaId);
    resultsDiv.style.display = "none";
    selectedTag = null;
}

function escapeRegExp(string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); // $& means the whole matched string
}

// On click, insert the tag into the prompt textbox with respect to the cursor position
function insertTextAtCursor(textArea, result) {
    let text = result[0];
    let tagType = result[1];
    var sanitizedText = text

    // Replace differently depending on if it's a tag or wildcard
    if (tagType === "wildcardFile") {
        sanitizedText = "__" + text.replace("Wildcards: ", "") + "__";
    } else if (tagType === "wildcardTag") {
        sanitizedText = text.replace(/^.*?: /g, "");
    } else if (tagType === "className") {
        sanitizedText = `>${text.replace("Class: ", "")}<`;
    } else if (tagType === "embedding") {
        sanitizedText = `<${text.replace(/^.*?: /g, "")}>`;
    } else {
        sanitizedText = acConfig.replaceUnderscores ? text.replaceAll("_", " ") : text;
    }

    if (acConfig.escapeParentheses) {
        sanitizedText = sanitizedText
            .replaceAll("(", "\\(")
            .replaceAll(")", "\\)")
            .replaceAll("[", "\\[")
            .replaceAll("]", "\\]");
    }

    // Edit prompt text
    var prompt = textArea.value;
    let cursorPos = textArea.selectionEnd;
    let editStart = findEditStart(prompt, cursorPos);
    let editEnd = findEditEnd(prompt, cursorPos);
    let optionalComma = "";
    if (editStart === null || editEnd === null) {
        return;
    }
    if (editStart !== 0) {
        switch (editMode) {
            case 0:
                optionalComma = ", ";
                break;
            case 1:
                optionalComma = " ";
                break;
            default:
                break;
        }
    }

    // Add back start
    textArea.value = prompt.substring(0, editStart) + optionalComma + sanitizedText + prompt.substring(editEnd);
    textArea.selectionStart = editStart + sanitizedText.length + optionalComma.length;
    textArea.selectionEnd = textArea.selectionStart;

    // Since we've modified a Gradio Textbox component manually, we need to simulate an `input` DOM event to ensure its
    // internal Svelte data binding remains in sync.
    textArea.dispatchEvent(new Event("input", { bubbles: true }));

    // Hide results after inserting
    if (tagType === "wildcardFile" || tagType === "className" || tagType.endsWith("+")) {
        // If it's a wildcard, we want to keep the results open so the user can select another wildcard
        hideBlocked = true;
        autocomplete(textArea, prompt, sanitizedText);
        setTimeout(() => { hideBlocked = false; }, 100);
    } else {
        setTimeout(() => { hideResults(textArea); }, 100); // Enable autocomplete
    }
}

function addResultsToList(textArea, results, resetList) {
    let textAreaId = getTextAreaIdentifier(textArea);
    let resultDiv = gradioApp().querySelector('.autocompleteResults' + textAreaId);
    let resultsList = resultDiv.querySelector('ul');

    // Reset list, selection and scrollTop since the list changed
    if (resetList) {
        resultsList.innerHTML = "";
        selectedTag = null;
        resultDiv.scrollTop = 0;
        resultCount = 0;
    }

    // Find right colors from config
    let tagFileName = acConfig.tagFile.split(".", 1)[0];
    let tagColors = acConfig.colors;
    let mode = gradioApp().querySelector('.dark') ? 0 : 1;
    let nextLength = Math.min(results.length, resultCount + acConfig.resultStepLength);
    let colorGroup = tagColors[tagFileName];
    // Default to danbooru scheme if no matching one is found
    if (colorGroup === undefined) colorGroup = tagColors["danbooru"];

    for (let i = resultCount; i < nextLength; i++) {
        let result = results[i];
        let resultTag = acConfig.replaceUnderscores ? result[0].replaceAll("_", " ") : result[0];
        let li = document.createElement("li");

        //support only show the translation to result
        if (result[2]) {
            li.textContent = result[2];
            if (!acConfig.translation.onlyShowTranslation) {
                li.textContent += " >> " + resultTag;
            }
        } else {
            li.textContent = resultTag;
        }

        let resultType = result[1].split(".", 1)[0];

        if (classColorList && classColorList.includes(resultType)) {
            // Set the color of the tag
            li.style = `color: ${colorGroup[resultType][mode]};`;
        }

        // Add listener
        li.addEventListener("click", function () { insertTextAtCursor(textArea, result); });
        // Add element to list
        resultsList.appendChild(li);
    }
    resultCount = nextLength;
}

function updateSelectionStyle(textArea, newIndex, oldIndex) {
    let textAreaId = getTextAreaIdentifier(textArea);
    let resultDiv = gradioApp().querySelector('.autocompleteResults' + textAreaId);
    let resultsList = resultDiv.querySelector('ul');
    let items = resultsList.getElementsByTagName('li');

    if (oldIndex !== null) {
        items[oldIndex].classList.remove('selected');
    }

    // make it safer
    if (newIndex !== null) {
        items[newIndex].classList.add('selected');
    }

    // Set scrolltop to selected item if we are showing more than max results
    if (items.length > acConfig.maxResults) {
        let selected = items[newIndex];
        resultDiv.scrollTop = selected.offsetTop - resultDiv.offsetTop;
    }
}

function autocomplete(textArea, prompt, fixedTag = null) {
    // Return if the function is deactivated in the UI
    if (!acActive) {
        return;
    }

    // Guard for empty prompt
    if (!prompt) {
        hideResults(textArea);
        return;
    }

    if (!fixedTag) {

        let cursorPos = textArea.selectionEnd;
        let editStart = findEditStart(prompt, cursorPos);
        if (editStart === null) {
            return;
        }

        tagWord = prompt.substring(editStart, cursorPos);
        let tagStart = tagWord.search(/[^, ]/);
        if (tagStart !== -1) {
            tagWord = tagWord.substring(tagStart);
        } else {
            tagWord = null;
        }

        // Guard for empty tagword
        if (!tagWord) {
            hideResults(textArea);
            return;
        }

    } else {
        tagWord = fixedTag;
    }

    tagWord = tagWord.toLowerCase();
    tagWord = acConfig.replaceUnderscores ? tagWord.replaceAll(" ", "_") : tagWord;

    results = [];
    let matchGruop = null;
    if (acConfig.useWildcards && (matchGruop = tagWord.match(/\b__([^,_ ]+)__([^, ]*)\b/)) && matchGruop.length !== 0) {
        let wcFile = matchGruop[1];
        let wcWord = matchGruop[2];
        if (wcWord) {
            results = wildcards[wcFile].filter(x => x.toLowerCase().includes(wcWord)).map(x => [wcFile + ": " + x.trim(), "wildcardTag"]);
        } else {
            results = wildcards[wcFile].map(x => [wcFile + ": " + x.trim(), "wildcardTag"]);
        }
    } else if (acConfig.useWildcards && ((tagWord.startsWith("__") && !tagWord.endsWith("__")) || tagWord === "__")) {
        if (tagWord !== "__") {
            results = wildcardFiles.map(x => ["Wildcards: " + x.trim(), "wildcardFile"]);
        } else {
            let wcFile = tagWord.replace("__", "")
            results = wildcardFiles.filter(x => x.toLowerCase().includes(wcFile)).map(x => ["Wildcards: " + x.trim(), "wildcardFile"])
        }
    } else if (acConfig.class.useClass && (matchGruop = tagWord.match(/>(.+)<(.*)/)) && matchGruop.length !== 0) {
        let className = matchGruop[1];
        let classWord = matchGruop[2];
        let classType = null;
        for (let classObject of classObjectList) {
            if (classObject[1].toLowerCase() === className) {
                classType = classObject[0];
                break;
            }
        }
        if (!classType) {
            return;
        }
        let classTagList = null;
        if (acConfig.class.useStrictMode) {
            classTagList = allTags.filter(x => x[1] && x[1] === classType);
        } else {
            classTagList = allTags.filter(x => x[1] && x[1].startsWith(classType));
        }
        if (classWord) {
            if (acConfig.translation.searchByTranslation) {
                results = classTagList.filter(x => x[2] && x[2].toLowerCase().includes(classWord) && !results.includes(x));
                if (!acConfig.translation.onlyShowTranslation) {
                    results = results.concat(classTagList.filter(x => x[0].toLowerCase().includes(classWord) && !results.includes(x)));
                }
            } else {
                results = classTagList.filter(x => x[0].toLowerCase().includes(classWord));
            }
        } else {
            results = classTagList;
        }
        if (acConfig.class.useSubclass) {
            let searchFormat = new RegExp("^" + classType + "\\.[0-9]+$");
            results = classObjectList.filter(x => (x[0].search(searchFormat) !== -1)).map(x => ["Class: " + x[1], "className"]).concat(results);
        }
    } else if (acConfig.class.useClass && ((tagWord.startsWith(">") && !tagWord.endsWith("<")) || tagWord === ">")) {
        results = classObjectList.filter(x => (x[0].search(/.-?[0-9]+$/) === -1));
        if (tagWord === ">") {
            results = results.map(x => ["Class: " + x[1], "className"]);
        } else {
            let className = tagWord.replace(">", "")
            results = results.filter(x => x[1].toLowerCase().includes(className)).map(x => ["Class: " + x[1], "className"]);
        }
    } else if (acConfig.useEmbeddings && tagWord.match(/<[^,> ]*>?/g)) {
        if (tagWord === "<") {
            results = embeddings.map(x => ["Embeddings: " + x.trim(), "embedding"]);
        } else {
            let embedding = tagWord.replace("<", "");
            results = embeddings.filter(x => x.toLowerCase().includes(embedding)).map(x => ["Embeddings: " + x.trim(), "embedding"]);
        }
    }

    let maxResults = results ? acConfig.maxResults + results.length : acConfig.maxResults;

    if (acConfig.translation.searchByTranslation) {
        results = results.concat(allTags.filter(x => x[2] && x[2].toLowerCase().includes(tagWord)));
        if (!acConfig.translation.onlyShowTranslation) {
            results = results.concat(allTags.filter(x => x[0].toLowerCase().includes(tagWord) && !results.includes(x)));
        }
    } else {
        results = results.concat(allTags.filter(x => x[0].toLowerCase().includes(tagWord)));
    }

    if (!acConfig.showAllResults) {
        results = results.slice(0, maxResults);
    }

    // Guard for empty results
    if (!results || results.length === 0) {
        hideResults(textArea);
        return;
    }

    showResults(textArea);
    addResultsToList(textArea, results, true);
}

function navigateInList(textArea, event) {
    if (event.shiftKey && event.key === "Escape") {
        let checkBox = gradioApp().querySelector("#autoCompleteConfigBar > input")
        if (checkBox) {
            acActive = !acActive;
            checkBox.checked = acActive;
            if (!acActive) {
                hideResults();
            }
            event.preventDefault();
            event.stopPropagation();
        }
    } else if (event.ctrlKey && event.key === "m") {
        let modeSelete = gradioApp().querySelector("#autoCompleteConfigBar > select")
        if (modeSelete) {
            editMode = (editMode + 1) % modeCount;
            modeSelete.selectedIndex = editMode;
            autocomplete(textArea, textArea.value);
            event.preventDefault();
            event.stopPropagation();
        }
    } else if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
        showResults(textArea);
    }
    // Return if the function is deactivated in the UI
    if (!acActive || !isVisible(textArea) || event.ctrlKey || event.altKey) {
        return;
    }

    let validKeys = ["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "PageUp", "PageDown", "Enter", "Tab", "Escape"];

    if (!validKeys.includes(event.key)) {
        return;
    }

    let oldSelectedTag = selectedTag;

    switch (event.key) {
        case "ArrowUp":
            if (selectedTag === null) {
                selectedTag = resultCount - 1;
            } else {
                selectedTag = (selectedTag - 1 + resultCount) % resultCount;
            }
            break;
        case "ArrowDown":
            if (selectedTag === null) {
                selectedTag = 0;
            } else {
                selectedTag = (selectedTag + 1) % resultCount;
            }
            break;
        case "ArrowLeft":
            if (textArea.selectionEnd === 0) {
                hideResults();
                return;
            }
            textArea.selectionEnd--;
            autocomplete(textArea, textArea.value);
            break;
            case "ArrowRight":
                if (textArea.selectionEnd === textArea.value.length) {
                hideResults();
                return;
            }
            textArea.selectionStart++;
            autocomplete(textArea, textArea.value);
            break;
        case "PageUp":
            selectedTag = 0;
            break;
        case "PageDown":
            selectedTag = resultCount - 1;
            break;
        case "Enter":
        case "Tab":
            if (selectedTag === null) {
                selectedTag = 0;
            }
            insertTextAtCursor(textArea, results[selectedTag]);
            break;
        case "Escape":
            hideResults(textArea);
            break;
    }
    if (selectedTag == resultCount - 1
        && (event.key === "ArrowUp" || event.key === "ArrowDown" || event.key === "PageUp" || event.key === "PageDown")) {
        addResultsToList(textArea, results, false);
    }
    // Update highlighting
    if (selectedTag !== null) {
        updateSelectionStyle(textArea, selectedTag, oldSelectedTag);
    }

    // Prevent default behavior
    event.preventDefault();
    event.stopPropagation();
}

onUiUpdate(function () {
    // Load config
    if (!acConfig) {
        try {
            acConfig = JSON.parse(readFile("file/tags/config.json"));
            if (acConfig.translation.onlyShowTranslation) {
                acConfig.translation.searchByTranslation = true; // if only show translation, enable search by translation is necessary
            }
            if (acConfig.class.useSubclass) {
                acConfig.class.useClass = true;
            }
        } catch (e) {
            console.error("Error loading config.json: " + e);
            return;
        }
    }
    let tagFileName = acConfig.tagFile.split(".", 1)[0];
    if (!classColorList || classColorList.length === 0) {
        for (const key in acConfig.colors[tagFileName]) {
            classColorList.push(key);
        }
    }
    // Load classObjectList
    if (acConfig.class.useClass && (!classObjectList || classObjectList.length === 0)) {
    }
    // Load main tags and translations
    if (!allTags || allTags.length === 0) {
        try {
            allTags = loadCSV(`file/tags/${acConfig.tagFile}`);
        } catch (e) {
            console.error("Error loading tags file: " + e);
            return;
        }
        if (acConfig.extra.extraFile) {
            try {
                extras = loadCSV(`file/tags/${acConfig.extra.extraFile}`);
                if (acConfig.extra.onlyTranslationExtraFile) {
                    // This works purely on index, so it's not very robust. But a lot faster.
                    for (let i = 0, n = extras.length; i < n; i++) {
                        if (extras[i][0]) {
                            allTags[i][2] = extras[i][0];
                        }
                    }
                } else {
                    extras.forEach(e => {
                        // Check if a tag in allTags has the same name as the extra tag
                        if (tag = allTags.find(t => t[0] === e[0] && t[1] == e[1])) {
                            if (e[2]) // If the extra tag has a translation, add it to the tag
                                tag[2] = e[2];
                        } else {
                            // If the tag doesn't exist, add it to allTags
                            allTags.push(e);
                        }
                    });
                }
            } catch (e) {
                console.error("Error loading extra translation file: " + e);
                return;
            }
        }
    }
    // Load wildcards
    if (acConfig.useWildcards && (!wildcardFiles || wildcardFiles.length === 0)) {
        try {
            wildcardFiles = readFile("file/tags/temp/wc.txt").split("\n")
                .filter(x => x.trim().length > 0) // Remove empty lines
                .map(x => x.trim().replace(".txt", "")); // Remove file extension & newlines

            wildcardFiles.forEach(fName => {
                try {
                    wildcards[fName] = readFile(`file/scripts/wildcards/${fName}.txt`).split("\n")
                        .filter(x => x.trim().length > 0); // Remove empty lines
                } catch (e) {
                    console.log(`Could not load wildcards for ${fName}`);
                }
            });
        } catch (e) {
            console.error("Error loading wildcardNames.txt: " + e);
        }
    }
    // Load embeddings
    if (acConfig.useEmbeddings && (!embeddings || embeddings.length === 0)) {
        try {
            embeddings = readFile("file/tags/temp/emb.txt").split("\n")
                .filter(x => x.trim().length > 0) // Remove empty lines
                .map(x => x.replace(".bin", "").replace(".pt", "").replace(".png", "")); // Remove file extensions
        } catch (e) {
            console.error("Error loading embeddings.txt: " + e);
        }
    }

    // Find all textareas
    let txt2imgTextArea = gradioApp().querySelector('#txt2img_prompt > label > textarea');
    let img2imgTextArea = gradioApp().querySelector('#img2img_prompt > label > textarea');
    let txt2imgTextArea_n = gradioApp().querySelector('#txt2img_neg_prompt > label > textarea');
    let img2imgTextArea_n = gradioApp().querySelector('#img2img_neg_prompt > label > textarea');
    let textAreas = [txt2imgTextArea, img2imgTextArea, txt2imgTextArea_n, img2imgTextArea_n];

    let quicksettings = gradioApp().querySelector('#quicksettings');

    // Not found, we're on a page without prompt textareas
    if (textAreas.every(v => v === null || v === undefined)) {
        return;
    }
    // Already added or unnecessary to add
    if (gradioApp().querySelector('.autocompleteResults.p')) {
        if (gradioApp().querySelector('.autocompleteResults.n') || !acConfig.activeIn.negativePrompts) {
            return;
        }
    } else if (!acConfig.activeIn.txt2img && !acConfig.activeIn.img2img) {
        return;
    }

    textAreas.forEach(area => {

        // Return if autocomplete is disabled for the current area type in config
        let textAreaId = getTextAreaIdentifier(area);
        if ((!acConfig.activeIn.img2img && textAreaId.includes("img2img"))
            || (!acConfig.activeIn.txt2img && textAreaId.includes("txt2img"))
            || (!acConfig.activeIn.negativePrompts && textAreaId.includes("n"))) {
            return;
        }

        // Only add listeners once
        if (!area.classList.contains('autocomplete')) {
            // Add our new element
            var resultsDiv = createResultsDiv(area);
            area.parentNode.insertBefore(resultsDiv, area.nextSibling);
            // Hide by default so it doesn't show up on page load
            hideResults(area);

            // Add autocomplete event listener
            area.addEventListener('input', debounce(() => autocomplete(area, area.value), 100));
            // Add focusout event listener
            area.addEventListener('focusout', debounce(() => hideResults(area), 400));
            // Add up and down arrow event listener
            area.addEventListener('keydown', (e) => navigateInList(area, e));

            // Add class so we know we've already added the listeners
            area.classList.add('autocomplete');
        }
    });

    if (gradioApp().querySelector("#autoCompleteConfigBar") === null) {
        // Add toggle switch
        let configBar = createConfigBar();
        configBar.querySelector("input").addEventListener("change", (e) => {
            acActive = e.target.checked;
        });
        configBar.querySelector("select").addEventListener("change", (e) => {
            editMode = e.target.selectedIndex;
        });
        quicksettings.parentNode.insertBefore(configBar, quicksettings.nextSibling);
    }

    if (styleAdded) {
        return;
    }

    // Add style to dom
    let acStyle = document.createElement('style');
    let css = gradioApp().querySelector('.dark') ? autocompleteCSS_dark : autocompleteCSS_light;
    if (acStyle.styleSheet) {
        acStyle.styleSheet.cssText = css;
    } else {
        acStyle.appendChild(document.createTextNode(css));
    }
    gradioApp().appendChild(acStyle);
    styleAdded = true;
});