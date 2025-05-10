// 1. Инициализация панели и переменных
let panel = document.createElement('div');
panel.id = 'text-selection-panel';
panel.style.display = 'none';
document.body.appendChild(panel);
let userInitiatedFocus = false;

// 2. Настройки темы
let themeColors = {
  toolbar: {
    bgcolor: "#f9f9fa",
    color: "#0c0c0d",
    border: "#ccc"
  },
  button: {
    hover: "rgba(0, 0, 0, 0.1)",
    active: "rgba(0, 0, 0, 0.2)"
  }
};

// 3. Обработка сообщений от background script
let extensionEnabled = true;

browser.runtime.onMessage.addListener((message) => {
  if (message.action === "themeColors" && message.colors) {
    extensionEnabled = true;
    themeColors = message.colors;
    updateColors();
    applyInitialStyles();
  } else if (message.action === "extensionDisabled") {
    extensionEnabled = false;
    panel.style.display = 'none';
  }
});

browser.runtime.sendMessage({ action: "getThemeColors" });

// 4. Функции для работы с темами
function applyInitialStyles() {
  panel.style.backgroundColor = themeColors.toolbar.bgcolor;
  panel.style.color = themeColors.toolbar.color;
  panel.style.borderColor = themeColors.toolbar.border;
  
  [copyButton, searchButton, cutButton, pasteButton, deleteButton, selectAllButton].forEach(button => {
    button.style.color = themeColors.toolbar.color;
    button.style.backgroundColor = "transparent";
  });
}

function updateColors() {
  panel.style.backgroundColor = themeColors.toolbar.bgcolor;
  panel.style.color = themeColors.toolbar.color;
  panel.style.borderColor = themeColors.toolbar.border;
  
  [copyButton, searchButton, cutButton, pasteButton, deleteButton, selectAllButton].forEach(button => {
    button.style.color = themeColors.toolbar.color;
    button.style.backgroundColor = "transparent";
    
    button.onmouseenter = null;
    button.onmouseleave = null;
    button.onmousedown = null;
    button.onmouseup = null;
    
    button.onmouseenter = function() {
      this.style.backgroundColor = themeColors.button.hover;
    };
    button.onmouseleave = function() {
      this.style.backgroundColor = "transparent";
    };
    button.onmousedown = function() {
      this.style.backgroundColor = themeColors.button.active;
    };
    button.onmouseup = function() {
      this.style.backgroundColor = themeColors.button.hover;
    };
  });
}

// 5. Интернационализация
let messages = {
  copyButtonText: browser.i18n.getMessage("copyButtonText") || "Copy",
  searchButtonText: browser.i18n.getMessage("searchButtonText") || "Search",
  cutButtonText: browser.i18n.getMessage("cutButtonText") || "Cut",
  pasteButtonText: browser.i18n.getMessage("pasteButtonText") || "Paste",
  deleteButtonText: browser.i18n.getMessage("deleteButtonText") || "Delete",
  selectAllButtonText: browser.i18n.getMessage("selectAllButtonText") || "Select all",
  pasteAlertText: browser.i18n.getMessage("pasteAlertText") || "To paste, please use Ctrl+V keyboard shortcut"
};

// 6. Создание кнопок панели
let copyButton = document.createElement('button');
copyButton.textContent = messages.copyButtonText;
copyButton.classList.add('panel-button');

let searchButton = document.createElement('button');
searchButton.textContent = messages.searchButtonText;
searchButton.classList.add('panel-button');

let cutButton = document.createElement('button');
cutButton.textContent = messages.cutButtonText;
cutButton.classList.add('panel-button');

let pasteButton = document.createElement('button');
pasteButton.textContent = messages.pasteButtonText;
pasteButton.classList.add('panel-button');

let deleteButton = document.createElement('button');
deleteButton.textContent = messages.deleteButtonText;
deleteButton.classList.add('panel-button');

let selectAllButton = document.createElement('button');
selectAllButton.textContent = messages.selectAllButtonText;
selectAllButton.classList.add('panel-button');

// 7. Переменные состояния
let panelTimer = null;
let currentMode = null;
let currentElement = null;
let selectAllTriggered = false;
let lastClickPosition = { x: 0, y: 0 };

// 8. Обработчики событий мыши
document.addEventListener('mousedown', function(event) {
  lastClickPosition.x = event.clientX;
  lastClickPosition.y = event.clientY;
  userInitiatedFocus = true;
  
  setTimeout(() => {
    userInitiatedFocus = false;
  }, 1000);
});

// 9. Обработка выделения текста
document.addEventListener('selectionchange', function() {
  if (selectAllTriggered) return;
  
  panel.style.display = 'none';
  
  if (panelTimer) clearTimeout(panelTimer);
  
  panelTimer = setTimeout(function() {
    const selection = window.getSelection();
    const selectedText = selection.toString().trim();
    
    if (selectedText.length > 0) {
      const activeElement = document.activeElement;
      const isInputField = activeElement.matches('input:not([type="button"]):not([type="checkbox"]):not([type="radio"]), textarea, [contenteditable="true"]');
      
      if (isInputField) {
        currentElement = activeElement;
        showInputSelectionPanel(selection);
      } else {
        showSelectionPanel(selection);
      }
    }
  }, 200);
});

// 10. Функции отображения панели
function showSelectionPanel(selection) {
  if (!extensionEnabled) return;
  
  currentMode = 'selection';
  panel.innerHTML = '';
  panel.appendChild(copyButton);
  panel.appendChild(searchButton);
  positionPanel(selection);
}

function showInputSelectionPanel(selection) {
  if (!extensionEnabled) return;
  
  currentMode = 'input-selection';
  panel.innerHTML = '';
  panel.appendChild(copyButton);
  panel.appendChild(cutButton);
  panel.appendChild(pasteButton);
  panel.appendChild(deleteButton);
  panel.appendChild(selectAllButton);
  positionPanel(selection);
}

function showPastePanel(inputElement, event) {
  if (!extensionEnabled || !navigator.clipboard) return;
  
  currentMode = 'input';
  panel.innerHTML = '';
  panel.appendChild(pasteButton);
  
  const hasText = (inputElement.value && inputElement.value.length > 0) || 
                 (inputElement.textContent && inputElement.textContent.trim().length > 0);
  if (hasText) panel.appendChild(selectAllButton);
  
  panel.style.display = 'flex';
  panel.style.visibility = 'hidden';
  
  if (event) {
    panel.style.left = (event.clientX + window.scrollX) + 'px';
    panel.style.top = (event.clientY + window.scrollY - panel.offsetHeight - 5) + 'px';
  } else if (lastClickPosition.x !== 0 || lastClickPosition.y !== 0) {
    panel.style.left = (lastClickPosition.x + window.scrollX) + 'px';
    panel.style.top = (lastClickPosition.y + window.scrollY - panel.offsetHeight - 5) + 'px';
  } else {
    let cursorPos = getCursorCoordinates(inputElement);
    if (cursorPos) {
      panel.style.left = (cursorPos.left + window.scrollX) + 'px';
      panel.style.top = (cursorPos.top + window.scrollY - panel.offsetHeight - 5) + 'px';
    } else {
      const rect = inputElement.getBoundingClientRect();
      panel.style.left = (rect.left + window.scrollX) + 'px';
      panel.style.top = (rect.top + window.scrollY - panel.offsetHeight - 5) + 'px';
    }
  }
  
  const panelRect = panel.getBoundingClientRect();
  if (panelRect.right > window.innerWidth) panel.style.left = (window.innerWidth - panelRect.width - 10) + 'px';
  if (panelRect.left < 0) panel.style.left = window.scrollX + 5 + 'px';
  if (panelRect.top < 0) {
    if (event) {
      panel.style.top = (event.clientY + window.scrollY + 5) + 'px';
    } else if (lastClickPosition.y !== 0) {
      panel.style.top = (lastClickPosition.y + window.scrollY + 5) + 'px';
    } else {
      const rect = inputElement.getBoundingClientRect();
      panel.style.top = (rect.bottom + window.scrollY + 5) + 'px';
    }
  }
  
  panel.style.visibility = 'visible';
}

// 11. Позиционирование панели
function positionPanel(selection) {
  const range = selection.getRangeAt(0);
  const rect = range.getBoundingClientRect();
  
  panel.style.display = 'flex';
  panel.style.visibility = 'hidden';
  
  const endRange = document.createRange();
  endRange.setStart(selection.focusNode, selection.focusOffset);
  endRange.setEnd(selection.focusNode, selection.focusOffset);
  const endRect = endRange.getBoundingClientRect();

  panel.style.left = endRect.right + window.scrollX + 'px';
  panel.style.top = (endRect.top + window.scrollY - panel.offsetHeight - 5) + 'px';
  
  const panelRect = panel.getBoundingClientRect();
  if (panelRect.right > window.innerWidth) panel.style.left = (window.innerWidth - panelRect.width - 10) + 'px';
  if (panelRect.top < 0) panel.style.top = (endRect.bottom + window.scrollY + 5) + 'px';
  
  panel.style.visibility = 'visible';
}

// 12. Функции работы с курсором
function getCursorCoordinates(element) {
  if (!element) return null;
  
  if (element.matches('input, textarea')) {
    const temp = document.createElement('div');
    temp.style.position = 'absolute';
    temp.style.visibility = 'hidden';
    temp.style.whiteSpace = 'pre';
    temp.style.font = getComputedStyle(element).font;
    temp.style.paddingLeft = getComputedStyle(element).paddingLeft;
    temp.style.paddingTop = getComputedStyle(element).paddingTop;
    
    const styles = getComputedStyle(element);
    for (const prop of ['width', 'height', 'fontSize', 'lineHeight', 'fontFamily']) {
      temp.style[prop] = styles[prop];
    }
    
    const text = element.value.substring(0, element.selectionStart);
    temp.textContent = text || '.';
    document.body.appendChild(temp);
    
    const rect = temp.getBoundingClientRect();
    const elementRect = element.getBoundingClientRect();
    
    document.body.removeChild(temp);
    
    return {
      left: elementRect.left + (text ? temp.offsetWidth : 0),
      top: elementRect.top + temp.offsetHeight
    };
  }
  
  if (element.matches('[contenteditable="true"]')) {
    const selection = window.getSelection();
    if (selection.rangeCount > 0) {
      const range = selection.getRangeAt(0).cloneRange();
      const rect = range.getBoundingClientRect();
      return {
        left: rect.left,
        top: rect.top
      };
    }
  }
  
  return null;
}

// 13. Обработчики кнопок панели
copyButton.addEventListener('click', function() {
  const selectedText = window.getSelection().toString().trim();
  navigator.clipboard.writeText(selectedText)
    .then(() => panel.style.display = 'none')
    .catch(err => {
      console.error('Ошибка при копировании: ', err);
      fallbackCopy(selectedText);
      panel.style.display = 'none';
    });
});

cutButton.addEventListener('click', function() {
  if (!currentElement) {
    panel.style.display = 'none';
    return;
  }
  
  const selectedText = getSelectedTextFromElement(currentElement);
  navigator.clipboard.writeText(selectedText)
    .then(() => {
      deleteSelectedText(currentElement);
      panel.style.display = 'none';
    })
    .catch(err => {
      console.error('Ошибка при вырезании: ', err);
      fallbackCut(currentElement);
      panel.style.display = 'none';
    });
});

deleteButton.addEventListener('click', function() {
  if (!currentElement) {
    panel.style.display = 'none';
    return;
  }
  deleteSelectedText(currentElement);
  panel.style.display = 'none';
});

selectAllButton.addEventListener('click', function() {
  if (!currentElement) {
    panel.style.display = 'none';
    return;
  }
  
  selectAllTriggered = true;
  
  if (currentElement.matches('input, textarea')) {
    currentElement.select();
  } else if (currentElement.matches('[contenteditable="true"]')) {
    const range = document.createRange();
    range.selectNodeContents(currentElement);
    const selection = window.getSelection();
    selection.removeAllRanges();
    selection.addRange(range);
  }
  
  panel.style.display = 'none';
  
  setTimeout(() => {
    panel.innerHTML = '';
    panel.appendChild(copyButton);
    panel.appendChild(cutButton);
    panel.appendChild(pasteButton);
    panel.appendChild(deleteButton);
    
    const rect = currentElement.getBoundingClientRect();
    const selection = window.getSelection();
    let panelX, panelY;
    
    if (selection.rangeCount > 0) {
      const range = selection.getRangeAt(0);
      const selectionRect = range.getBoundingClientRect();
      panelX = selectionRect.right + window.scrollX;
      panelY = selectionRect.top + window.scrollY - panel.offsetHeight - 5;
    } else {
      panelX = rect.right + window.scrollX;
      panelY = rect.top + window.scrollY - panel.offsetHeight - 5;
    }
    
    panel.style.display = 'flex';
    panel.style.visibility = 'hidden';
    panel.style.left = panelX + 'px';
    panel.style.top = panelY + 'px';
    
    const panelRect = panel.getBoundingClientRect();
    if (panelRect.right > window.innerWidth) panel.style.left = (window.innerWidth - panelRect.width - 10) + 'px';
    if (panelRect.left < 0) panel.style.left = window.scrollX + 5 + 'px';
    if (panelRect.top < 0) panel.style.top = (rect.bottom + window.scrollY + 5) + 'px';
    
    panel.style.visibility = 'visible';
    currentMode = 'input-selection';
    
    setTimeout(() => selectAllTriggered = false, 500);
  }, 100);
});

searchButton.addEventListener('click', function() {
  const selectedText = window.getSelection().toString().trim();
  browser.storage.local.get('searchEngine').then((result) => {
    const searchEngine = result.searchEngine || 'google';
    let searchUrl = '';
    
    switch (searchEngine) {
      case 'bing': searchUrl = `https://www.bing.com/search?q=${encodeURIComponent(selectedText)}`; break;
      case 'duckduckgo': searchUrl = `https://duckduckgo.com/?q=${encodeURIComponent(selectedText)}`; break;
      case 'qwant': searchUrl = `https://www.qwant.com/?q=${encodeURIComponent(selectedText)}`; break;
      case 'ecosia': searchUrl = `https://www.ecosia.org/search?q=${encodeURIComponent(selectedText)}`; break;
      case 'google':
      default: searchUrl = `https://www.google.com/search?q=${encodeURIComponent(selectedText)}`; break;
    }
    
    window.open(searchUrl, '_blank');
    panel.style.display = 'none';
  }).catch((error) => {
    console.error('Ошибка при получении настроек поисковой системы:', error);
    const searchUrl = `https://www.google.com/search?q=${encodeURIComponent(selectedText)}`;
    window.open(searchUrl, '_blank');
    panel.style.display = 'none';
  });
});

pasteButton.addEventListener('click', function() {
  if (!currentElement) {
    panel.style.display = 'none';
    return;
  }
  
  if (navigator.clipboard && navigator.clipboard.readText) {
    navigator.clipboard.readText()
      .then(text => {
        pasteTextToElement(currentElement, text);
        panel.style.display = 'none';
      })
      .catch(err => {
        console.error('Ошибка при чтении буфера обмена: ', err);
        alert(messages.pasteAlertText);
        panel.style.display = 'none';
      });
  } else {
    alert(messages.pasteAlertText);
    panel.style.display = 'none';
  }
});

// 14. Вспомогательные функции
function fallbackCopy(text) {
  const textarea = document.createElement('textarea');
  textarea.value = text;
  textarea.style.position = 'fixed';
  textarea.style.opacity = '0';
  document.body.appendChild(textarea);
  textarea.select();
  
  try {
    document.execCommand('copy');
  } catch (err) {
    console.error('Ошибка при резервном копировании: ', err);
  }
  
  document.body.removeChild(textarea);
}

function fallbackCut(element) {
  try {
    document.execCommand('cut');
  } catch (err) {
    console.error('Ошибка при резервном вырезании: ', err);
    const selectedText = getSelectedTextFromElement(element);
    fallbackCopy(selectedText);
    deleteSelectedText(element);
  }
}

function deleteSelectedText(element) {
  if (element.matches('input, textarea')) {
    const start = element.selectionStart;
    const end = element.selectionEnd;
    element.value = element.value.substring(0, start) + element.value.substring(end);
    element.selectionStart = element.selectionEnd = start;
  } else if (element.matches('[contenteditable="true"]')) {
    document.execCommand('delete');
  }
  
  const event = new Event('input', { bubbles: true });
  element.dispatchEvent(event);
}

function getSelectedTextFromElement(element) {
  if (element.matches('input, textarea')) {
    return element.value.substring(element.selectionStart, element.selectionEnd);
  } else if (element.matches('[contenteditable="true"]')) {
    return window.getSelection().toString();
  }
  return '';
}

function pasteTextToElement(element, text) {
  if (element.matches('textarea, [contenteditable="true"]')) {
    if (document.activeElement === element) {
      const start = element.selectionStart || 0;
      const end = element.selectionEnd || 0;
      
      if (typeof element.value !== 'undefined') {
        element.value = element.value.substring(0, start) + text + element.value.substring(end);
        element.selectionStart = element.selectionEnd = start + text.length;
      } else {
        document.execCommand('insertText', false, text);
      }
    } else {
      element.focus();
      document.execCommand('insertText', false, text);
    }
  } else if (element.matches('input')) {
    const start = element.selectionStart || 0;
    const end = element.selectionEnd || 0;
    element.value = element.value.substring(0, start) + text + element.value.substring(end);
    element.selectionStart = element.selectionEnd = start + text.length;
  }
  
  const event = new Event('input', { bubbles: true });
  element.dispatchEvent(event);
}

// 15. Обработчики событий полей ввода
document.addEventListener('click', function(event) {
  const target = event.target;
  
  if (target.matches('input:not([type="button"]):not([type="checkbox"]):not([type="radio"]), textarea, [contenteditable="true"]')) {
    currentElement = target;
    
    setTimeout(() => {
      const selectedText = getSelectedTextFromElement(target);
      if (selectedText && selectedText.length > 0) {
        showInputSelectionPanel(window.getSelection());
      } else {
        showPastePanel(target, event);
      }
    }, 100);
  } else if (!panel.contains(event.target) && panel.style.display !== 'none') {
    panel.style.display = 'none';
  }
});

document.addEventListener('focus', function(event) {
  const target = event.target;
  
  if (target.matches('input:not([type="button"]):not([type="checkbox"]):not([type="radio"]), textarea, [contenteditable="true"]')) {
    currentElement = target;
    
    if (userInitiatedFocus) {
      setTimeout(() => {
        const selectedText = getSelectedTextFromElement(target);
        if (selectedText && selectedText.length > 0) {
          showInputSelectionPanel(window.getSelection());
        } else {
          showPastePanel(target, null);
        }
      }, 100);
    }
  }
}, true);

document.addEventListener('dblclick', function(event) {
  const target = event.target;
  
  if (target.matches('input:not([type="button"]):not([type="checkbox"]):not([type="radio"]), textarea, [contenteditable="true"]')) {
    event.preventDefault();
    selectAllTriggered = true;
    currentElement = target;
    
    if (target.matches('input, textarea')) {
      target.select();
    } else if (target.matches('[contenteditable="true"]')) {
      const range = document.createRange();
      range.selectNodeContents(target);
      const selection = window.getSelection();
      selection.removeAllRanges();
      selection.addRange(range);
    }
    
    panel.style.display = 'none';
    
    setTimeout(() => {
      panel.innerHTML = '';
      panel.appendChild(copyButton);
      panel.appendChild(cutButton);
      panel.appendChild(pasteButton);
      panel.appendChild(deleteButton);
      
      const rect = target.getBoundingClientRect();
      const selection = window.getSelection();
      let panelX, panelY;
      
      if (selection.rangeCount > 0) {
        const range = selection.getRangeAt(0);
        const selectionRect = range.getBoundingClientRect();
        panelX = selectionRect.right + window.scrollX;
        panelY = selectionRect.top + window.scrollY - panel.offsetHeight - 5;
      } else {
        panelX = rect.right + window.scrollX;
        panelY = rect.top + window.scrollY - panel.offsetHeight - 5;
      }
      
      panel.style.display = 'flex';
      panel.style.visibility = 'hidden';
      panel.style.left = panelX + 'px';
      panel.style.top = panelY + 'px';
      
      const panelRect = panel.getBoundingClientRect();
      if (panelRect.right > window.innerWidth) panel.style.left = (window.innerWidth - panelRect.width - 10) + 'px';
      if (panelRect.left < 0) panel.style.left = window.scrollX + 5 + 'px';
      if (panelRect.top < 0) panel.style.top = (rect.bottom + window.scrollY + 5) + 'px';
      
      panel.style.visibility = 'visible';
      currentMode = 'input-selection';
      
      setTimeout(() => selectAllTriggered = false, 500);
    }, 100);
  }
});

// 16. Обработчики клавиатуры
document.addEventListener('keydown', function() {
  userInitiatedFocus = true;
  setTimeout(() => userInitiatedFocus = false, 1000);
});

document.addEventListener('keydown', function(event) {
  if (event.key === 'Escape' && panel.style.display !== 'none') {
    panel.style.display = 'none';
  }
});

// 17. Обработчики фокуса и скролла
document.addEventListener('focusout', function(event) {
  if (panel.style.display !== 'none' && (currentMode === 'input' || currentMode === 'input-selection')) {
    setTimeout(() => {
      if (!panel.contains(document.activeElement)) {
        panel.style.display = 'none';
      }
    }, 100);
  }
});

window.addEventListener('scroll', function() {
  if (panel.style.display !== 'none') {
    panel.style.display = 'none';
  }
}, true);

// 18. Инициализация цветов темы
updateColors();
