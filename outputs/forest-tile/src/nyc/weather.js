// Today's date and the current weather in New York (Open-Meteo, no key). If the
// request fails, the temperature stays hidden and the icon shows the sun.
const SUN =
  '<circle cx="22" cy="22" r="9" fill="#ffd166"/><g stroke="#ffd166" stroke-width="3" stroke-linecap="round">' +
  [0, 45, 90, 135, 180, 225, 270, 315]
    .map(a => {
      const r = (Math.PI * a) / 180;
      return `<line x1="${22 + Math.cos(r) * 13}" y1="${22 + Math.sin(r) * 13}" x2="${22 + Math.cos(r) * 17}" y2="${22 + Math.sin(r) * 17}"/>`;
    })
    .join('') +
  '</g>';
const CLOUD = (x = 0, y = 0) =>
  `<path transform="translate(${x} ${y})" d="M18 46h26a9 9 0 0 0 0-18 12 12 0 0 0-23-3 8 8 0 0 0-3 21z" fill="#fff" stroke="#7b8794" stroke-width="2.2" stroke-linejoin="round"/>`;
const DROPS =
  '<g stroke="#5aa9e6" stroke-width="2.6" stroke-linecap="round"><line x1="26" y1="50" x2="23" y2="56"/><line x1="34" y1="50" x2="31" y2="56"/><line x1="42" y1="50" x2="39" y2="56"/></g>';
const FLAKES =
  '<g fill="#fff" stroke="#7b8794" stroke-width="1"><circle cx="25" cy="53" r="2"/><circle cx="33" cy="55" r="2"/><circle cx="41" cy="53" r="2"/></g>';
const BOLT = '<path d="M32 46l-5 9h5l-3 7 8-10h-5l3-6z" fill="#ffd166" stroke="#e0a800" stroke-width="1"/>';
function icon(code, day = 1) {
  const body =
    code === 0 || code === 1
      ? day
        ? SUN
        : '<path d="M30 10a14 14 0 1 0 14 20 11 11 0 0 1-14-20z" fill="#ffe8a3"/>'
      : code === 2
        ? SUN + CLOUD(4, 2)
        : code === 3 || code === 45 || code === 48
          ? CLOUD(-2, -4) + CLOUD(6, 2)
          : code >= 95
            ? CLOUD(0, -6) + BOLT
            : (code >= 71 && code <= 77) || code === 85 || code === 86
              ? CLOUD(0, -6) + FLAKES
              : CLOUD(0, -6) + DROPS;
  return `<svg viewBox="0 0 64 64" aria-hidden="true">${body}</svg>`;
}
export function showWeather(root) {
  root.querySelector('.date').textContent = new Date().toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'America/New_York',
  });
  root.querySelector('.icon').innerHTML = icon(2);
  fetch(
    'https://api.open-meteo.com/v1/forecast?latitude=40.7128&longitude=-74.006&current=temperature_2m,weather_code,is_day&timezone=America%2FNew_York',
  )
    .then(r => (r.ok ? r.json() : Promise.reject(r.status)))
    .then(d => {
      root.querySelector('.temp').textContent = `${Math.round(d.current.temperature_2m)}°C`;
      root.querySelector('.icon').innerHTML = icon(d.current.weather_code, d.current.is_day);
      root.setAttribute('aria-label', `New York, ${Math.round(d.current.temperature_2m)} degrees`);
    })
    .catch(() => {});
}
