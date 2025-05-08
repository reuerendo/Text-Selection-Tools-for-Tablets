// Инициализация настроек по умолчанию при установке расширения
browser.runtime.onInstalled.addListener(() => {
  console.log("Расширение установлено или обновлено");
  
  // Установка настроек по умолчанию: включены все пункты меню
  browser.storage.sync.set({
    enabledItems: ['copy', 'search', 'translate']
  }).then(() => {
    console.log("Настройки по умолчанию установлены");
  }).catch(error => {
    console.error("Ошибка при установке настроек по умолчанию:", error);
  });
});

// Обработка сообщений от контентного скрипта
browser.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'getSettings') {
    browser.storage.sync.get('enabledItems').then(result => {
      const enabledItems = result.enabledItems || ['copy', 'search', 'translate'];
      sendResponse({ enabledItems });
    }).catch(error => {
      console.error("Ошибка при получении настроек:", error);
      sendResponse({ 
        enabledItems: ['copy', 'search', 'translate'],
        error: error.message
      });
    });
    return true; // для асинхронного ответа
  }
  
  if (message.action === 'getThemeColors') {
    try {
      if (browser.theme && browser.theme.getCurrent) {
        browser.theme.getCurrent().then(theme => {
          sendResponse({ theme });
        }).catch(error => {
          console.error("Ошибка при получении темы:", error);
          sendResponse({ theme: null, error: error.message });
        });
      } else {
        sendResponse({ theme: null, error: "API темы недоступен" });
      }
    } catch (error) {
      console.error("Ошибка при обработке запроса темы:", error);
      sendResponse({ theme: null, error: error.message });
    }
    return true; // для асинхронного ответа
  }
});

// Проверка и инициализация настроек при запуске
browser.storage.sync.get('enabledItems').then(result => {
  if (!result.enabledItems) {
    browser.storage.sync.set({
      enabledItems: ['copy', 'search', 'translate']
    }).then(() => {
      console.log("Настройки инициализированы при запуске");
    });
  } else {
    console.log("Текущие настройки:", result.enabledItems);
  }
}).catch(error => {
  console.error("Ошибка при проверке настроек:", error);
});