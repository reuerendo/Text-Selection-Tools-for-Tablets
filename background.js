// Функция для открытия ссылки в новой фоновой вкладке после текущей
function openInBackgroundTab(url) {
  // Получаем текущую вкладку для правильного размещения новой
  browser.tabs.query({active: true, currentWindow: true}).then(tabs => {
    const currentTab = tabs[0];
    browser.tabs.create({
      url: url,
      active: false,
      index: currentTab.index + 1 // Размещаем новую вкладку сразу после текущей
    });
  });
}

// Получение темы и отправка цветов в content script
function getAndSendThemeColors() {
  browser.theme.getCurrent().then(theme => {
    const isDarkTheme = detectDarkTheme(theme);
    
    // Извлекаем цвета темы, или используем значения по умолчанию из Firefox
    const colors = {
      toolbar: {
        // Для контекстного меню используем цвета popup меню
        bgcolor: theme.colors?.popup || 
                theme.colors?.menupopup_background || 
                theme.colors?.menu_background ||
                (isDarkTheme ? "#2A2A2E" : "#fff"),
        color: theme.colors?.popup_text || 
              theme.colors?.menupopup_text || 
              theme.colors?.menu_text ||
              (isDarkTheme ? "#FBFBFE" : "#0c0c0d"),
        border: theme.colors?.popup_border || 
               theme.colors?.menupopup_border || 
               theme.colors?.menu_border ||
               (isDarkTheme ? "#4A4A4F" : "#ccc")
      },
      button: {
        hover: theme.colors?.menuitem_hover_background || 
              theme.colors?.menupopup_highlight_background || 
              (isDarkTheme ? "rgba(255, 255, 255, 0.1)" : "rgba(0, 0, 0, 0.1)"),
        active: theme.colors?.menuitem_active_background || 
               theme.colors?.menupopup_selected_background || 
               (isDarkTheme ? "rgba(255, 255, 255, 0.2)" : "rgba(0, 0, 0, 0.2)")
      }
    };
    
    // Функция для определения темной темы
    function detectDarkTheme(theme) {
      // Проверяем цвета, чтобы определить, темная ли тема
      if (theme.colors) {
        // Проверяем popup или toolbar цвет фона (обычно определяющий)
        const bgColor = theme.colors.popup || theme.colors.menupopup_background || theme.colors.toolbar;
        if (bgColor) {
          // Конвертируем в RGB и проверяем яркость
          const rgb = hexToRgb(bgColor);
          if (rgb) {
            // Используем формулу яркости: (R * 299 + G * 587 + B * 114) / 1000
            const brightness = (rgb.r * 299 + rgb.g * 587 + rgb.b * 114) / 1000;
            return brightness < 128; // Если яркость < 128, считаем темной темой
          }
        }
        
        // Если не смогли определить по цвету, используем текстовый цвет
        const textColor = theme.colors.popup_text || theme.colors.menupopup_text || theme.colors.toolbar_text;
        if (textColor) {
          const rgb = hexToRgb(textColor);
          if (rgb) {
            const brightness = (rgb.r * 299 + rgb.g * 587 + rgb.b * 114) / 1000;
            return brightness > 128; // Если текст светлый, значит фон темный
          }
        }
      }
      
      // Если не удалось определить по теме, проверяем системную цветовую схему
      return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    }
    
    // Функция для конвертации hex в rgb
    function hexToRgb(hex) {
      // Проверяем, является ли значение hex-цветом
      if (typeof hex !== 'string' || !hex.startsWith('#')) {
        return null;
      }
      
      const shorthandRegex = /^#?([a-f\d])([a-f\d])([a-f\d])$/i;
      hex = hex.replace(shorthandRegex, (m, r, g, b) => r + r + g + g + b + b);
      
      const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
      return result ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16)
      } : null;
    }
    
    // Отправляем цвета во все открытые вкладки
    browser.tabs.query({}).then(tabs => {
      tabs.forEach(tab => {
        browser.tabs.sendMessage(tab.id, {
          action: "themeColors",
          colors: colors
        }).catch(() => {
          // Игнорируем ошибки для вкладок, где нет нашего content script
        });
      });
    });
  });
}

// Слушаем изменения темы
browser.theme.onUpdated.addListener(getAndSendThemeColors);

// Получаем и отправляем цвета при загрузке фонового скрипта
getAndSendThemeColors();

// Слушаем запросы от content scripts на получение цветов темы
browser.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "getThemeColors") {
    getAndSendThemeColors();
  } else if (message.action === "openInBackgroundTab" && message.url) {
    openInBackgroundTab(message.url);
  }
});
