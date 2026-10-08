/** Gradexa's curved ribbon. One geometry for SVG, React and video exports. */
export const REVEAL_DURATION = 5.6;
const clamp = (v) => Math.min(1, Math.max(0, v));
const ease = (v) => 1 - (1 - clamp(v)) ** 3;
const phase = (time, start, duration) => ease((time - start) / duration);
const paths = {
  tail: 'M30 253 L91 205 L121 218 L57 250 Z',
  upper: 'M153 66 L222 32 L292 133 C318 171 323 192 299 215 C280 236 241 255 211 258 C238 244 248 224 237 202 C220 172 185 121 153 66 Z',
  inner: 'M130 145 C166 166 197 189 220 215 C233 228 243 232 251 226 L242 243 C218 249 199 236 184 218 Z',
  front: 'M77 175 L130 145 C149 171 169 194 190 216 C207 235 224 244 246 234 C239 246 221 258 201 261 C161 267 124 237 105 215 Z',
  upperEdge: 'M155 67 L222 33 L291 134 C315 169 321 190 298 214 C279 235 243 253 214 257',
  frontEdge: 'M78 175 L130 146 C149 172 170 195 190 217 C207 235 224 244 246 234',
};

function bend(d, progress, baseline) {
  let index = 0;
  return d.replace(/-?\d+(?:\.\d+)?/g, (value) => {
    const n = Number(value);
    return (++index % 2 ? n : baseline + (n - baseline) * progress).toFixed(2);
  });
}

/** Prefix must be unique when several marks share an HTML document. */
export function ribbonBody(time = REVEAL_DURATION, prefix = 'gx', solid = '') {
  const id = prefix.replace(/[^a-zA-Z0-9_-]/g, '');
  const tail = phase(time, .1, .65);
  const upper = phase(time, .5, 1.65);
  const front = phase(time, .65, 1.3);
  const fill = (key) => solid || `url(#${id}-${key})`;
  const upperPath = bend(paths.upper, upper, 240);
  const frontPath = bend(paths.front, front, 224);
  const innerPath = bend(paths.inner, front, 224);
  const shine = clamp((time - 2.15) / .85);
  const glow = shine > 0 && shine < 1 && !solid;
  return `<defs>
    <linearGradient id="${id}-upper" x1="159" y1="48" x2="291" y2="231" gradientUnits="userSpaceOnUse"><stop stop-color="#fff0ab"/><stop offset=".18" stop-color="#e5bc58"/><stop offset=".45" stop-color="#a87823"/><stop offset=".68" stop-color="#edc76a"/><stop offset=".8" stop-color="#fff0a8"/><stop offset="1" stop-color="#af7720"/></linearGradient>
    <linearGradient id="${id}-front" x1="99" y1="153" x2="220" y2="259" gradientUnits="userSpaceOnUse"><stop stop-color="#ffe493"/><stop offset=".3" stop-color="#dbae48"/><stop offset=".67" stop-color="#b17d26"/><stop offset=".87" stop-color="#e5b94d"/><stop offset="1" stop-color="#fbe396"/></linearGradient>
    <linearGradient id="${id}-inner" x1="162" y1="164" x2="219" y2="247" gradientUnits="userSpaceOnUse"><stop stop-color="#704c19"/><stop offset=".58" stop-color="#402f15"/><stop offset="1" stop-color="#bd943e"/></linearGradient>
    <linearGradient id="${id}-tail" x1="37" y1="244" x2="110" y2="221" gradientUnits="userSpaceOnUse"><stop stop-color="#edc768"/><stop offset=".26" stop-color="#b5842c"/><stop offset=".65" stop-color="#f4d77d"/><stop offset="1" stop-color="#83551a"/></linearGradient>
    <linearGradient id="${id}-shine"><stop stop-color="#fff7d4" stop-opacity="0"/><stop offset=".5" stop-color="#fff7d4" stop-opacity=".52"/><stop offset="1" stop-color="#fff7d4" stop-opacity="0"/></linearGradient>
    <clipPath id="${id}-clip"><path d="${paths.tail}"/><path d="${upperPath}"/><path d="${frontPath}"/></clipPath>
  </defs>
  <g opacity="${tail}" transform="translate(${(1-tail)*-12} ${(1-tail)*8})"><path d="${paths.tail}" fill="${fill('tail')}"/></g>
  <g opacity="${upper}"><path d="${upperPath}" fill="${fill('upper')}"/>${solid ? '' : `<path d="${bend(paths.upperEdge,upper,240)}" stroke="#ffeaaa" stroke-opacity=".58" stroke-width="1.05" fill="none"/>`}</g>
  <g opacity="${front}"><path d="${innerPath}" fill="${fill('inner')}"/><path d="${frontPath}" fill="${fill('front')}"/>${solid ? '' : `<path d="${bend(paths.frontEdge,front,224)}" stroke="#fff0bb" stroke-opacity=".62" stroke-width=".9" fill="none"/>`}</g>
  ${glow ? `<g clip-path="url(#${id}-clip)"><rect x="${-110+shine*620}" y="-50" width="62" height="420" transform="rotate(-20 180 150)" fill="url(#${id}-shine)"/></g>` : ''}`;
}

export function ribbonSvg(time = REVEAL_DURATION, prefix = 'gx', solid = '') {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 360 300" width="360" height="300" aria-hidden="true" focusable="false">${ribbonBody(time,prefix,solid)}</svg>`;
}

/** Letter outlines are supplied by the export script, keeping the mark small. */
export function wordmark(letters, time = REVEAL_DURATION, color = '#f4fbf8', x = 496, y = 398, size = .065) {
  return letters.map((letter, i) => {
    const p = phase(time, 1.85 + i*.065, .55);
    return `<g opacity="${p}" transform="translate(0 ${(1-p)*18})"><path fill="${color}" d="${letter.path}" transform="translate(${x+letter.x*size} ${y}) scale(${size} ${-size})"/></g>`;
  }).join('');
}

export function sceneSvg(letters, time = REVEAL_DURATION, background = true) {
  const lockup = phase(time, 1.6, 1.05);
  const x = 463 - lockup*315;
  const s = 1 - lockup*.07;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1280" height="720" viewBox="0 0 1280 720" role="img" aria-label="Gradexa oltin tasma logotipi"><defs><radialGradient id="stage-bg" cx=".46" cy=".43" r=".66"><stop stop-color="#10362b"/><stop offset=".57" stop-color="#071f19"/><stop offset="1" stop-color="#04120e"/></radialGradient></defs>${background ? '<rect width="1280" height="720" fill="url(#stage-bg)"/>' : ''}<g transform="translate(${x} 219) scale(${s})">${ribbonBody(time,'stage')}</g>${wordmark(letters,time)}</svg>`;
}
