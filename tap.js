// Переменные состояния
let isDoubleClick = false;
let singleClickTimer = null;

// Объединенный обработчик для проверки ссылок
function isNavigationLink(link) {
  if (!link || !link.href) return false;
  
  const url = link.href;
  
  // Быстрые проверки исключений
  if (url.startsWith('javascript:') || 
      url === '#' || 
      url.startsWith(window.location.origin + '#') ||
      url.includes('/ajax-') || 
      url.includes('/api/') || 
      url.includes('?ajax=') ||
      link.getAttribute('role') === 'button') {
    return false;
  }
  
  // Эффективная проверка классов и ID через регулярное выражение
  const classesAndId = (link.className + ' ' + link.id).toLowerCase();
  const functionalPattern = /button|toggle|btn|favorite|add-to|remove-from|like|action/;
  if (functionalPattern.test(classesAndId)) {
    return false;
  }
  
  // Проверка на иконки FontAwesome
  return !link.querySelector('.fa, .fas, .far, .fal, .fab, [class*="fa-"]');
}

// Обработчик одиночного клика
document.addEventListener('click', (event) => {
  const target = event.target.closest('a');
  
  // Быстрый возврат если нет подходящей ссылки
  if (!isNavigationLink(target)) return;
  
  // Пропускаем обработку если это открытие в новой вкладке
  if (event.ctrlKey || 
      event.metaKey || 
      event.which === 2 || 
      target.getAttribute('target') === '_blank') {
    return;
  }
  
  // Если это часть двойного клика, не делаем ничего
  if (isDoubleClick) {
    event.preventDefault();
    event.stopPropagation();
    return false;
  }
  
  // Обработка одиночного клика
  event.preventDefault();
  event.stopPropagation();
  
  clearTimeout(singleClickTimer);
  singleClickTimer = setTimeout(() => {
    if (!isDoubleClick) {
      window.location.href = target.href;
    }
  }, 300);
  
  return false;
}, true);

// Обработчик двойного клика
document.addEventListener('dblclick', (event) => {
  const target = event.target.closest('a');
  
  // Быстрый возврат если нет подходящей ссылки
  if (!isNavigationLink(target)) return;
  
  // Отмечаем как двойной клик и отменяем таймер одиночного клика
  isDoubleClick = true;
  clearTimeout(singleClickTimer);
  
  // Предотвращаем действие по умолчанию
  event.preventDefault();
  event.stopPropagation();
  
  // Проверка доступности API browser перед вызовом
  if (typeof browser !== 'undefined' && browser.runtime && browser.runtime.sendMessage) {
    browser.runtime.sendMessage({
      action: "openInBackgroundTab",
      url: target.href
    });
  } else if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.sendMessage) {
    // Поддержка Chrome
    chrome.runtime.sendMessage({
      action: "openInBackgroundTab",
      url: target.href
    });
  }
  
  // Сбрасываем флаг двойного клика через небольшую задержку
  setTimeout(() => {
    isDoubleClick = false;
  }, 400);
  
  return false;
}, true);

// Очистка при выгрузке страницы
window.addEventListener('unload', () => {
  clearTimeout(singleClickTimer);
});
