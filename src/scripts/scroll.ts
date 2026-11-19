// Ties the handscroll and the progress bar to the recording. The scroll unrolls
// from the right as the music plays, and moving either one moves the music.
const page = document.documentElement;
const root = document.querySelector<HTMLElement>('[data-scroll]')!;
const view = root.querySelector<HTMLElement>('[data-view]')!;
const strip = root.querySelector<HTMLElement>('[data-strip]')!;
const audio = document.querySelector<HTMLAudioElement>('[data-audio]')!;
const button = document.querySelector<HTMLButtonElement>('[data-play]')!;
const clock = document.querySelector<HTMLElement>('[data-clock]')!;
const progress = document.querySelector<HTMLInputElement>('[data-progress]')!;
const duration = Number(root.dataset.duration);
const still = matchMedia('(prefers-reduced-motion: reduce)');

const clamp = (v: number, low = 0, high = 1) => Math.min(high, Math.max(low, v));
const stamp = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
const travel = () => Math.max(1, view.scrollWidth - view.clientWidth);

let expected = 0;
let settling: number | undefined;
let scrubbing = false;
let holdingBar = false;
let drag: { x: number; left: number; moved: boolean } | null = null;
let shownSecond = -1;

function paint(p: number, moveScroll = true) {
  const seconds = p * duration;
  page.style.setProperty('--p', p.toFixed(5));
  clock.textContent = stamp(seconds);
  if (!holdingBar) progress.value = String(seconds);
  progress.setAttribute('aria-valuetext', stamp(seconds));
  view.setAttribute('aria-valuenow', String(Math.round(seconds)));
  view.setAttribute('aria-valuetext', stamp(seconds));
  if (moveScroll) {
    expected = -travel() * p;
    view.scrollLeft = expected;
  }
}

function tick() {
  if (!scrubbing && !drag) {
    const second = Math.floor(audio.currentTime);
    if (!still.matches || second !== shownSecond) {
      shownSecond = second;
      paint(clamp(audio.currentTime / duration));
    }
  }
  if (!audio.paused) requestAnimationFrame(tick);
}

function seek(seconds: number, play = false) {
  const target = clamp(seconds, 0, duration);
  audio.currentTime = target;
  paint(target / duration);
  if (play && audio.paused) void audio.play();
}

function seekToPoint(clientX: number) {
  const box = strip.getBoundingClientRect();
  seek((1 - clamp((clientX - box.left) / box.width)) * duration);
}

function showState() {
  const playing = !audio.paused;
  button.classList.toggle('is-playing', playing);
  button.setAttribute('aria-label', (playing ? button.dataset.pauseLabel : button.dataset.playLabel) ?? '');
}

button.addEventListener('click', () => {
  if (audio.paused) void audio.play();
  else audio.pause();
});

audio.addEventListener('play', () => {
  showState();
  requestAnimationFrame(tick);
});
audio.addEventListener('pause', showState);
audio.addEventListener('ended', showState);
audio.addEventListener('timeupdate', () => {
  if (!scrubbing && !drag) paint(clamp(audio.currentTime / duration));
});

progress.addEventListener('input', () => {
  holdingBar = true;
  scrubbing = true;
  paint(clamp(Number(progress.value) / duration));
});

progress.addEventListener('change', () => {
  audio.currentTime = Number(progress.value);
  holdingBar = false;
  scrubbing = false;
  paint(clamp(Number(progress.value) / duration));
});

view.addEventListener(
  'scroll',
  () => {
    if (Math.abs(view.scrollLeft - expected) < 2) return;
    const p = clamp(Math.abs(view.scrollLeft) / travel());
    expected = view.scrollLeft;
    scrubbing = true;
    paint(p, false);
    window.clearTimeout(settling);
    settling = window.setTimeout(() => {
      audio.currentTime = p * duration;
      scrubbing = false;
    }, 140);
  },
  { passive: true },
);

view.addEventListener('pointerdown', (event) => {
  if (event.pointerType !== 'mouse') return;
  drag = { x: event.clientX, left: view.scrollLeft, moved: false };
  view.setPointerCapture(event.pointerId);
  view.classList.add('is-dragging');
});

view.addEventListener('pointermove', (event) => {
  if (!drag) return;
  const dx = event.clientX - drag.x;
  if (Math.abs(dx) > 3) drag.moved = true;
  if (drag.moved) view.scrollLeft = drag.left - dx;
});

function endDrag(event: PointerEvent) {
  if (!drag) return;
  const { moved } = drag;
  drag = null;
  view.classList.remove('is-dragging');
  if (!moved && event.type === 'pointerup') seekToPoint(event.clientX);
}
view.addEventListener('pointerup', endDrag);
view.addEventListener('pointercancel', endDrag);

view.addEventListener('click', (event) => {
  if ((event as PointerEvent).pointerType !== 'mouse') seekToPoint(event.clientX);
});

// The scroll reads right to left, so the left arrow moves forward in time.
view.addEventListener('keydown', (event) => {
  const step: Record<string, number> = { ArrowLeft: 5, ArrowRight: -5, ArrowUp: 5, ArrowDown: -5 };
  if (event.key in step) {
    event.preventDefault();
    seek(audio.currentTime + step[event.key]);
  } else if (event.key === 'Home') {
    event.preventDefault();
    seek(0);
  } else if (event.key === 'End') {
    event.preventDefault();
    seek(duration);
  }
});

// Changing language replaces the words and leaves the recording playing.
const headings = () => [...document.querySelectorAll<HTMLElement>('article h2')];
const swappedParts = ['.top', '.masthead', '.column'];
const swappedAttributes: [string, string][] = [
  ['[data-view]', 'aria-label'],
  ['[data-progress]', 'aria-label'],
  ['[data-play]', 'data-play-label'],
  ['[data-play]', 'data-pause-label'],
  ['.painting', 'alt'],
  ['meta[name="description"]', 'content'],
  ['link[rel="canonical"]', 'href'],
];

async function changeLanguage(href: string, remember: boolean) {
  let next: Document;
  try {
    const response = await fetch(href);
    if (!response.ok) throw new Error(String(response.status));
    next = new DOMParser().parseFromString(await response.text(), 'text/html');
  } catch {
    window.location.href = href;
    return;
  }

  const reading = headings().filter((heading) => heading.getBoundingClientRect().top < 120).length - 1;

  page.lang = next.documentElement.lang;
  document.title = next.title;
  for (const part of swappedParts) document.querySelector(part)?.replaceWith(next.querySelector(part)!);
  for (const [selector, name] of swappedAttributes) {
    const value = next.querySelector(selector)?.getAttribute(name);
    if (value != null) document.querySelector(selector)?.setAttribute(name, value);
  }
  showState();

  if (remember) history.pushState(null, '', href);
  if (reading >= 0) headings()[reading]?.scrollIntoView({ behavior: 'instant', block: 'start' });
}

document.addEventListener('click', (event) => {
  const target = event.target as Element;
  const time = target.closest<HTMLElement>('[data-seek]');
  if (time) {
    seek(Number(time.dataset.seek), true);
    return;
  }
  const link = target.closest<HTMLAnchorElement>('[data-language]');
  if (!link || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
  event.preventDefault();
  void changeLanguage(link.href, true);
});

window.addEventListener('popstate', () => void changeLanguage(window.location.href, false));
window.addEventListener('resize', () => paint(clamp(audio.currentTime / duration)));
paint(0);
