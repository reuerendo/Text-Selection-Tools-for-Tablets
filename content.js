// Создаем элементы панели
let panel = document.createElement('div');
panel.id = 'text-selection-panel';
panel.style.display = 'none';
document.body.appendChild(panel);

// Создаем кнопки
let copyButton = document.createElement('button');
copyButton.textContent = 'Копировать';
copyButton.classList.add('panel-button');

let searchButton = document.createElement('button');
searchButton.textContent = 'Поиск';
searchButton.classList.add('panel-button');

// Добавляем кнопки в панель
panel.appendChild(copyButton);
panel.appendChild(searchButton);

// Таймер для отсрочки показа панели (предотвращает мерцание при выделении)
let panelTimer = null;

// Обработчик выделения текста
document.addEventListener('selectionchange', function() {
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
        panel.style.top = (rect.bottom + window.scrollY + lineHeight) + 'px';
      }
      
      // Показываем панель
      panel.style.visibility = 'visible';
    }
  }, 200);
});

// Обработчик клика на кнопку "Копировать"
copyButton.addEventListener('click', function() {
  const selectedText = window.getSelection().toString();
  navigator.clipboard.writeText(selectedText)
    .then(() => {
      // Скрываем панель после копирования
      panel.style.display = 'none';
    })
    .catch(err => {
      console.error('Ошибка при копировании: ', err);
    });
});

// Обработчик клика на кнопку "Поиск"
searchButton.addEventListener('click', function() {
  const selectedText = window.getSelection().toString();
  const searchUrl = `https://www.google.com/search?q=${encodeURIComponent(selectedText)}`;
  window.open(searchUrl, '_blank');
  panel.style.display = 'none';
});

// Скрываем панель при клике вне панели
document.addEventListener('click', function(event) {
  if (!panel.contains(event.target) && panel.style.display !== 'none') {
    panel.style.display = 'none';
  }
});

// Обрабатываем изменение темы Firefox
function updateColors() {
  // Получаем текущие цвета темы браузера
  const computedStyle = getComputedStyle(document.documentElement);
  
  // Обновляем стили элементов панели
  panel.style.backgroundColor = computedStyle.getPropertyValue('--toolbar-bgcolor') || '#f9f9fa';
  panel.style.color = computedStyle.getPropertyValue('--toolbar-color') || '#0c0c0d';
  
  // Обновляем стили кнопок
  const buttons = panel.querySelectorAll('.panel-button');
  buttons.forEach(button => {
    button.style.color = computedStyle.getPropertyValue('--toolbar-color') || '#0c0c0d';
    button.style.backgroundColor = computedStyle.getPropertyValue('--toolbar-bgcolor') || '#f9f9fa';
  });
}

// Первоначальное применение цветов темы
updateColors();

// Для отслеживания изменений темы браузера можно использовать MutationObserver,
// но это имеет ограничения. Лучшей практикой будет использование
// browser.theme.getCurrent() в реальном расширении
