// Получаем элементы DOM
const saveButton = document.getElementById('save-button');
const statusMessage = document.getElementById('status-message');
const searchEngineInputs = document.querySelectorAll('input[name="searchEngine"]');

// Загрузка сохраненных настроек
function loadOptions() {
  // По умолчанию используем Google
  let defaultEngine = 'google';
  
  // Получаем сохраненные настройки
  browser.storage.local.get('searchEngine').then((result) => {
    // Устанавливаем значение из хранилища или значение по умолчанию
    const searchEngine = result.searchEngine || defaultEngine;
    
    // Устанавливаем выбранную поисковую систему
    const radioButton = document.querySelector(`input[value="${searchEngine}"]`);
    if (radioButton) {
      radioButton.checked = true;
    }
  }).catch((error) => {
    console.error('Ошибка при загрузке настроек:', error);
  });
  
  // Локализация элементов интерфейса
  document.getElementById('options-title').textContent = browser.i18n.getMessage('optionsTitle') || 'Настройки расширения';
  document.getElementById('search-engine-title').textContent = browser.i18n.getMessage('searchEngineTitle') || 'Поисковая система';
  saveButton.textContent = browser.i18n.getMessage('saveButtonText') || 'Сохранить';
}

// Сохранение настроек
function saveOptions() {
  // Определяем выбранную поисковую систему
  let selectedEngine = '';
  for (const input of searchEngineInputs) {
    if (input.checked) {
      selectedEngine = input.value;
      break;
    }
  }
  
  // Сохраняем настройки
  browser.storage.local.set({
    searchEngine: selectedEngine
  }).then(() => {
    // Показываем сообщение об успехе
    statusMessage.textContent = browser.i18n.getMessage('saveSuccessMessage') || 'Настройки сохранены';
    statusMessage.className = 'status success';
    statusMessage.style.display = 'block';
    
    // Скрываем сообщение через 3 секунды
    setTimeout(() => {
      statusMessage.style.display = 'none';
    }, 3000);
  }).catch((error) => {
    console.error('Ошибка при сохранении настроек:', error);
  });
}

// Обработчик события нажатия на кнопку сохранения
saveButton.addEventListener('click', saveOptions);

// Загружаем настройки при открытии страницы
document.addEventListener('DOMContentLoaded', loadOptions);