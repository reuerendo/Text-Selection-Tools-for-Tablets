// Получаем ссылки на элементы формы
const copyCheckbox = document.getElementById('copy-checkbox');
const searchCheckbox = document.getElementById('search-checkbox');
const translateCheckbox = document.getElementById('translate-checkbox');
const saveButton = document.getElementById('save-button');
const statusMessage = document.getElementById('status-message');

// Загружаем текущие настройки
function loadOptions() {
  browser.storage.sync.get('enabledItems', (result) => {
    console.log("Загружены настройки:", result);
    const enabledItems = result.enabledItems || ['copy', 'search', 'translate'];
    
    copyCheckbox.checked = enabledItems.includes('copy');
    searchCheckbox.checked = enabledItems.includes('search');
    translateCheckbox.checked = enabledItems.includes('translate');
  });
}

// Сохраняем настройки
function saveOptions(e) {
  e.preventDefault();
  
  const enabledItems = [];
  
  if (copyCheckbox.checked) enabledItems.push('copy');
  if (searchCheckbox.checked) enabledItems.push('search');
  if (translateCheckbox.checked) enabledItems.push('translate');
  
  // Проверка: хотя бы один пункт должен быть выбран
  if (enabledItems.length === 0) {
    statusMessage.textContent = 'Выберите хотя бы один пункт!';
    statusMessage.style.color = '#e00000';
    statusMessage.classList.add('show');
    
    setTimeout(() => {
      statusMessage.classList.remove('show');
    }, 3000);
    
    return;
  }
  
  console.log("Сохраняем настройки:", enabledItems);
  
  browser.storage.sync.set({
    enabledItems: enabledItems
  }).then(() => {
    console.log("Настройки успешно сохранены");
    statusMessage.textContent = 'Настройки сохранены!';
    statusMessage.style.color = '';
    statusMessage.classList.add('show');
    
    setTimeout(() => {
      statusMessage.classList.remove('show');
    }, 2000);
  }).catch((error) => {
    console.error("Ошибка при сохранении настроек:", error);
    statusMessage.textContent = 'Ошибка сохранения!';
    statusMessage.style.color = '#e00000';
    statusMessage.classList.add('show');
    
    setTimeout(() => {
      statusMessage.classList.remove('show');
    }, 3000);
  });
}

// Адаптация к теме Firefox
function applyThemeColors() {
  try {
    if (browser.theme && browser.theme.getCurrent) {
      browser.theme.getCurrent().then(theme => {
        if (theme && theme.colors) {
          const body = document.body;
          
          if (theme.colors.popup) {
            body.style.backgroundColor = theme.colors.popup;
          }
          
          if (theme.colors.popup_text) {
            body.style.color = theme.colors.popup_text;
          }
          
          if (theme.colors.button) {
            saveButton.style.backgroundColor = theme.colors.button;
          }
          
          if (theme.colors.button_text) {
            saveButton.style.color = theme.colors.button_text;
          }
        }
      }).catch(error => {
        console.error("Ошибка при применении цветов темы:", error);
      });
    }
  } catch (error) {
    console.error("Ошибка при получении темы:", error);
  }
}

// Инициализация страницы
document.addEventListener('DOMContentLoaded', () => {
  console.log("Страница настроек загружена");
  loadOptions();
  applyThemeColors();
  
  // Добавляем обработчик события для кнопки сохранения
  saveButton.addEventListener('click', saveOptions);
});

// Обновление при изменении темы
try {
  if (browser.theme && browser.theme.onUpdated) {
    browser.theme.onUpdated.addListener(({theme}) => {
      applyThemeColors();
    });
  }
} catch (error) {
  console.error("Ошибка при настройке обработчика изменения темы:", error);
}