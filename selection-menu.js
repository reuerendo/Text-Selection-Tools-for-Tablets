// Создаем элемент всплывающего меню
const selectionMenu = document.createElement('div');
selectionMenu.id = 'selection-menu';
selectionMenu.style.display = 'none';
document.body.appendChild(selectionMenu);

// Добавляем отладочный класс к меню, чтобы легче было отследить его наличие
selectionMenu.classList.add('text-selection-menu-extension');

// Переменная для хранения текущего выделения
let currentSelection = '';
let menuItems = ['copy', 'search', 'translate'];

// Сразу создаем базовое меню, чтобы оно было доступно
createMenuElements({
  popup: '#ffffff',
  text: '#000000',
  border: '#cccccc',
  button_background_hover: '#e0e0e0'
});

// Получаем настройки из хранилища при загрузке
browser.storage.sync.get('enabledItems', (result) => {
  if (result.enabledItems) {
    menuItems = result.enabledItems;
  }
  
  // Загружаем тему Firefox для цветов
  getCurrentThemeColors().then(colors => {
    createMenuElements(colors);
  });
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
  
  // Если нет включенных пунктов меню, включаем все по умолчанию
  if (!menuItems || menuItems.length === 0) {
    menuItems = ['copy', 'search', 'translate'];
  }
  
  // Добавляем пункты меню в зависимости от настроек
  if (menuItems.includes('copy')) {
    const copyButton = createMenuItem('Копировать', copySelectedText, colors);
    menuContainer.appendChild(copyButton);
  }
  
  if (menuItems.includes('search')) {
    const searchButton = createMenuItem('Поиск', searchSelectedText, colors);
    menuContainer.appendChild(searchButton);
  }
  
  if (menuItems.includes('translate')) {
    const translateButton = createMenuItem('Перевод', translateSelectedText, colors);
    menuContainer.appendChild(translateButton);
  }
  
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
    callback();
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

function translateSelectedText() {
  const translateUrl = `https://translate.google.com/?text=${encodeURIComponent(currentSelection)}`;
  window.open(translateUrl, '_blank');
}

// Показать всплывающее меню
function showSelectionMenu(x, y) {
  // Проверяем наличие пунктов меню
  const menuContainer = selectionMenu.querySelector('.menu-container');
  if (menuContainer && menuContainer.childElementCount === 0) {
    console.log("Меню не содержит пунктов, повторное создание элементов");
    
    // Пробуем перезагрузить настройки и пересоздать меню
    browser.storage.sync.get('enabledItems', (result) => {
      if (result.enabledItems) {
        menuItems = result.enabledItems;
      } else {
        menuItems = ['copy', 'search', 'translate'];
      }
      
      getCurrentThemeColors().then(colors => {
        createMenuElements(colors);
      });
    });
  }
  
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

// Обновление настроек при их изменении
browser.storage.onChanged.addListener((changes, area) => {
  if (area === 'sync' && changes.enabledItems) {
    menuItems = changes.enabledItems.newValue || ['copy', 'search', 'translate'];
    
    // Обновляем элементы меню с новыми настройками
    getCurrentThemeColors().then(colors => {
      createMenuElements(colors);
    });
    
    console.log("Настройки обновлены:", menuItems);
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