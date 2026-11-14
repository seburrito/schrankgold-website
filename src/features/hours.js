// Opening hours: live open/closed status + "today" highlight.
// Rules and messages are taken from the original script.js.

const HOURS = {
  3: [[10 * 60, 18 * 60]], // Wed
  4: [[10 * 60, 13 * 60], [15 * 60, 18 * 60]], // Thu
  5: [[10 * 60, 13 * 60], [15 * 60, 18 * 60]], // Fri
  6: 'special-sat' // Sat: only first & last of month 10-13
};
const WEEKDAYS = ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa'];

function isFirstOrLastSaturday(date) {
  const day = date.getDate();
  const lastDate = new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  return day <= 7 || day > lastDate - 7;
}

function intervalsFor(date) {
  const dow = date.getDay();
  if (!(dow in HOURS)) return [];
  if (HOURS[dow] === 'special-sat') return isFirstOrLastSaturday(date) ? [[10 * 60, 13 * 60]] : [];
  return HOURS[dow];
}

const pad = n => (n < 10 ? '0' : '') + n;
const fmt = d => pad(d.getHours()) + ':' + pad(d.getMinutes());

export function classify(now = new Date()) {
  const mNow = now.getHours() * 60 + now.getMinutes();
  // Build targets from the calendar date + minute of day, so they stay right
  // across daylight-saving changes (adding raw minutes would be an hour off).
  const at = (dayOffset, minute) => new Date(now.getFullYear(), now.getMonth(), now.getDate() + dayOffset, 0, minute);
  let closeAt = null;
  let openAt = null;
  for (const [s, e] of intervalsFor(now)) {
    if (mNow >= s && mNow < e) { closeAt = at(0, e); break; }
    if (mNow < s && openAt == null) openAt = at(0, s);
  }
  if (closeAt) {
    const minutesUntilClose = (closeAt - now) / 60000;
    return minutesUntilClose > 60
      ? { isOpen: true, message: `Jetzt geöffnet bis ${fmt(closeAt)} Uhr` }
      : { isOpen: true, message: `Noch geöffnet bis ${fmt(closeAt)} Uhr` };
  }
  if (openAt == null) {
    // search next open day up to 14 days ahead (covers month boundary for Saturdays)
    for (let d = 1; d <= 14; d++) {
      const intervals = intervalsFor(at(d, 0));
      if (intervals.length) { openAt = at(d, intervals[0][0]); break; }
    }
  }
  if (openAt == null) return { isOpen: false, message: 'Heute geschlossen' };
  const minutesUntilOpen = (openAt - now) / 60000;
  const sameDay = openAt.toDateString() === now.toDateString();
  if (minutesUntilOpen <= 60) return { isOpen: false, message: `Öffnet bald um ${fmt(openAt)} Uhr` };
  if (sameDay) return { isOpen: false, message: `Jetzt geschlossen bis ${fmt(openAt)} Uhr` };
  return { isOpen: false, message: `Jetzt geschlossen bis ${WEEKDAYS[openAt.getDay()]}. ${fmt(openAt)} Uhr` };
}

export function initHours() {
  const chips = document.querySelectorAll('[data-hours-status]');
  const rows = document.querySelectorAll('[data-hours] [data-day]');
  function update() {
    const now = new Date();
    const { isOpen, message } = classify(now);
    chips.forEach(chip => {
      chip.classList.toggle('is-open', isOpen);
      const text = chip.querySelector('.status__text');
      if (text) text.textContent = message;
    });
    const today = now.getDay();
    rows.forEach(row => {
      const isToday = Number(row.dataset.day) === today && (today !== 6 || isFirstOrLastSaturday(now));
      row.classList.toggle('is-today', isToday);
    });
  }
  update();
  setInterval(update, 60000);
}
