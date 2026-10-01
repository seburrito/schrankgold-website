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
const addMinutes = (date, mins) => new Date(date.getTime() + mins * 60000);

export function classify(now = new Date()) {
  const mNow = now.getHours() * 60 + now.getMinutes();
  let minutesUntilClose = null;
  let minutesUntilOpen = null;
  for (const [s, e] of intervalsFor(now)) {
    if (mNow >= s && mNow < e) { minutesUntilClose = e - mNow; break; }
    if (mNow < s && minutesUntilOpen == null) minutesUntilOpen = s - mNow;
  }
  if (minutesUntilClose != null) {
    const closeTime = fmt(addMinutes(now, minutesUntilClose));
    return minutesUntilClose > 60
      ? { isOpen: true, message: `Jetzt geöffnet bis ${closeTime} Uhr` }
      : { isOpen: true, message: `Noch geöffnet bis ${closeTime} Uhr` };
  }
  if (minutesUntilOpen == null) {
    // search next open day up to 14 days ahead (covers month boundary for Saturdays)
    for (let d = 1; d <= 14; d++) {
      const future = new Date(now.getFullYear(), now.getMonth(), now.getDate() + d);
      const intervals = intervalsFor(future);
      if (intervals.length) { minutesUntilOpen = (24 * 60 - mNow) + (d - 1) * 24 * 60 + intervals[0][0]; break; }
    }
  }
  if (minutesUntilOpen == null) return { isOpen: false, message: 'Heute geschlossen' };
  const target = addMinutes(now, minutesUntilOpen);
  const sameDay = target.toDateString() === now.toDateString();
  if (minutesUntilOpen <= 60) return { isOpen: false, message: `Öffnet bald um ${fmt(target)} Uhr` };
  if (sameDay) return { isOpen: false, message: `Jetzt geschlossen bis ${fmt(target)} Uhr` };
  return { isOpen: false, message: `Jetzt geschlossen bis ${WEEKDAYS[target.getDay()]}. ${fmt(target)} Uhr` };
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
