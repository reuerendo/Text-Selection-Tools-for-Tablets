// Инициализация расширения при установке
browser.runtime.onInstalled.addListener(() => {
  console.log("Расширение установлено или обновлено");
});

// Обработка сообщений от контентного скрипта
browser.runtime.onMessage.addListener((message, sender, sendResponse) => {
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
