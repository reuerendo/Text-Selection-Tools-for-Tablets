// 1. БАЗОВАЯ ИНИЦИАЛИЗАЦИЯ
const createPanel = () => {
  const panel = document.createElement('div');
  panel.id = 'text-selection-panel';
  panel.style.display = 'none';
  document.body.appendChild(panel);
  return panel;
};

const panel = createPanel();
let userInitiatedFocus = false;
let extensionEnabled = true;
let currentMode = null;
let currentElement = null;
let selectAllTriggered = false;
let lastClickPosition = { x: 0, y: 0 };
let panelTimer = null;

// 2. НАСТРОЙКИ ТЕМЫ
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

// 3. ИНТЕРНАЦИОНАЛИЗАЦИЯ
const messages = {
  copyButtonText: browser.i18n.getMessage("copyButtonText") || "Copy",
  searchButtonText: browser.i18n.getMessage("searchButtonText") || "Search",
  cutButtonText: browser.i18n.getMessage("cutButtonText") || "Cut",
  pasteButtonText: browser.i18n.getMessage("pasteButtonText") || "Paste",
  deleteButtonText: browser.i18n.getMessage("deleteButtonText") || "Delete",
  selectAllButtonText: browser.i18n.getMessage("selectAllButtonText") || "Select all",
  pasteAlertText: browser.i18n.getMessage("pasteAlertText") || "To paste, please use Ctrl+V keyboard shortcut"
};

// 4. СОЗДАНИЕ ЭЛЕМЕНТОВ ИНТЕРФЕЙСА
const createButton = (text) => {
  const button = document.createElement('button');
  button.textContent = text;
  button.classList.add('panel-button');
  return button;
};

const copyButton = createButton(messages.copyButtonText);
const searchButton = createButton(messages.searchButtonText);
const cutButton = createButton(messages.cutButtonText);
const pasteButton = createButton(messages.pasteButtonText);
const deleteButton = createButton(messages.deleteButtonText);
const selectAllButton = createButton(messages.selectAllButtonText);

const allButtons = [copyButton, searchButton, cutButton, pasteButton, deleteButton, selectAllButton];

// 5. УПРАВЛЕНИЕ ТЕМОЙ
function applyInitialStyles() {
  panel.style.backgroundColor = themeColors.toolbar.bgcolor;
  panel.style.color = themeColors.toolbar.color;
  panel.style.borderColor = themeColors.toolbar.border;
  
  allButtons.forEach(button => {
    button.style.color = themeColors.toolbar.color;
    button.style.backgroundColor = "transparent";
  });
}

function updateColors() {
  panel.style.backgroundColor = themeColors.toolbar.bgcolor;
  panel.style.color = themeColors.toolbar.color;
  panel.style.borderColor = themeColors.toolbar.border;
  
  allButtons.forEach(button => {
    button.style.color = themeColors.toolbar.color;
    button.style.backgroundColor = "transparent";
    
    // Сбрасываем старые обработчики
    button.onmouseenter = null;
    button.onmouseleave = null;
    button.onmousedown = null;
    button.onmouseup = null;
    
    // Устанавливаем новые
    button.onmouseenter = () => button.style.backgroundColor = themeColors.button.hover;
    button.onmouseleave = () => button.style.backgroundColor = "transparent";
    button.onmousedown = () => button.style.backgroundColor = themeColors.button.active;
    button.onmouseup = () => button.style.backgroundColor = themeColors.button.hover;
  });
}

// 6. ОСНОВНЫЕ ФУНКЦИИ РАБОТЫ С ТЕКСТОМ
function getSelectedTextFromElement(element) {
  if (element.matches('input, textarea')) {
    return element.value.substring(element.selectionStart, element.selectionEnd);
  } else if (element.matches('[contenteditable="true"]')) {
    return window.getSelection().toString();
  }
  return '';
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
  
  element.dispatchEvent(new Event('input', { bubbles: true }));
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
  
  element.dispatchEvent(new Event('input', { bubbles: true }));
}

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

// 7. ПОЗИЦИОНИРОВАНИЕ ПАНЕЛИ
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

// 8. ПОКАЗ РАЗЛИЧНЫХ ТИПОВ ПАНЕЛЕЙ
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
  
  // Центрируем панель относительно места клика по горизонтали
  let panelX = lastClickPosition.x + window.scrollX - (panel.offsetWidth / 2);
  // Размещаем панель над местом клика с отступом, превышающим высоту панели
  let panelY = lastClickPosition.y + window.scrollY - panel.offsetHeight - 20;
  
  panel.style.left = panelX + 'px';
  panel.style.top = panelY + 'px';
  
  const panelRect = panel.getBoundingClientRect();
  // Корректируем положение, если панель выходит за границы
  if (panelRect.right > window.innerWidth) panel.style.left = (window.innerWidth - panelRect.width - 10) + 'px';
  if (panelRect.left < 0) panel.style.left = window.scrollX + 10 + 'px';
  
  if (panelRect.top < 0) {
    // Если панель выходит за верхнюю границу, размещаем её ниже точки клика
    // с отступом, превышающим высоту панели
    panel.style.top = (lastClickPosition.y + window.scrollY + 20) + 'px';
  }
  
  panel.style.visibility = 'visible';
}

// 9. ОБРАБОТЧИКИ КНОПОК
copyButton.addEventListener('click', () => {
  const selectedText = window.getSelection().toString().trim();
  navigator.clipboard.writeText(selectedText)
    .then(() => panel.style.display = 'none')
    .catch(err => {
      console.error('Ошибка при копировании: ', err);
      fallbackCopy(selectedText);
      panel.style.display = 'none';
    });
});

searchButton.addEventListener('click', () => {
  const selectedText = window.getSelection().toString().trim();
  browser.runtime.sendMessage({
    action: "performSearch",
    searchText: selectedText
  });
  panel.style.display = 'none';
});

cutButton.addEventListener('click', () => {
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

deleteButton.addEventListener('click', () => {
  if (!currentElement) {
    panel.style.display = 'none';
    return;
  }
  deleteSelectedText(currentElement);
  panel.style.display = 'none';
});

pasteButton.addEventListener('click', () => {
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

selectAllButton.addEventListener('click', () => {
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
    
    // Центрируем панель относительно места клика по горизонтали
    let panelX = lastClickPosition.x + window.scrollX - (panel.offsetWidth / 2);
    // Размещаем панель над местом клика с отступом, превышающим высоту панели
    let panelY = lastClickPosition.y + window.scrollY - panel.offsetHeight - 20;
    
    panel.style.display = 'flex';
    panel.style.visibility = 'hidden';
    panel.style.left = panelX + 'px';
    panel.style.top = panelY + 'px';
    
    const panelRect = panel.getBoundingClientRect();
    if (panelRect.right > window.innerWidth) panel.style.left = (window.innerWidth - panelRect.width - 10) + 'px';
    if (panelRect.left < 0) panel.style.left = window.scrollX + 10 + 'px';
    
    if (panelRect.top < 0) {
      // Если панель выходит за верхнюю границу, размещаем её ниже точки клика
      // с отступом, превышающим высоту панели
      panel.style.top = (lastClickPosition.y + window.scrollY + 20) + 'px';
    }
    
    panel.style.visibility = 'visible';
    currentMode = 'input-selection';
    
    setTimeout(() => selectAllTriggered = false, 500);
  }, 100);
});

// 10. ОБРАБОТЧИКИ СОБЫТИЙ DOM
document.addEventListener('mousedown', event => {
  lastClickPosition.x = event.clientX;
  lastClickPosition.y = event.clientY;
  userInitiatedFocus = true;
  
  setTimeout(() => {
    userInitiatedFocus = false;
  }, 1000);
});

document.addEventListener('selectionchange', () => {
  if (selectAllTriggered) return;
  
  panel.style.display = 'none';
  
  if (panelTimer) clearTimeout(panelTimer);
  
  panelTimer = setTimeout(() => {
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

document.addEventListener('click', event => {
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

document.addEventListener('focus', event => {
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

document.addEventListener('dblclick', event => {
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
      
      // Центрируем панель относительно места клика по горизонтали
      let panelX = lastClickPosition.x + window.scrollX - (panel.offsetWidth / 2);
      // Размещаем панель на одну строку выше места клика
      let panelY = lastClickPosition.y + window.scrollY - 24;
      
      panel.style.display = 'flex';
      panel.style.visibility = 'hidden';
      panel.style.left = panelX + 'px';
      panel.style.top = panelY + 'px';
      
      const panelRect = panel.getBoundingClientRect();
      if (panelRect.right > window.innerWidth) panel.style.left = (window.innerWidth - panelRect.width - 10) + 'px';
      if (panelRect.left < 0) panel.style.left = window.scrollX + 10 + 'px';
      
      if (panelRect.top < 0) {
        // Если панель выходит за верхнюю границу, размещаем её на одну строку ниже точки клика
        panel.style.top = (lastClickPosition.y + window.scrollY + 24) + 'px';
      }
      
      panel.style.visibility = 'visible';
      currentMode = 'input-selection';
      
      setTimeout(() => selectAllTriggered = false, 500);
    }, 100);
  }
});

document.addEventListener('keydown', () => {
  userInitiatedFocus = true;
  setTimeout(() => userInitiatedFocus = false, 1000);
});

document.addEventListener('keydown', event => {
  if (event.key === 'Escape' && panel.style.display !== 'none') {
    panel.style.display = 'none';
  }
});

document.addEventListener('focusout', event => {
  if (panel.style.display !== 'none' && (currentMode === 'input' || currentMode === 'input-selection')) {
    setTimeout(() => {
      if (!panel.contains(document.activeElement)) {
        panel.style.display = 'none';
      }
    }, 100);
  }
});

window.addEventListener('scroll', () => {
  if (panel.style.display !== 'none') {
    panel.style.display = 'none';
  }
}, true);

// 11. ИНИЦИАЛИЗАЦИЯ И ВЗАИМОДЕЙСТВИЕ С BACKGROUND SCRIPT
document.addEventListener('DOMContentLoaded', () => {
  browser.runtime.sendMessage({ action: "getThemeColors" });
});

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

browser.storage.local.get('enabled').then(result => {
  if (result.enabled === false) {
    extensionEnabled = false;
  } else {
    browser.runtime.sendMessage({ action: "getThemeColors" });
  }
});

// Инициализация цветов
updateColors();
