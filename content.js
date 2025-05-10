// Создаем элементы панели
let panel = document.createElement('div');
panel.id = 'text-selection-panel';
panel.style.display = 'none';
document.body.appendChild(panel);

// Объявляем переменную для хранения текущих цветов темы
let themeColors = {
  toolbar: {
    bgcolor: "#f9f9fa",  // Значения по умолчанию
    color: "#0c0c0d",
    border: "#ccc"
  },
  button: {
    hover: "rgba(0, 0, 0, 0.1)",
    active: "rgba(0, 0, 0, 0.2)"
  }
};

// Слушаем сообщения от background script
browser.runtime.onMessage.addListener((message) => {
  if (message.action === "themeColors" && message.colors) {
    themeColors = message.colors;
    // Обновляем стили панели и кнопок
    updateColors();
    // Применяем цвета сразу, не дожидаясь вызова функции обновления
    applyInitialStyles();
  }
});

// Запрашиваем цвета текущей темы при загрузке страницы
browser.runtime.sendMessage({ action: "getThemeColors" });

// Функция для начального применения стилей
function applyInitialStyles() {
  // Устанавливаем стили панели в соответствии с темой
  panel.style.backgroundColor = themeColors.toolbar.bgcolor;
  panel.style.color = themeColors.toolbar.color;
  panel.style.borderColor = themeColors.toolbar.border;
  
  // Устанавливаем стили кнопок
  [copyButton, searchButton, cutButton, pasteButton, deleteButton, selectAllButton].forEach(button => {
    button.style.color = themeColors.toolbar.color;
    button.style.backgroundColor = "transparent";
  });
}

// Инициализируем сообщения для интернационализации
let messages = {
  copyButtonText: browser.i18n.getMessage("copyButtonText") || "Copy",
  searchButtonText: browser.i18n.getMessage("searchButtonText") || "Search",
  cutButtonText: browser.i18n.getMessage("cutButtonText") || "Cut",
  pasteButtonText: browser.i18n.getMessage("pasteButtonText") || "Paste",
  deleteButtonText: browser.i18n.getMessage("deleteButtonText") || "Delete",
  selectAllButtonText: browser.i18n.getMessage("selectAllButtonText") || "Select all",
  pasteAlertText: browser.i18n.getMessage("pasteAlertText") || "To paste, please use Ctrl+V keyboard shortcut"
};

// Создаем кнопки для выделения текста
let copyButton = document.createElement('button');
copyButton.textContent = messages.copyButtonText;
copyButton.classList.add('panel-button');

let searchButton = document.createElement('button');
searchButton.textContent = messages.searchButtonText;
searchButton.classList.add('panel-button');

// Создаем кнопки для полей ввода
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

// Таймер для отсрочки показа панели (предотвращает мерцание при выделении)
let panelTimer = null;
let currentMode = null; // 'selection', 'input' или 'input-selection'
let currentElement = null; // Текущий элемент, на котором фокус

// Добавляем флаг, чтобы отслеживать, когда выделение было инициировано кнопкой "Выделить все"
let selectAllTriggered = false;
// Добавляем переменную для хранения последнего клика мыши
let lastClickPosition = { x: 0, y: 0 };

// Обработчик клика мыши для запоминания позиции
document.addEventListener('mousedown', function(event) {
  lastClickPosition.x = event.clientX;
  lastClickPosition.y = event.clientY;
});

// Обработчик выделения текста
document.addEventListener('selectionchange', function() {
  // Если выделение было инициировано кнопкой "Выделить все", пропускаем обработку
  if (selectAllTriggered) {
    return;
  }
  
  // Скрываем панель при изменении выделения
  panel.style.display = 'none';
  
  // Отменяем предыдущий таймер, если он был установлен
  if (panelTimer) {
    clearTimeout(panelTimer);
  }
  
  // Устанавливаем новый таймер для показа панели после окончания выделения
  panelTimer = setTimeout(function() {
    const selection = window.getSelection();
    const selectedText = selection.toString().trim();
    
    if (selectedText.length > 0) {
      // Проверяем, где происходит выделение
      const activeElement = document.activeElement;
      const isInputField = activeElement.matches('input:not([type="button"]):not([type="checkbox"]):not([type="radio"]), textarea, [contenteditable="true"]');
      
      if (isInputField) {
        // Выделение в поле ввода
        currentElement = activeElement;
        showInputSelectionPanel(selection);
      } else {
        // Выделение обычного текста на странице
        showSelectionPanel(selection);
      }
    }
  }, 200);
});

// Функция для показа панели выделения текста на странице
function showSelectionPanel(selection) {
  currentMode = 'selection';
  
  // Очищаем панель от предыдущих кнопок
  panel.innerHTML = '';
  
  // Добавляем кнопки для выделенного текста
  panel.appendChild(copyButton);
  panel.appendChild(searchButton);
  
  positionPanel(selection);
}

// Функция для показа панели выделения текста в полях ввода
function showInputSelectionPanel(selection) {
  currentMode = 'input-selection';
  
  // Очищаем панель от предыдущих кнопок
  panel.innerHTML = '';
  
  // Добавляем кнопки для выделенного текста в поле ввода
  panel.appendChild(copyButton);
  panel.appendChild(cutButton);
  panel.appendChild(pasteButton);
  panel.appendChild(deleteButton);
  panel.appendChild(selectAllButton);
  
  positionPanel(selection);
}

// Функция позиционирования панели
function positionPanel(selection) {
  // Получаем координаты выделения
  const range = selection.getRangeAt(0);
  const rect = range.getBoundingClientRect();
  
  // Сначала добавляем панель в DOM с отображением, чтобы получить её размеры
  panel.style.display = 'flex';
  panel.style.visibility = 'hidden'; // Скрываем визуально, но размеры можно измерить
  
  // Получаем координаты конца выделения
  const endRange = document.createRange();
  endRange.setStart(selection.focusNode, selection.focusOffset);
  endRange.setEnd(selection.focusNode, selection.focusOffset);
  const endRect = endRange.getBoundingClientRect();

  // Позиционируем панель над концом выделения
  panel.style.left = endRect.right + window.scrollX + 'px';
  panel.style.top = (endRect.top + window.scrollY - panel.offsetHeight - 5) + 'px';
  
  // Проверяем, не выходит ли панель за пределы экрана
  const panelRect = panel.getBoundingClientRect();
  
  // Если панель выходит за правый край экрана
  if (panelRect.right > window.innerWidth) {
    panel.style.left = (window.innerWidth - panelRect.width - 10) + 'px';
  }
  
  // Если панель выходит за верхний край экрана, показываем её под текстом
  if (panelRect.top < 0) {
    panel.style.top = (endRect.bottom + window.scrollY + 5) + 'px';
  }
  
  // Показываем панель
  panel.style.visibility = 'visible';
}

// Обработчик для полей ввода (клик)
document.addEventListener('click', function(event) {
  const target = event.target;
  
  // Проверяем, является ли элемент полем ввода
  if (target.matches('input:not([type="button"]):not([type="checkbox"]):not([type="radio"]), textarea, [contenteditable="true"]')) {
    // Устанавливаем текущий элемент
    currentElement = target;
    
    // Проверяем, есть ли выделенный текст
    setTimeout(() => {
      const selectedText = getSelectedTextFromElement(target);
      if (selectedText && selectedText.length > 0) {
        // Если текст выделен, показываем панель с кнопками для выделения в поле ввода
        showInputSelectionPanel(window.getSelection());
      } else {
        // Если текст не выделен, показываем панель вставки
        showPastePanel(target, event);
      }
    }, 100);
  } else if (!panel.contains(event.target) && panel.style.display !== 'none') {
    // Скрываем панель при клике вне панели и вне полей ввода
    panel.style.display = 'none';
  }
});

// Добавляем обработчик события focus для полей ввода
document.addEventListener('focus', function(event) {
  const target = event.target;
  
  // Проверяем, является ли элемент полем ввода
  if (target.matches('input:not([type="button"]):not([type="checkbox"]):not([type="radio"]), textarea, [contenteditable="true"]')) {
    // Устанавливаем текущий элемент
    currentElement = target;
    
    // Проверяем, есть ли выделенный текст
    setTimeout(() => {
      const selectedText = getSelectedTextFromElement(target);
      if (selectedText && selectedText.length > 0) {
        // Если текст выделен, показываем панель с кнопками для выделения в поле ввода
        showInputSelectionPanel(window.getSelection());
      } else {
        // Если текст не выделен, показываем панель вставки, используя последние координаты клика
        showPastePanel(target, null);
      }
    }, 100);
  }
}, true);

// Функция для получения выделенного текста из элемента
function getSelectedTextFromElement(element) {
  if (element.matches('input, textarea')) {
    return element.value.substring(element.selectionStart, element.selectionEnd);
  } else if (element.matches('[contenteditable="true"]')) {
    return window.getSelection().toString();
  }
  return '';
}

// Функция для показа панели вставки (когда нет выделения в поле ввода)
function showPastePanel(inputElement, event) {
  // Если нет доступа к буферу обмена, не показываем панель
  if (!navigator.clipboard) {
    return;
  }
  
  currentMode = 'input';
  
  // Очищаем панель от предыдущих кнопок
  panel.innerHTML = '';
  
  // Добавляем кнопку вставки
  panel.appendChild(pasteButton);
  
  // Добавляем "Выделить все" только если в поле есть текст
  const hasText = (inputElement.value && inputElement.value.length > 0) || 
                  (inputElement.textContent && inputElement.textContent.trim().length > 0);
  
  if (hasText) {
    panel.appendChild(selectAllButton);
  }
  
  // Показываем панель для измерения размеров
  panel.style.display = 'flex';
  panel.style.visibility = 'hidden';
  
  // Позиционируем панель рядом с курсором или координатами клика
  if (event) {
    // Если у нас есть событие клика, используем его координаты
    panel.style.left = (event.clientX + window.scrollX) + 'px';
    panel.style.top = (event.clientY + window.scrollY - panel.offsetHeight - 5) + 'px';
  } else if (lastClickPosition.x !== 0 || lastClickPosition.y !== 0) {
    // Если нет события, но есть сохраненные координаты клика
    panel.style.left = (lastClickPosition.x + window.scrollX) + 'px';
    panel.style.top = (lastClickPosition.y + window.scrollY - panel.offsetHeight - 5) + 'px';
  } else {
    // Если нет ни события, ни сохраненных координат, используем координаты каретки
    // Попытка получить координаты каретки
    let cursorPos = getCursorCoordinates(inputElement);
    if (cursorPos) {
      panel.style.left = (cursorPos.left + window.scrollX) + 'px';
      panel.style.top = (cursorPos.top + window.scrollY - panel.offsetHeight - 5) + 'px';
    } else {
      // Запасной вариант: используем координаты элемента
      const rect = inputElement.getBoundingClientRect();
      panel.style.left = (rect.left + window.scrollX) + 'px';
      panel.style.top = (rect.top + window.scrollY - panel.offsetHeight - 5) + 'px';
    }
  }
  
  // Проверяем, не выходит ли панель за пределы экрана
  const panelRect = panel.getBoundingClientRect();
  
  // Если панель выходит за правый край экрана
  if (panelRect.right > window.innerWidth) {
    panel.style.left = (window.innerWidth - panelRect.width - 10) + 'px';
  }
  
  // Если панель выходит за левый край экрана
  if (panelRect.left < 0) {
    panel.style.left = window.scrollX + 5 + 'px';
  }
  
  // Если панель выходит за верхний край экрана
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
  
  // Показываем панель
  panel.style.visibility = 'visible';
}

// Функция для получения координат текстового курсора
function getCursorCoordinates(element) {
  if (!element) return null;
  
  // Для input и textarea
  if (element.matches('input, textarea')) {
    // Создаем временный элемент для измерения
    const temp = document.createElement('div');
    temp.style.position = 'absolute';
    temp.style.visibility = 'hidden';
    temp.style.whiteSpace = 'pre';
    temp.style.font = getComputedStyle(element).font;
    temp.style.paddingLeft = getComputedStyle(element).paddingLeft;
    temp.style.paddingTop = getComputedStyle(element).paddingTop;
    
    // Клонируем стили элемента
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
  
  // Для contenteditable
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

// Обработчик клика на кнопку "Копировать"
copyButton.addEventListener('click', function() {
  const selectedText = window.getSelection().toString().trim();
  navigator.clipboard.writeText(selectedText)
    .then(() => {
      // Скрываем панель после копирования
      panel.style.display = 'none';
    })
    .catch(err => {
      console.error('Ошибка при копировании: ', err);
      
      // Альтернативный метод копирования
      fallbackCopy(selectedText);
      panel.style.display = 'none';
    });
});

// Обработчик клика на кнопку "Вырезать"
cutButton.addEventListener('click', function() {
  if (!currentElement) {
    panel.style.display = 'none';
    return;
  }
  
  const selectedText = getSelectedTextFromElement(currentElement);
  
  // Копируем текст в буфер обмена
  navigator.clipboard.writeText(selectedText)
    .then(() => {
      // Вырезаем текст из поля ввода
      deleteSelectedText(currentElement);
      panel.style.display = 'none';
    })
    .catch(err => {
      console.error('Ошибка при вырезании: ', err);
      fallbackCut(currentElement);
      panel.style.display = 'none';
    });
});

// Резервный метод вырезания
function fallbackCut(element) {
  try {
    // Сначала пробуем использовать execCommand
    document.execCommand('cut');
  } catch (err) {
    console.error('Ошибка при резервном вырезании: ', err);
    
    // Если не получилось, то делаем копирование + удаление
    const selectedText = getSelectedTextFromElement(element);
    fallbackCopy(selectedText);
    deleteSelectedText(element);
  }
}

// Функция для удаления выделенного текста
function deleteSelectedText(element) {
  if (element.matches('input, textarea')) {
    const start = element.selectionStart;
    const end = element.selectionEnd;
    element.value = element.value.substring(0, start) + element.value.substring(end);
    element.selectionStart = element.selectionEnd = start;
  } else if (element.matches('[contenteditable="true"]')) {
    document.execCommand('delete');
  }
  
  // Создаем событие изменения input
  const event = new Event('input', { bubbles: true });
  element.dispatchEvent(event);
}

// Обработчик клика на кнопку "Удалить"
deleteButton.addEventListener('click', function() {
  if (!currentElement) {
    panel.style.display = 'none';
    return;
  }
  
  deleteSelectedText(currentElement);
  panel.style.display = 'none';
});

// Обработчик клика на кнопку "Выделить все"
selectAllButton.addEventListener('click', function() {
  if (!currentElement) {
    panel.style.display = 'none';
    return;
  }
  
  // Устанавливаем флаг перед выделением
  selectAllTriggered = true;
  
  // Выделяем весь текст
  if (currentElement.matches('input, textarea')) {
    currentElement.select();
  } else if (currentElement.matches('[contenteditable="true"]')) {
    const range = document.createRange();
    range.selectNodeContents(currentElement);
    const selection = window.getSelection();
    selection.removeAllRanges();
    selection.addRange(range);
  }
  
  // Скрываем панель на время выделения
  panel.style.display = 'none';
  
  // Показываем обновленную панель с нужными кнопками
  setTimeout(() => {
    // Очищаем панель от предыдущих кнопок
    panel.innerHTML = '';
    
    // Добавляем только нужные кнопки: Копировать, Вырезать, Вставить, Удалить
    panel.appendChild(copyButton);
    panel.appendChild(cutButton);
    panel.appendChild(pasteButton);
    panel.appendChild(deleteButton);
    
    // Используем координаты элемента для позиционирования
    const rect = currentElement.getBoundingClientRect();
    const selection = window.getSelection();
    let panelX, panelY;
    
    if (selection.rangeCount > 0) {
      // Используем координаты выделения
      const range = selection.getRangeAt(0);
      const selectionRect = range.getBoundingClientRect();
      panelX = selectionRect.right + window.scrollX;
      panelY = selectionRect.top + window.scrollY - panel.offsetHeight - 5;
    } else {
      // Используем координаты элемента
      panelX = rect.right + window.scrollX;
      panelY = rect.top + window.scrollY - panel.offsetHeight - 5;
    }
    
    // Показываем панель для измерения размеров
    panel.style.display = 'flex';
    panel.style.visibility = 'hidden';
    panel.style.left = panelX + 'px';
    panel.style.top = panelY + 'px';
    
    // Проверяем, не выходит ли панель за пределы экрана
    const panelRect = panel.getBoundingClientRect();
    
    // Если панель выходит за правый край экрана
    if (panelRect.right > window.innerWidth) {
      panel.style.left = (window.innerWidth - panelRect.width - 10) + 'px';
    }
    
    // Если панель выходит за левый край экрана
    if (panelRect.left < 0) {
      panel.style.left = window.scrollX + 5 + 'px';
    }
    
    // Если панель выходит за верхний край экрана
    if (panelRect.top < 0) {
      panel.style.top = (rect.bottom + window.scrollY + 5) + 'px';
    }
    
    // Показываем панель
    panel.style.visibility = 'visible';
    
    // Устанавливаем режим
    currentMode = 'input-selection';
    
    // Сбрасываем флаг через небольшую задержку
    setTimeout(() => {
      selectAllTriggered = false;
    }, 500);
  }, 100);
});

// Резервный метод копирования для Firefox
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

// Обработчик клика на кнопку "Поиск"
searchButton.addEventListener('click', function() {
  const selectedText = window.getSelection().toString().trim();
  const searchUrl = `https://www.google.com/search?q=${encodeURIComponent(selectedText)}`;
  window.open(searchUrl, '_blank');
  panel.style.display = 'none';
});

// Обработчик клика на кнопку "Вставить"
pasteButton.addEventListener('click', function() {
  if (!currentElement) {
    panel.style.display = 'none';
    return;
  }
  
  // Пробуем использовать API буфера обмена
  if (navigator.clipboard && navigator.clipboard.readText) {
    navigator.clipboard.readText()
      .then(text => {
        pasteTextToElement(currentElement, text);
        panel.style.display = 'none';
      })
      .catch(err => {
        console.error('Ошибка при чтении буфера обмена: ', err);
        // В Firefox нужны особые разрешения для чтения буфера обмена,
        // поэтому мы предлагаем пользователю использовать Ctrl+V
        alert(messages.pasteAlertText);
        panel.style.display = 'none';
      });
  } else {
    // Если API недоступен, предлагаем использовать Ctrl+V
    alert(messages.pasteAlertText);
    panel.style.display = 'none';
  }
});

// Функция для вставки текста в элемент
function pasteTextToElement(element, text) {
  if (element.matches('textarea, [contenteditable="true"]')) {
    // Для textarea и contenteditable элементов
    if (document.activeElement === element) {
      // Если элемент в фокусе, используем Selection API
      const start = element.selectionStart || 0;
      const end = element.selectionEnd || 0;
      
      if (typeof element.value !== 'undefined') {
        // Стандартные input и textarea элементы
        element.value = element.value.substring(0, start) + text + element.value.substring(end);
        element.selectionStart = element.selectionEnd = start + text.length;
      } else {
        // Contenteditable элементы
        document.execCommand('insertText', false, text);
      }
    } else {
      // Если элемент не в фокусе
      element.focus();
      document.execCommand('insertText', false, text);
    }
  } else if (element.matches('input')) {
    // Для обычных input элементов
    const start = element.selectionStart || 0;
    const end = element.selectionEnd || 0;
    element.value = element.value.substring(0, start) + text + element.value.substring(end);
    element.selectionStart = element.selectionEnd = start + text.length;
  }
  
  // Создаем событие изменения input
  const event = new Event('input', { bubbles: true });
  element.dispatchEvent(event);
}

// Добавляем обработчик двойного клика для полей ввода
document.addEventListener('dblclick', function(event) {
  const target = event.target;
  
  // Проверяем, является ли элемент полем ввода
  if (target.matches('input:not([type="button"]):not([type="checkbox"]):not([type="radio"]), textarea, [contenteditable="true"]')) {
    // Предотвращаем конфликты с существующим кодом выделения текста
    event.preventDefault();
    
    // Устанавливаем флаг перед выделением
    selectAllTriggered = true;
    
    // Устанавливаем текущий элемент
    currentElement = target;
    
    // Выделяем весь текст
    if (target.matches('input, textarea')) {
      target.select();
    } else if (target.matches('[contenteditable="true"]')) {
      const range = document.createRange();
      range.selectNodeContents(target);
      const selection = window.getSelection();
      selection.removeAllRanges();
      selection.addRange(range);
    }
    
    // Скрываем панель на время выделения
    panel.style.display = 'none';
    
    // Показываем обновленную панель с нужными кнопками
    setTimeout(() => {
      // Очищаем панель от предыдущих кнопок
      panel.innerHTML = '';
      
      // Добавляем только нужные кнопки: Копировать, Вырезать, Вставить, Удалить
      panel.appendChild(copyButton);
      panel.appendChild(cutButton);
      panel.appendChild(pasteButton);
      panel.appendChild(deleteButton);
      
      // Используем координаты элемента для позиционирования
      const rect = target.getBoundingClientRect();
      const selection = window.getSelection();
      let panelX, panelY;
      
      if (selection.rangeCount > 0) {
        // Используем координаты выделения
        const range = selection.getRangeAt(0);
        const selectionRect = range.getBoundingClientRect();
        panelX = selectionRect.right + window.scrollX;
        panelY = selectionRect.top + window.scrollY - panel.offsetHeight - 5;
      } else {
        // Используем координаты элемента
        panelX = rect.right + window.scrollX;
        panelY = rect.top + window.scrollY - panel.offsetHeight - 5;
      }
      
      // Показываем панель для измерения размеров
      panel.style.display = 'flex';
      panel.style.visibility = 'hidden';
      panel.style.left = panelX + 'px';
      panel.style.top = panelY + 'px';
      
      // Проверяем, не выходит ли панель за пределы экрана
      const panelRect = panel.getBoundingClientRect();
      
      // Если панель выходит за правый край экрана
      if (panelRect.right > window.innerWidth) {
        panel.style.left = (window.innerWidth - panelRect.width - 10) + 'px';
      }
      
      // Если панель выходит за левый край экрана
      if (panelRect.left < 0) {
        panel.style.left = window.scrollX + 5 + 'px';
      }
      
      // Если панель выходит за верхний край экрана
      if (panelRect.top < 0) {
        panel.style.top = (rect.bottom + window.scrollY + 5) + 'px';
      }
      
      // Показываем панель
      panel.style.visibility = 'visible';
      
      // Устанавливаем режим
      currentMode = 'input-selection';
      
      // Сбрасываем флаг через небольшую задержку
      setTimeout(() => {
        selectAllTriggered = false;
      }, 500);
    }, 100);
  }
});

// Скрытие панели при нажатии Escape
document.addEventListener('keydown', function(event) {
  if (event.key === 'Escape' && panel.style.display !== 'none') {
    panel.style.display = 'none';
  }
});

// Скрытие панели при потере фокуса поля ввода
document.addEventListener('focusout', function(event) {
  // Если панель показана и режим - поле ввода
  if (panel.style.display !== 'none' && (currentMode === 'input' || currentMode === 'input-selection')) {
    // Проверяем, что фокус не перешел на панель
    setTimeout(() => {
      if (!panel.contains(document.activeElement)) {
        panel.style.display = 'none';
      }
    }, 100);
  }
});

// Отслеживаем события прокрутки страницы для скрытия панели
window.addEventListener('scroll', function() {
  if (panel.style.display !== 'none') {
    panel.style.display = 'none';
  }
}, true);

// Обрабатываем изменение темы Firefox
function updateColors() {
  // Применяем цвета темы к панели и кнопкам
  panel.style.backgroundColor = themeColors.toolbar.bgcolor;
  panel.style.color = themeColors.toolbar.color;
  panel.style.borderColor = themeColors.toolbar.border;
  
  // Обновляем стили всех кнопок
  [copyButton, searchButton, cutButton, pasteButton, deleteButton, selectAllButton].forEach(button => {
    button.style.color = themeColors.toolbar.color;
    button.style.backgroundColor = "transparent";
    
    // Удаляем старые обработчики событий, чтобы избежать их накопления
    button.onmouseenter = null;
    button.onmouseleave = null;
    button.onmousedown = null;
    button.onmouseup = null;
    
    // Добавляем новые обработчики
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

// Первоначальное применение цветов темы
updateColors();
