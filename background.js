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

// Слушаем сообщения от content script
browser.runtime.onMessage.addListener((message) => {
  if (message.action === "openInBackgroundTab" && message.url) {
    openInBackgroundTab(message.url);
  }
});