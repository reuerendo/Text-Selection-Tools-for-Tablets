// Создаем элементы панели
let panel = document.createElement('div');
panel.id = 'text-selection-panel';
panel.style.display = 'none';
document.body.appendChild(panel);

// Создаем кнопки для выделения текста
let copyButton = document.createElement('button');
copyButton.textContent = 'Копировать';
copyButton.classList.add('panel-button');

let searchButton = document.createElement('button');
searchButton.textContent = 'Поиск';
searchButton.classList.add('panel-button');

// Создаем кнопки для полей ввода
let cutButton = document.createElement('button');
cutButton.textContent = 'Вырезать';
cutButton.classList.add('panel-button');

let pasteButton = document.createElement('button');
pasteButton.textContent = 'Вставить';
pasteButton.classList.add('panel-button');

let deleteButton = document.createElement('button');
deleteButton.textContent = 'Удалить';
deleteButton.classList.add('panel-button');

let selectAllButton = document.createElement('button');
selectAllButton.textContent = 'Выделить все';
selectAllButton.classList.add('panel-button');

// Таймер для отсрочки показа панели (предотвращает мерцание при выделении)
let panelTimer = null;
let currentMode = null; // 'selection', 'input' или 'input-selection'
let currentElement = null; // Текущий элемент, на котором фокус

// Добавляем флаг, чтобы отслеживать, когда выделение было инициировано кнопкой "Выделить все"
let selectAllTriggered = false;

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
        showPastePanel(target);
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
        // Если текст не выделен, показываем панель вставки
        showPastePanel(target);
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
function showPastePanel(inputElement) {
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
  
  // Получаем координаты поля ввода
  const rect = inputElement.getBoundingClientRect();
  
  // Показываем панель для измерения размеров
  panel.style.display = 'flex';
  panel.style.visibility = 'hidden';
  
  // Позиционируем панель над полем ввода
  panel.style.left = rect.right + window.scrollX - panel.offsetWidth + 'px';
  panel.style.top = (rect.top + window.scrollY - panel.offsetHeight - 5) + 'px';
  
  // Проверяем, не выходит ли панель за пределы экрана
  const panelRect = panel.getBoundingClientRect();
  
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
    
    // Получаем координаты поля ввода
    const rect = currentElement.getBoundingClientRect();
    
    // Показываем панель для измерения размеров
    panel.style.display = 'flex';
    panel.style.visibility = 'hidden';
    
    // Позиционируем панель рядом с полем ввода
    panel.style.left = rect.right + window.scrollX - panel.offsetWidth + 'px';
    panel.style.top = (rect.top + window.scrollY - panel.offsetHeight - 5) + 'px';
    
    // Проверяем, не выходит ли панель за пределы экрана
    const panelRect = panel.getBoundingClientRect();
    
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
        alert('Для вставки, пожалуйста, используйте сочетание клавиш Ctrl+V');
        panel.style.display = 'none';
      });
  } else {
    // Если API недоступен, предлагаем использовать Ctrl+V
    alert('Для вставки, пожалуйста, используйте сочетание клавиш Ctrl+V');
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
  // Получаем текущие цвета темы браузера
  const computedStyle = getComputedStyle(document.documentElement);
  
  // Обновляем стили элементов панели
  panel.style.backgroundColor = computedStyle.getPropertyValue('--toolbar-bgcolor') || '#f9f9fa';
  panel.style.color = computedStyle.getPropertyValue('--toolbar-color') || '#0c0c0d';
  
  // Обновляем стили всех кнопок
  [copyButton, searchButton, cutButton, pasteButton, deleteButton, selectAllButton].forEach(button => {
    button.style.color = computedStyle.getPropertyValue('--toolbar-color') || '#0c0c0d';
    button.style.backgroundColor = computedStyle.getPropertyValue('--toolbar-bgcolor') || '#f9f9fa';
  });
}

// Первоначальное применение цветов темы
updateColors();
