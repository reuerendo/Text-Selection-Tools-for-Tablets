// 1. БАЗОВАЯ ИНИЦИАЛИЗАЦИЯ
const createPanel = (id) => {
  const panel = document.createElement('div');
  panel.id = id;
  panel.style.display = 'none';
  document.body.appendChild(panel);
  return panel;
};

// Создаем две отдельные панели
const selectionPanel = createPanel('text-selection-panel');
const inputPanel = createPanel('text-input-panel');

let userInitiatedFocus = false;
let extensionEnabled = true;
let currentElement = null;
let lastClickPosition = { x: 0, y: 0 };
let selectionPanelTimer = null;
let inputPanelTimer = null;
let isEditing = false;

// Новые переменные для улучшенного позиционирования
let cursorPosition = { x: 0, y: 0 };
let isSelectAllActive = false;

// Хранение положения панели ввода для сохранения при "Выделить все"
let inputPanelPosition = { x: 0, y: 0 };

// Флаг для отслеживания первого нажатия
let firstClickProcessed = false;

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
  pasteButtonText: browser.i18n.getMessage("pasteButtonText") || "Paste",
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

// Кнопки для панели выделения текста
const copyButton = createButton(messages.copyButtonText);
const searchButton = createButton(messages.searchButtonText);

// Кнопки для панели ввода
const pasteButton = createButton(messages.pasteButtonText);
const selectAllButton = createButton(messages.selectAllButtonText);
const cutButton = createButton(browser.i18n.getMessage("cutButtonText") || "Вырезать");
const copyButtonForInput = createButton(messages.copyButtonText);
const deleteButton = createButton(browser.i18n.getMessage("deleteButtonText") || "Удалить");

const selectionButtons = [copyButton, searchButton];
const inputButtons = [pasteButton, selectAllButton];
const allButtons = [...selectionButtons, ...inputButtons];

// 5. УПРАВЛЕНИЕ ТЕМОЙ
function applyInitialStyles() {
  [selectionPanel, inputPanel].forEach(panel => {
    panel.style.backgroundColor = themeColors.toolbar.bgcolor;
    panel.style.color = themeColors.toolbar.color;
    panel.style.borderColor = themeColors.toolbar.border;
  });
  
  allButtons.forEach(button => {
    button.style.color = themeColors.toolbar.color;
    button.style.backgroundColor = "transparent";
  });
}

function updateColors() {
  [selectionPanel, inputPanel].forEach(panel => {
    panel.style.backgroundColor = themeColors.toolbar.bgcolor;
    panel.style.color = themeColors.toolbar.color;
    panel.style.borderColor = themeColors.toolbar.border;
  });
  
  allButtons.forEach(button => {
    button.style.color = themeColors.toolbar.color;
    button.style.backgroundColor = "transparent";
    
    button.onmouseenter = null;
    button.onmouseleave = null;
    button.onmousedown = null;
    button.onmouseup = null;
    
    button.onmouseenter = () => button.style.backgroundColor = themeColors.button.hover;
    button.onmouseleave = () => button.style.backgroundColor = "transparent";
    button.onmousedown = () => button.style.backgroundColor = themeColors.button.active;
    button.onmouseup = () => button.style.backgroundColor = themeColors.button.hover;
  });
}

// 6. ОСНОВНЫЕ ФУНКЦИИ РАБОТЫ С ТЕКСТОМ
function getSelectedTextFromElement(element) {
  if (!element) return '';
  if (typeof element.matches !== 'function') return '';
  
  if (element.matches('input, textarea')) {
    return element.value.substring(element.selectionStart, element.selectionEnd);
  } else if (element.matches('[contenteditable="true"]')) {
    return window.getSelection().toString();
  }
  return '';
}

function pasteTextToElement(element, text) {
  if (!element || typeof element.matches !== 'function') return;
  
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

// 7. ПОЗИЦИОНИРОВАНИЕ ПАНЕЛЕЙ
function getCursorCoordinates(element) {
  if (!element) return null;
  if (typeof element.matches !== 'function') return null;
  
  if (element.matches('input, textarea')) {
    try {
      const temp = document.createElement('div');
      temp.style.position = 'absolute';
      temp.style.visibility = 'hidden';
      temp.style.whiteSpace = 'pre';
      
      const styles = getComputedStyle(element);
      const props = ['width', 'height', 'fontSize', 'lineHeight', 'fontFamily', 
                     'padding', 'paddingLeft', 'paddingTop', 'paddingRight', 'paddingBottom', 
                     'border', 'borderLeft', 'borderTop', 'borderRight', 'borderBottom'];
      
      props.forEach(prop => {
        temp.style[prop] = styles[prop];
      });
      
      let text = '';
      if (typeof element.selectionStart !== 'undefined') {
        text = element.value.substring(0, element.selectionStart);
      }
      temp.textContent = text || '.';
      document.body.appendChild(temp);
      
      const rect = temp.getBoundingClientRect();
      const elementRect = element.getBoundingClientRect();
      
      document.body.removeChild(temp);
      
      return {
        left: elementRect.left + (text ? rect.width : 0),
        top: elementRect.top + (styles.lineHeight ? parseFloat(styles.lineHeight) : rect.height)
      };
    } catch (e) {
      console.error('Ошибка при определении координат курсора:', e);
      const rect = element.getBoundingClientRect();
      return { left: rect.left, top: rect.top };
    }
  }
  
  if (element.matches('[contenteditable="true"]') || (element.tagName && element.tagName.toLowerCase() === 'div' && element.getAttribute('role') === 'textbox')) {
    const selection = window.getSelection();
    if (selection.rangeCount > 0) {
      const range = selection.getRangeAt(0).cloneRange();
      const rect = range.getBoundingClientRect();
      if (rect.width === 0 && rect.height === 0) {
        const elementRect = element.getBoundingClientRect();
        return {
          left: elementRect.left + 10,
          top: elementRect.top + 10
        };
      }
      return {
        left: rect.left,
        top: rect.top
      };
    }
  }
  
  const rect = element.getBoundingClientRect();
  return {
    left: rect.left + 10,
    top: rect.top + 10
  };
}

// Функция для позиционирования панели ввода
function positionInputPanel(element, event) {
  // Если был активирован Select All, сохраняем позицию панели
  if (isSelectAllActive) {
    inputPanel.style.left = inputPanelPosition.x + 'px';
    inputPanel.style.top = inputPanelPosition.y + 'px';
    return;
  }
  
  inputPanel.style.display = 'flex';
  inputPanel.style.visibility = 'hidden';
  
  let panelX, panelY;
  
  if (event) {
    panelX = event.clientX + window.scrollX - (inputPanel.offsetWidth / 2);
    panelY = event.clientY + window.scrollY - inputPanel.offsetHeight - 20; // 20px выше курсора
  } else if (cursorPosition.x || cursorPosition.y) {
    panelX = cursorPosition.x + window.scrollX - (inputPanel.offsetWidth / 2);
    panelY = cursorPosition.y + window.scrollY - inputPanel.offsetHeight - 20;
  } else {
    const coords = getCursorCoordinates(element);
    if (coords) {
      panelX = coords.left - (inputPanel.offsetWidth / 2);
      panelY = coords.top - inputPanel.offsetHeight - 20;
    } else {
      const rect = element.getBoundingClientRect();
      panelX = rect.left + window.scrollX + (rect.width / 2) - (inputPanel.offsetWidth / 2);
      panelY = rect.top + window.scrollY - inputPanel.offsetHeight - 10;
    }
  }
  
  if (panelX < 0) panelX = 10;
  if (panelX + inputPanel.offsetWidth > window.innerWidth) {
    panelX = window.innerWidth - inputPanel.offsetWidth - 10;
  }
  
  if (panelY < 0) {
    const rect = element.getBoundingClientRect();
    panelY = rect.bottom + window.scrollY + 10;
  }
  
  inputPanel.style.left = panelX + 'px';
  inputPanel.style.top = panelY + 'px';
  
  inputPanelPosition.x = parseInt(inputPanel.style.left);
  inputPanelPosition.y = parseInt(inputPanel.style.top);
  
  inputPanel.style.visibility = 'visible';
}

// Функция для позиционирования панели выделения
function positionSelectionPanel(selection) {
  const range = selection.getRangeAt(0);
  const rect = range.getBoundingClientRect();
  
  selectionPanel.style.display = 'flex';
  selectionPanel.style.visibility = 'hidden';
  
  const endRange = document.createRange();
  endRange.setStart(selection.focusNode, selection.focusOffset);
  endRange.setEnd(selection.focusNode, selection.focusOffset);
  const endRect = endRange.getBoundingClientRect();
  selectionPanel.style.left = endRect.right + window.scrollX + 'px';
  selectionPanel.style.top = (endRect.top + window.scrollY - selectionPanel.offsetHeight - 5) + 'px';
  
  const panelRect = selectionPanel.getBoundingClientRect();
  if (panelRect.right > window.innerWidth) selectionPanel.style.left = (window.innerWidth - panelRect.width - 10) + 'px';
  if (panelRect.top < 0) selectionPanel.style.top = (endRect.bottom + window.scrollY + 5) + 'px';
  
  selectionPanel.style.visibility = 'visible';
}

// 8. ПОКАЗ РАЗЛИЧНЫХ ТИПОВ ПАНЕЛЕЙ
function showSelectionPanel(selection) {
  if (!extensionEnabled) return;
  
  selectionPanel.innerHTML = '';
  selectionPanel.appendChild(copyButton);
  selectionPanel.appendChild(searchButton);
  positionSelectionPanel(selection);
}

function showInputPanel(inputElement, event) {
  if (!extensionEnabled || !inputElement || typeof inputElement.matches !== 'function' || isEditing) return;
  
  inputPanel.innerHTML = '';
  inputPanel.appendChild(pasteButton);
  
  const hasText = (inputElement.value && inputElement.value.length > 0) || 
                 (inputElement.textContent && inputElement.textContent.trim().length > 0);
  if (hasText) inputPanel.appendChild(selectAllButton);
  
  positionInputPanel(inputElement, event);
}

// Обработчик события input для отслеживания редактирования
document.addEventListener('input', event => {
  const target = event.target;
  
  if (target && typeof target.matches === 'function') {
    const isInputField = target.matches('input:not([type="button"]):not([type="checkbox"]):not([type="radio"]), textarea, [contenteditable="true"]');
    
    if (isInputField) {
      isEditing = true;
      inputPanel.style.display = 'none';
      
      // Сбрасываем состояние редактирования через короткий промежуток времени
      // после прекращения ввода
      if (inputPanelTimer) clearTimeout(inputPanelTimer);
      
      inputPanelTimer = setTimeout(() => {
        isEditing = false;
      }, 2000); // Ждем 2 секунды после последнего ввода
    }
  }
});

// 9. ОБРАБОТЧИКИ КНОПОК
let isPasting = false;

copyButton.addEventListener('click', () => {
  const selectedText = window.getSelection().toString().trim();
  
  navigator.clipboard.writeText(selectedText)
    .then(() => {
      selectionPanel.style.display = 'none';
    })
    .catch(err => {
      console.error('Ошибка при копировании в буфер обмена, использую запасной вариант: ', err);
      fallbackCopy(selectedText);
      selectionPanel.style.display = 'none';
    });
});

searchButton.addEventListener('click', () => {
  const selectedText = window.getSelection().toString().trim();
  
  browser.runtime.sendMessage({
    action: "performSearch",
    searchText: selectedText
  });
  selectionPanel.style.display = 'none';
});

pasteButton.addEventListener('click', () => {
  if (!currentElement) {
    inputPanel.style.display = 'none';
    return;
  }
  
  if (navigator.clipboard && navigator.clipboard.readText) {
    isPasting = true;
    
    navigator.clipboard.readText()
      .then(text => {
        pasteTextToElement(currentElement, text);
        inputPanel.style.display = 'none';
        
        setTimeout(() => {
          isPasting = false;
        }, 500);
      })
      .catch(err => {
        console.error('Ошибка при чтении буфера обмена: ', err);
        alert(messages.pasteAlertText);
        inputPanel.style.display = 'none';
        isPasting = false;
      });
  } else {
    alert(messages.pasteAlertText);
    inputPanel.style.display = 'none';
  }
});

// Обновленный обработчик для кнопки "Выделить все"
selectAllButton.addEventListener('click', (event) => {
  event.preventDefault();
  event.stopPropagation();
  
  if (!currentElement) {
    return;
  }
  
  isSelectAllActive = true;
  
  if (currentElement.matches('input, textarea')) {
    currentElement.select();
  } else if (currentElement.matches('[contenteditable="true"]')) {
    const range = document.createRange();
    range.selectNodeContents(currentElement);
    const selection = window.getSelection();
    selection.removeAllRanges();
    selection.addRange(range);
  }
  
  inputPanel.innerHTML = '';
  inputPanel.appendChild(copyButtonForInput);
  inputPanel.appendChild(cutButton);
  inputPanel.appendChild(pasteButton);
  inputPanel.appendChild(deleteButton);
  
  setTimeout(() => {
    inputPanel.style.display = 'flex';
  }, 10);
});

copyButtonForInput.addEventListener('click', () => {
  if (!currentElement) {
    inputPanel.style.display = 'none';
    isSelectAllActive = false;
    return;
  }
  
  let selectedText = '';
  
  if (currentElement.matches('input, textarea')) {
    selectedText = currentElement.value.substring(
      currentElement.selectionStart, 
      currentElement.selectionEnd
    ).trim();
  } else if (currentElement.matches('[contenteditable="true"]')) {
    selectedText = window.getSelection().toString().trim();
  }
  
  navigator.clipboard.writeText(selectedText)
    .then(() => {
      isSelectAllActive = false;
      inputPanel.style.display = 'none';
    })
    .catch(err => {
      console.error('Ошибка при копировании текста в буфер обмена, использую запасной вариант: ', err);
      fallbackCopy(selectedText);
      
      isSelectAllActive = false;
      inputPanel.style.display = 'none';
    });
});

cutButton.addEventListener('click', () => {
  if (!currentElement) {
    inputPanel.style.display = 'none';
    isSelectAllActive = false;
    return;
  }
  
  let selectedText = '';
  
  if (currentElement.matches('input, textarea')) {
    const start = currentElement.selectionStart;
    const end = currentElement.selectionEnd;
    
    selectedText = currentElement.value.substring(start, end).trim();
    
    navigator.clipboard.writeText(selectedText)
      .then(() => {
        currentElement.value = 
          currentElement.value.substring(0, start) + 
          currentElement.value.substring(end);
        
        currentElement.selectionStart = currentElement.selectionEnd = start;
        
        currentElement.dispatchEvent(new Event('input', { bubbles: true }));
        
        isSelectAllActive = false;
        inputPanel.style.display = 'none';
      })
      .catch(err => {
        console.error('Ошибка при вырезании в буфер обмена: ', err);
        
        isSelectAllActive = false;
        inputPanel.style.display = 'none';
      });
  } else if (currentElement.matches('[contenteditable="true"]')) {
    selectedText = window.getSelection().toString().trim();
    
    navigator.clipboard.writeText(selectedText)
      .then(() => {
        document.execCommand('delete');
        
        isSelectAllActive = false;
        inputPanel.style.display = 'none';
      })
      .catch(err => {
        console.error('Ошибка при вырезании contenteditable в буфер обмена: ', err);
        
        isSelectAllActive = false;
        inputPanel.style.display = 'none';
      });
  }
});

deleteButton.addEventListener('click', () => {
  if (!currentElement) {
    inputPanel.style.display = 'none';
    isSelectAllActive = false;
    return;
  }
  
  if (currentElement.matches('input, textarea')) {
    const start = currentElement.selectionStart;
    const end = currentElement.selectionEnd;
    
    currentElement.value = 
      currentElement.value.substring(0, start) + 
      currentElement.value.substring(end);
    
    currentElement.selectionStart = currentElement.selectionEnd = start;
    
    currentElement.dispatchEvent(new Event('input', { bubbles: true }));
  } else if (currentElement.matches('[contenteditable="true"]')) {
    document.execCommand('delete');
  }
  
  isSelectAllActive = false;
  inputPanel.style.display = 'none';
})

// 10. ОБРАБОТЧИКИ СОБЫТИЙ DOM
document.addEventListener('mousedown', event => {
  cursorPosition.x = event.clientX;
  cursorPosition.y = event.clientY;
  lastClickPosition.x = event.clientX;
  lastClickPosition.y = event.clientY;
  userInitiatedFocus = true;
  
  // Сбрасываем флаг первого нажатия при начале нового взаимодействия
  firstClickProcessed = false;
  
  setTimeout(() => {
    userInitiatedFocus = false;
  }, 1000);
});

document.addEventListener('selectionchange', () => {
  if (isSelectAllActive) {
    return;
  }
  
  selectionPanel.style.display = 'none';
  
  if (selectionPanelTimer) clearTimeout(selectionPanelTimer);
  
  selectionPanelTimer = setTimeout(() => {
    const activeElement = document.activeElement;
    const isInputField = activeElement && typeof activeElement.matches === 'function' && 
                        activeElement.matches('input:not([type="button"]):not([type="checkbox"]):not([type="radio"]), textarea, [contenteditable="true"]');
    
    if (!isInputField) {
      const selection = window.getSelection();
      const selectedText = selection.toString().trim();
      
      if (selectedText.length > 0) {
        showSelectionPanel(selection);
      }
    }
  }, 200);
});

function isValidInputField(element) {
  if (!element || typeof element.matches !== 'function') return false;
  
  return element.matches('input:not([type="button"]):not([type="checkbox"]):not([type="radio"]):not([type="file"]):not([type="submit"]):not([type="reset"]):not([type="image"]), textarea')
    || (element.matches('[contenteditable="true"]') && !element.closest('button, a, .button, [role="button"]'))
    || (element.tagName && element.tagName.toLowerCase() === 'div' && element.getAttribute('role') === 'textbox');
}

// Улучшенная функция для показа панели ввода
function showInputPanel(inputElement, event) {
  if (!extensionEnabled || !inputElement || !isValidInputField(inputElement) || isEditing) return;
  
  currentElement = inputElement;
  
  inputPanel.innerHTML = '';
  inputPanel.appendChild(pasteButton);
  
  const hasText = 
    (inputElement.value && inputElement.value.length > 0) || 
    (inputElement.textContent && inputElement.textContent.trim().length > 0);
  
  if (hasText) inputPanel.appendChild(selectAllButton);
  
  positionInputPanel(inputElement, event);
}

document.addEventListener('click', event => {
  const target = event.target;
  
  const clickedInSelectionPanel = selectionPanel.contains(target);
  const clickedInInputPanel = inputPanel.contains(target);
  
  if (!clickedInSelectionPanel && !clickedInInputPanel) {
    if (selectionPanel.style.display !== 'none') {
      selectionPanel.style.display = 'none';
    }
    
    if (inputPanel.style.display !== 'none' && !isSelectAllActive) {
      inputPanel.style.display = 'none';
    } else if (inputPanel.style.display !== 'none' && isSelectAllActive) {
      isSelectAllActive = false;
      inputPanel.style.display = 'none';
    }
  }
  
  if (!target) return;
  
  if (isValidInputField(target) && !isPasting && !isEditing && !isSelectAllActive) {
    currentElement = target;
    
    // Обрабатываем нажатие на поле ввода
    // Устанавливаем флаг firstClickProcessed в true
    firstClickProcessed = true;
    
    setTimeout(() => {
      if (isPasting || isEditing || isSelectAllActive) {
        return;
      }
      showInputPanel(target, event);
    }, 100);
  }
});

// Модификация обработчика события focus
document.addEventListener('focus', event => {
  const target = event.target;
  
  if (userInitiatedFocus && isValidInputField(target) && !isPasting && !isEditing && !isSelectAllActive) {
    currentElement = target;
    
    // Важно: теперь всегда показываем панель при фокусе на элемент
    setTimeout(() => {
      if (isPasting || isEditing || isSelectAllActive) {
        return;
      }
      
      // Показываем панель независимо от того, было ли первое нажатие
      showInputPanel(target, null);
    }, 200);
  }
}, true);

// Новый обработчик для mouseup - показывает панель даже при первом клике
document.addEventListener('mouseup', event => {
  const target = event.target;
  
  // Проверка валидности поля ввода и отсутствия активных операций
  if (isValidInputField(target) && !isPasting && !isEditing && !isSelectAllActive) {
    currentElement = target;
    
    // Если у элемента есть текст, показываем панель
    const hasText = 
      (target.value && target.value.length > 0) || 
      (target.textContent && target.textContent.trim().length > 0);
    
    if (hasText) {
      setTimeout(() => {
        if (isPasting || isEditing || isSelectAllActive) {
          return;
        }
        showInputPanel(target, event);
      }, 100);
    }
  }
});

window.addEventListener('scroll', () => {
  if (selectionPanel.style.display !== 'none') {
    selectionPanel.style.display = 'none';
  }
  
  if (inputPanel.style.display !== 'none' && !isSelectAllActive) {
    inputPanel.style.display = 'none';
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
    selectionPanel.style.display = 'none';
    inputPanel.style.display = 'none';
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
