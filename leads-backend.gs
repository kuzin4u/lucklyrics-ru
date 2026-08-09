/**
 * LEAD CAPTURE BACKEND — Google Apps Script
 * ==========================================
 * Отдельный, самостоятельный бэкенд ТОЛЬКО для заявок с сайта LuckLyrics /
 * KUZIN4U (lucklyrics-ru.html и semavi-landing.html). Не связан с таблицей
 * заказов Masa Madre — намеренно отдельная таблица, чтобы не смешивать
 * данные разных бизнесов (хлебопекарня vs. IT-платформа).
 *
 * Принимает заявки (телефон + email), сохраняет их в лист «Leads» этой
 * таблицы. Ограничения по количеству записей нет — Google Таблицы спокойно
 * держат сотни тысяч строк, искусственный потолок не нужен.
 *
 * ─── УСТАНОВКА ───
 * 1. Создайте новую Google Таблицу — отдельную от таблицы заказов Masa Madre.
 * 2. Расширения → Apps Script.
 * 3. Удалите содержимое редактора, вставьте целиком этот файл.
 * 4. Развернуть → Новое развёртывание → тип «Веб-приложение»:
 *      - Выполнять как: я (ваш аккаунт)
 *      - У кого есть доступ: Все (Anyone)
 * 5. Скопируйте URL веб-приложения (заканчивается на /exec).
 * 6. В lucklyrics-ru.html И semavi-landing.html замените
 *    __LEADS_API_URL__ на этот URL (в обоих файлах, это одна и
 *    та же строка-плейсхолдер — не путать с __REVIEWS_API_URL__,
 *    та переменная по-прежнему указывает на таблицу Masa Madre и
 *    этот файл не трогает).
 */

const LEAD_SHEET_NAME = 'Leads';

function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);

    if (data._type === 'lead') {
      return handleLead(data);
    }

    // Этот бэкенд обрабатывает только лиды — на любой другой _type
    // просто отвечаем ошибкой, ничего не пишем в таблицу.
    return jsonResponse({ success: false, error: 'unknown _type' });

  } catch (err) {
    return jsonResponse({ success: false, error: String(err) });
  }
}

function doGet(e) {
  const action = e.parameter.action;
  if (action === 'leads-count') {
    const sheet = getLeadSheet();
    const count = Math.max(0, sheet.getLastRow() - 1); // минус заголовок
    return jsonResponse({ count });
  }
  return jsonResponse({});
}

/**
 * Основная логика приёма лида — просто дописывает строку в конец таблицы.
 */
function handleLead(data) {
  const sheet = getLeadSheet();

  sheet.appendRow([
    new Date(data.createdAt || Date.now()),
    data.phone || '',
    data.email || '',
    data.channel || '',
    data.status || 'Новый лид'
  ]);

  return jsonResponse({ success: true });
}

/**
 * Возвращает лист «Leads», создавая его с заголовками при первом обращении.
 */
function getLeadSheet() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(LEAD_SHEET_NAME);
  if (!sheet) {
    sheet = ss.insertSheet(LEAD_SHEET_NAME);
    sheet.appendRow(['Дата', 'Телефон', 'Email', 'Источник', 'Статус']);
    sheet.setFrozenRows(1);
  }
  return sheet;
}

function jsonResponse(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
