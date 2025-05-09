// Флаг для отслеживания двойного клика
let isDoubleClick = false;
let singleClickTimer = null;

// Отменяем стандартное поведение для всех кликов по ссылкам
document.addEventListener('click', (event) => {
  const target = event.target.closest('a');
  if (!target || !target.href) return;

  // Игнорируем javascript: ссылки и якоря
  const url = target.href;
  if (url.startsWith('javascript:') || url === '#' || url.startsWith('#')) return;

  // Предотвращаем стандартное действие
  event.preventDefault();
  event.stopPropagation();

  // Если это часть двойного клика, не делаем ничего - двойной клик обработается отдельно
  if (isDoubleClick) return false;

  // При одиночном клике устанавливаем таймер для навигации
  clearTimeout(singleClickTimer);
  singleClickTimer = setTimeout(() => {
    // Обычная навигация через 300мс если не было второго клика
    if (!isDoubleClick) {
      window.location.href = url;
    }
  }, 300);

  return false;
}, true);

// Обработчик двойного клика
document.addEventListener('dblclick', (event) => {
  const target = event.target.closest('a');
  if (!target || !target.href) return;

  // Игнорируем javascript: ссылки и якоря
  const url = target.href;
  if (url.startsWith('javascript:') || url === '#' || url.startsWith('#')) return;

  // Отмечаем как двойной клик и отменяем таймер одиночного клика
  isDoubleClick = true;
  clearTimeout(singleClickTimer);

  // Предотвращаем действие по умолчанию
  event.preventDefault();
  event.stopPropagation();

  // Открываем в фоновой вкладке
  browser.runtime.sendMessage({
    action: "openInBackgroundTab",
    url: url
  });

  // Сбрасываем флаг двойного клика через небольшую задержку
  setTimeout(() => {
    isDoubleClick = false;
  }, 400);

  return false;
}, true);