// Фоновый скрипт
// В данном расширении фоновый скрипт не требует сложной логики
// Он может использоваться для обработки сообщений от контент-скрипта
browser.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "getThemeColors") {
    // Получение цветов текущей темы Firefox
    browser.theme.getCurrent().then(theme => {
      let colors = {
        background: theme.colors?.popup || "#ffffff",
        text: theme.colors?.popup_text || "#000000",
        border: theme.colors?.popup_border || "#d7d7db",
        accent: theme.colors?.toolbar_field_focus || "#0060df"
      };
      sendResponse({ colors: colors });
    });
    return true; // Для асинхронного ответа
  }
});
