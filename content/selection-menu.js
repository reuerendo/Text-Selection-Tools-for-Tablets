// Создаем элемент всплывающего меню
const selectionMenu = document.createElement('div');
selectionMenu.id = 'selection-menu';
selectionMenu.style.display = 'none';
document.body.appendChild(selectionMenu);

// Добавляем отладочный класс к меню, чтобы легче было отследить его наличие
selectionMenu.classList.add('text-selection-menu-extension');

// Переменная для хранения текущего выделения
let currentSelection = '';
let menuItems = ['copy', 'search', 'context_menu'];

// Сразу создаем базовое меню, чтобы оно было доступно
createMenuElements({
  popup: '#ffffff',
  text: '#000000',
  border: '#cccccc',
  button_background_hover: '#e0e0e0'
});

// Загружаем тему Firefox для цветов
getCurrentThemeColors().then(colors => {
  createMenuElements(colors);
});

// Создаем элементы меню
function createMenuElements(colors) {
  console.log("Создание элементов меню с пунктами:", menuItems);
  
  // Очищаем текущее содержимое меню
  selectionMenu.innerHTML = '';
  
  // Создаем контейнер для пунктов меню
  const menuContainer = document.createElement('div');
  menuContainer.className = 'menu-container';
  
  // Применяем цвета темы
  selectionMenu.style.backgroundColor = colors.popup || '#ffffff';
  selectionMenu.style.color = colors.text || '#000000';
  selectionMenu.style.borderColor = colors.border || '#cccccc';
  
  // Добавляем пункты меню
  const copyButton = createMenuItem('Копировать', copySelectedText, colors);
  menuContainer.appendChild(copyButton);
  
  const searchButton = createMenuItem('Поиск', searchSelectedText, colors);
  menuContainer.appendChild(searchButton);
  
  const contextMenuButton = createMenuItem('...', openContextMenu, colors);
  menuContainer.appendChild(contextMenuButton);
  
  // Добавляем контейнер в меню
  selectionMenu.appendChild(menuContainer);
  
  // Проверяем, есть ли элементы в меню (для отладки)
  console.log("Создано меню с " + menuContainer.childElementCount + " пунктами");
}

// Создаем отдельный пункт меню
function createMenuItem(text, callback, colors) {
  const menuItem = document.createElement('button');
  menuItem.className = 'menu-item';
  menuItem.textContent = text;
  menuItem.style.color = colors.text || '#000000';
  
  menuItem.addEventListener('mouseover', () => {
    menuItem.style.backgroundColor = colors.button_background_hover || '#e0e0e0';
  });
  
  menuItem.addEventListener('mouseout', () => {
    menuItem.style.backgroundColor = 'transparent';
  });
  
  menuItem.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    callback(e);
    hideSelectionMenu();
  });
  
  return menuItem;
}

// Функция для получения текущих цветов темы Firefox
function getCurrentThemeColors() {
  try {
    // Если API темы доступен, используем его
    if (browser.theme && browser.theme.getCurrent) {
      return browser.theme.getCurrent().then(theme => {
        let colors = {};
        
        if (theme && theme.colors) {
          colors = {
            popup: theme.colors.popup || '#ffffff',
            text: theme.colors.popup_text || '#000000',
            border: theme.colors.popup_border || '#cccccc',
            button_background_hover: theme.colors.button_background_hover || '#e0e0e0'
          };
        } else {
          // Цвета по умолчанию, если тема недоступна
          colors = {
            popup: '#ffffff',
            text: '#000000',
            border: '#cccccc',
            button_background_hover: '#e0e0e0'
          };
        }
        
        return colors;
      }).catch(() => {
        // В случае ошибки возвращаем цвета по умолчанию
        return {
          popup: '#ffffff',
          text: '#000000',
          border: '#cccccc',
          button_background_hover: '#e0e0e0'
        };
      });
    } else {
      // Если API темы недоступен, сразу возвращаем цвета по умолчанию
      return Promise.resolve({
        popup: '#ffffff',
        text: '#000000',
        border: '#cccccc',
        button_background_hover: '#e0e0e0'
      });
    }
  } catch (error) {
    // На случай любых ошибок
    console.error("Ошибка при получении цветов темы:", error);
    return Promise.resolve({
      popup: '#ffffff',
      text: '#000000',
      border: '#cccccc',
      button_background_hover: '#e0e0e0'
    });
  }
}

// Действия для пунктов меню
function copySelectedText() {
  navigator.clipboard.writeText(currentSelection)
    .catch(err => console.error('Не удалось скопировать текст: ', err));
}

function searchSelectedText() {
  const searchUrl = `https://www.google.com/search?q=${encodeURIComponent(currentSelection)}`;
  window.open(searchUrl, '_blank');
}

function openContextMenu(e) {
  // Чтобы вызвать контекстное меню браузера, имитируем нажатие правой кнопки мыши
  const contextEvent = new MouseEvent('contextmenu', {
    bubbles: true,
    cancelable: true,
    view: window,
    button: 2,
    buttons: 2,
    clientX: e.clientX,
    clientY: e.clientY
  });
  
  // Отправляем событие к элементу, где произошло выделение
  document.elementFromPoint(e.clientX, e.clientY).dispatchEvent(contextEvent);
}

// Показать всплывающее меню
function showSelectionMenu(x, y) {
  console.log(`Показываем меню на позиции: x=${x}, y=${y}`);
  selectionMenu.style.left = `${x}px`;
  selectionMenu.style.top = `${y}px`;
  selectionMenu.style.display = 'block';
}

// Скрыть всплывающее меню
function hideSelectionMenu() {
  selectionMenu.style.display = 'none';
}

// Обработчик события выделения текста
document.addEventListener('mouseup', (e) => {
  // Игнорируем события от самого меню
  if (e.target === selectionMenu || selectionMenu.contains(e.target)) {
    return;
  }
  
  const selection = window.getSelection();
  if (!selection) return;
  
  const selectedText = selection.toString().trim();
  console.log("Выделенный текст:", selectedText ? selectedText.substring(0, 20) + "..." : "нет");
  
  // Если текст выделен, показываем меню
  if (selectedText && selectedText !== '') {
    currentSelection = selectedText;
    
    try {
      // Расчет позиции меню
      if (selection.rangeCount > 0) {
        const rect = selection.getRangeAt(0).getBoundingClientRect();
        const x = e.clientX || (rect.left + rect.width / 2);
        const y = (rect.bottom + window.scrollY) + 10; // 10px под выделением
        
        showSelectionMenu(x, y);
      } else {
        console.warn("Нет диапазона в выделении");
        showSelectionMenu(e.clientX, e.clientY + 10);
      }
    } catch (error) {
      console.error("Ошибка при обработке выделения:", error);
      // Аварийный вариант позиционирования
      showSelectionMenu(e.clientX, e.clientY + 10);
    }
  } else if (e.target !== selectionMenu && !selectionMenu.contains(e.target)) {
    hideSelectionMenu();
  }
});

// Скрыть меню при клике вне выделения и меню
document.addEventListener('mousedown', (e) => {
  if (e.target !== selectionMenu && !selectionMenu.contains(e.target)) {
    hideSelectionMenu();
  }
});

// Обработчик изменения выделения
document.addEventListener('selectionchange', () => {
  const selection = window.getSelection();
  const selectedText = selection.toString().trim();
  
  if (selectedText === '' && selectionMenu.style.display === 'block') {
    hideSelectionMenu();
  } else if (selectedText !== '' && selectedText !== currentSelection) {
    currentSelection = selectedText;
    
    // Если меню уже отображается, обновляем его положение
    if (selectionMenu.style.display === 'block') {
      const rect = selection.getRangeAt(0).getBoundingClientRect();
      const x = rect.left + rect.width / 2;
      const y = (rect.bottom + window.scrollY) + 10;
      
      showSelectionMenu(x, y);
    }
  }
});

// Обработчик изменения темы
try {
  if (browser.theme && browser.theme.onUpdated) {
    browser.theme.onUpdated.addListener(({theme}) => {
      let colors = {};
      
      if (theme && theme.colors) {
        colors = {
          popup: theme.colors.popup || '#ffffff',
          text: theme.colors.popup_text || '#000000',
          border: theme.colors.popup_border || '#cccccc',
          button_background_hover: theme.colors.button_background_hover || '#e0e0e0'
        };
      } else {
        colors = {
          popup: '#ffffff',
          text: '#000000',
          border: '#cccccc',
          button_background_hover: '#e0e0e0'
        };
      }
      
      createMenuElements(colors);
    });
  }
} catch (error) {
  console.error("Ошибка при настройке обработчика изменения темы:", error);
}
