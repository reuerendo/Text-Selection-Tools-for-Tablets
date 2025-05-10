// Флаг для отслеживания двойного клика
let isDoubleClick = false;
let singleClickTimer = null;

// Функция проверки, является ли ссылка "действительной страницей" или кнопкой-ссылкой
function isNavigationLink(link) {
  // Проверяем, что ссылка ведет на страницу
  const url = link.href;
  
  // Исключаем javascript: ссылки, якоря и "пустые" ссылки
  if (url.startsWith('javascript:') || url === '#' || url.startsWith(window.location.origin + '#')) {
    return false;
  }
  
  // Проверяем наличие AJAX в URL (это часто указывает на функциональные ссылки)
  if (url.includes('/ajax-') || url.includes('/api/') || url.includes('?ajax=')) {
    return false;
  }
  
  // Проверяем дополнительные атрибуты, которые могут указывать на "кнопку-ссылку"
  const role = link.getAttribute('role');
  if (role === 'button') {
    return false;
  }
  
  // Если есть класс или id, которые содержат слово button, toggle, считаем кнопкой
  const classesAndId = (link.className + ' ' + link.id).toLowerCase();
  const functionalClasses = ['button', 'toggle', 'btn', 'favorite', 'add-to', 'remove-from', 'like', 'action'];
  
  for (const keyword of functionalClasses) {
    if (classesAndId.includes(keyword)) {
      return false;
    }
  }
  
  // Проверка на иконки FontAwesome (часто используются в кнопках)
  if (link.querySelector('.fa, .fas, .far, .fal, .fab, [class*="fa-"]')) {
    return false;
  }
  
  return true;
}

// Отслеживаем нажатие клавиш для обработки Ctrl/Cmd+click и middle-click
document.addEventListener('click', (event) => {
  const target = event.target.closest('a');
  if (!target || !target.href) return;
  
  // Проверяем, что это ссылка для навигации, а не кнопка
  if (!isNavigationLink(target)) return;
  
  // Проверяем случаи, когда не нужно вмешиваться в стандартное поведение:
  // 1. Нажата клавиша Ctrl/Cmd (открытие в новой вкладке)
  // 2. Нажата средняя кнопка мыши (открытие в новой вкладке)
  // 3. У ссылки указан target="_blank" (открытие в новой вкладке)
  if (event.ctrlKey || event.metaKey || event.which === 2 || target.getAttribute('target') === '_blank') {
    return; // Не вмешиваемся, позволяем браузеру обработать стандартное поведение
  }
  
  // Если это часть двойного клика, не делаем ничего
  if (isDoubleClick) {
    event.preventDefault();
    event.stopPropagation();
    return false;
  }
  
  // При одиночном клике устанавливаем таймер для навигации
  event.preventDefault();
  event.stopPropagation();
  
  clearTimeout(singleClickTimer);
  singleClickTimer = setTimeout(() => {
    // Обычная навигация через 300мс если не было второго клика
    if (!isDoubleClick) {
      window.location.href = target.href;
    }
  }, 300);
  
  return false;
}, true);

// Обработчик двойного клика
document.addEventListener('dblclick', (event) => {
  const target = event.target.closest('a');
  if (!target || !target.href) return;
  
  // Проверяем, что это ссылка для навигации, а не кнопка
  if (!isNavigationLink(target)) return;
  
  // Отмечаем как двойной клик и отменяем таймер одиночного клика
  isDoubleClick = true;
  clearTimeout(singleClickTimer);
  
  // Предотвращаем действие по умолчанию
  event.preventDefault();
  event.stopPropagation();
  
  // Открываем в фоновой вкладке
  browser.runtime.sendMessage({
    action: "openInBackgroundTab",
    url: target.href
  });
  
  // Сбрасываем флаг двойного клика через небольшую задержку
  setTimeout(() => {
    isDoubleClick = false;
  }, 400);
  
  return false;
}, true);
