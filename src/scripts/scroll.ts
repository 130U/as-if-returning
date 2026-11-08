// Ties the handscroll to the recording: the scroll unrolls from the right as
// the music plays, and moving the scroll moves the music.
const root = document.querySelector<HTMLElement>('[data-scroll]')!;
const view = root.querySelector<HTMLElement>('[data-view]')!;
const strip = root.querySelector<HTMLElement>('[data-strip]')!;
const audio = document.querySelector<HTMLAudioElement>('[data-audio]')!;
const button = document.querySelector<HTMLButtonElement>('[data-play]')!;
const clock = document.querySelector<HTMLElement>('[data-clock]')!;
const duration = Number(root.dataset.duration);
const still = matchMedia('(prefers-reduced-motion: reduce)');

const clamp = (v: number, low = 0, high = 1) => Math.min(high, Math.max(low, v));
const stamp = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
const travel = () => Math.max(1, view.scrollWidth - view.clientWidth);

let expected = 0;
let settling: number | undefined;
let scrubbing = false;
let drag: { x: number; left: number; moved: boolean } | null = null;
let shownSecond = -1;

function paint(p: number, moveScroll = true) {
  const seconds = p * duration;
  root.style.setProperty('--p', p.toFixed(5));
  clock.textContent = stamp(seconds);
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

document.querySelectorAll<HTMLButtonElement>('[data-seek]').forEach((link) => {
  link.addEventListener('click', () => seek(Number(link.dataset.seek), true));
});

window.addEventListener('resize', () => paint(clamp(audio.currentTime / duration)));
paint(0);
