// Основной контент-скрипт расширения

// Глобальные переменные
let selectionMenu = null;
let pastePanel = null;
let themeColors = {
  background: "#ffffff",
  text: "#000000",
  border: "#d7d7db",
  accent: "#0060df"
};

// Загрузить цвета темы Firefox
browser.runtime.sendMessage({ action: "getThemeColors" })
  .then(response => {
    if (response && response.colors) {
      themeColors = response.colors;
    }
    initMenus();
  });

// Инициализация меню
function initMenus() {
  // Создаем меню выделения, если оно еще не существует
  if (!selectionMenu) {
    selectionMenu = createSelectionMenu();
    document.body.appendChild(selectionMenu);
  }

  // Создаем панель вставки, если она еще не существует
  if (!pastePanel) {
    pastePanel = createPastePanel();
    document.body.appendChild(pastePanel);
  }
}

// Создание меню выделения
function createSelectionMenu() {
  const menu = document.createElement('div');
  menu.id = 'text-selection-menu';
  menu.className = 'text-selection-menu';
  menu.style.display = 'none';
  return menu;
}

// Создание панели вставки
function createPastePanel() {
  const panel = document.createElement('div');
  panel.id = 'paste-panel';
  panel.className = 'text-selection-menu';
  panel.style.display = 'none';
  
  const pasteButton = createButton('Вставить', pasteText);
  pasteButton.innerHTML = getSVGIcon('paste') + ' Вставить';
  panel.appendChild(pasteButton);
  
  return panel;
}

// Обновление содержимого меню в зависимости от контекста
function updateSelectionMenu(isInputField) {
  const menu = selectionMenu;
  menu.innerHTML = '';

  if (isInputField) {
    // Если текст выделен в поле ввода
    menu.appendChild(createButton('Копировать', copyText));
    menu.appendChild(createButton('Вырезать', cutText));
    menu.appendChild(createButton('Вставить', pasteText));
    menu.appendChild(createButton('Удалить', deleteText));
    menu.appendChild(createButton('Выделить все', selectAll));
  } else {
    // Если текст выделен на странице
    menu.appendChild(createButton('Копировать', copyText));
    menu.appendChild(createButton('Поиск', searchText));
  }
}

// Создание кнопки
function createButton(text, clickHandler) {
  const button = document.createElement('button');
  
  // Добавляем соответствующую иконку в зависимости от типа кнопки
  let iconType = text.toLowerCase();
  button.innerHTML = getSVGIcon(iconType) + ' ' + text;
  
  button.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    clickHandler();
    hideMenus();
  });
  
  return button;
}

// Получить SVG иконку по типу
function getSVGIcon(type) {
  const icons = {
    'копировать': '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"></path></svg>',
    'вырезать': '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="6" cy="6" r="3"></circle><circle cx="6" cy="18" r="3"></circle><line x1="20" y1="4" x2="8.12" y2="15.88"></line><line x1="14.47" y1="14.48" x2="20" y2="20"></line><line x1="8.12" y1="8.12" x2="12" y2="12"></line></svg>',
    'вставить': '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M16 4h2a2 2 0 012 2v14a2 2 0 01-2 2H6a2 2 0 01-2-2V6a2 2 0 012-2h2"></path><rect x="8" y="2" width="8" height="4" rx="1" ry="1"></rect></svg>',
    'удалить': '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"></path></svg>',
    'выделить все': '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 3h18v18H3z"></path></svg>',
    'поиск': '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>'
  };
  
  return icons[type] || '';
}

// Функции действий
function copyText() {
  document.execCommand('copy');
}

function cutText() {
  document.execCommand('cut');
}

function pasteText() {
  document.execCommand('paste');
}

function deleteText() {
  document.execCommand('delete');
}

function selectAll() {
  if (document.activeElement) {
    if (document.activeElement.select) {
      document.activeElement.select();
    } else {
      const range = document.createRange();
      range.selectNodeContents(document.activeElement);
      const selection = window.getSelection();
      selection.removeAllRanges();
      selection.addRange(range);
    }
  }
}

function searchText() {
  const selectedText = window.getSelection().toString();
  if (selectedText) {
    const searchUrl = `https://www.google.com/search?q=${encodeURIComponent(selectedText)}`;
    window.open(searchUrl, '_blank');
  }
}

// Найти конечную точку выделения
function getSelectionEndPoint() {
  const selection = window.getSelection();
  if (!selection.rangeCount) return null;
  
  const range = selection.getRangeAt(0);
  const endContainer = range.endContainer;
  const endOffset = range.endOffset;
  
  // Создаем временный диапазон, чтобы получить координаты конечной точки
  const tempRange = document.createRange();
  tempRange.setStart(endContainer, endOffset);
  tempRange.setEnd(endContainer, endOffset);
  
  // Получаем прямоугольник для этой точки
  const rects = tempRange.getClientRects();
  if (rects.length > 0) {
    return {
      x: rects[0].right,
      y: rects[0].bottom
    };
  }
  
  // Если не удалось получить прямоугольник, используем getBoundingClientRect
  const rect = range.getBoundingClientRect();
  return {
    x: rect.right,
    y: rect.bottom
  };
}

// Показать меню выделения
function showSelectionMenu(isInputField) {
  updateSelectionMenu(isInputField);
  const menu = selectionMenu;
  
  // Применяем цвета активной темы
  applyThemeStyles(menu);
  
  // Получаем позицию конечной точки выделения
  const endPoint = getSelectionEndPoint();
  if (!endPoint) return;
  
  // Размещаем меню так, чтобы не закрывать выделение
  menu.style.display = 'flex';
  menu.style.opacity = '0'; // Делаем прозрачным для измерения размеров
  
  const x = endPoint.x;
  const y = endPoint.y - 10; // Немного выше конечной точки
  
  menu.style.left = `${x}px`;
  menu.style.top = `${y - menu.offsetHeight}px`;
  
  // Проверка границ экрана
  const menuRect = menu.getBoundingClientRect();
  
  // Проверка правой границы
  if (menuRect.right > window.innerWidth) {
    menu.style.left = `${window.innerWidth - menuRect.width - 5}px`;
  }
  
  // Проверка левой границы
  if (menuRect.left < 0) {
    menu.style.left = '5px';
  }
  
  // Проверка верхней границы
  if (menuRect.top < 0) {
    // Если меню не помещается сверху, показываем его под выделением
    menu.style.top = `${y + 10}px`;
  }
  
  menu.style.opacity = '1'; // Делаем видимым после расчета позиции
}

// Показать панель вставки
function showPastePanel(x, y) {
  const panel = pastePanel;
  
  // Применяем цвета активной темы
  applyThemeStyles(panel);
  
  // Получаем позицию активного элемента
  const activeElement = document.activeElement;
  let elementRect = null;
  
  if (activeElement) {
    elementRect = activeElement.getBoundingClientRect();
  }
  
  // Позиционирование панели выше активного элемента
  panel.style.display = 'flex';
  panel.style.opacity = '0'; // Для измерения размеров
  
  panel.style.left = `${x}px`;
  
  if (elementRect) {
    // Размещаем панель выше активного элемента
    panel.style.top = `${elementRect.top - panel.offsetHeight - 5}px`;
  } else {
    panel.style.top = `${y - panel.offsetHeight - 10}px`;
  }
  
  // Проверка границ экрана
  const panelRect = panel.getBoundingClientRect();
  
  // Проверка правой границы
  if (panelRect.right > window.innerWidth) {
    panel.style.left = `${window.innerWidth - panelRect.width - 5}px`;
  }
  
  // Проверка левой границы
  if (panelRect.left < 0) {
    panel.style.left = '5px';
  }
  
  // Проверка верхней границы
  if (panelRect.top < 0) {
    if (elementRect) {
      // Размещаем под активным элементом
      panel.style.top = `${elementRect.bottom + 5}px`;
    } else {
      panel.style.top = `${y + 10}px`;
    }
  }
  
  panel.style.opacity = '1'; // Делаем видимым
}

// Применить стили темы к элементу
function applyThemeStyles(element) {
  element.style.backgroundColor = themeColors.background;
  element.style.color = themeColors.text;
  element.style.borderColor = themeColors.border;
  
  const buttons = element.querySelectorAll('button');
  buttons.forEach(button => {
    button.style.color = themeColors.text;
    button.addEventListener('mouseover', () => {
      button.style.backgroundColor = themeColors.accent;
      button.style.color = '#ffffff';
    });
    button.addEventListener('mouseout', () => {
      button.style.backgroundColor = 'transparent';
      button.style.color = themeColors.text;
    });
  });
}

// Скрыть все меню
function hideMenus() {
  if (selectionMenu) selectionMenu.style.display = 'none';
  if (pastePanel) pastePanel.style.display = 'none';
}

// Проверка, является ли элемент полем ввода
function isInputElement(element) {
  if (!element) return false;
  
  const tagName = element.tagName.toLowerCase();
  const inputType = element.type ? element.type.toLowerCase() : '';
  
  return (
    tagName === 'input' && ['text', 'password', 'email', 'search', 'tel', 'url', 'number'].includes(inputType) ||
    tagName === 'textarea' ||
    element.isContentEditable
  );
}

// Обработчик события selectionchange для обновления позиции меню при изменении выделения
document.addEventListener('selectionchange', function() {
  const selection = window.getSelection();
  if (selection.toString().trim() && 
      selectionMenu && 
      selectionMenu.style.display !== 'none') {
    // Если меню видимо и выделение изменилось
    const isInput = isInputElement(document.activeElement);
    showSelectionMenu(isInput);
  }
});

// Обработчик mouseup для показа меню при выделении
document.addEventListener('mouseup', function(e) {
  setTimeout(() => {
    const selection = window.getSelection();
    const selectedText = selection.toString().trim();
    
    hideMenus();
    
    if (selectedText) {
      const isInput = isInputElement(document.activeElement);
      showSelectionMenu(isInput);
    }
  }, 10);
});

// Обработчик клика для проверки буфера обмена
document.addEventListener('click', function(e) {
  const isInput = isInputElement(e.target);
  
  hideMenus();
  
  if (isInput) {
    // Проверка наличия текста в буфере обмена
    navigator.clipboard.readText()
      .then(text => {
        if (text && text.trim()) {
          showPastePanel(e.clientX, e.clientY);
        }
      })
      .catch(err => {
        // Если доступ запрещен, панель не будет показана
      });
  }
});

// Закрытие меню при клике в другом месте
document.addEventListener('mousedown', function(e) {
  if (selectionMenu && 
      !selectionMenu.contains(e.target) && 
      selectionMenu.style.display !== 'none') {
    hideMenus();
  }
  
  if (pastePanel && 
      !pastePanel.contains(e.target) && 
      pastePanel.style.display !== 'none') {
    pastePanel.style.display = 'none';
  }
});

// Закрытие меню при скролле страницы
document.addEventListener('scroll', function() {
  hideMenus();
});