import { Component, ElementRef, NgZone, OnDestroy, afterNextRender, inject, viewChild } from '@angular/core';
import { motionOK } from '../core/util';

interface S { x: number; y: number; z: number; r: number; p: number; v: number; }

/** Campo de estrellas con paralaje (scroll + puntero) y parpadeo. Se detiene si la pestaña está oculta. */
@Component({
  selector: 'oc-stars',
  template: `<canvas #c aria-hidden="true"></canvas>`,
  styles: [`:host { position: fixed; inset: 0; z-index: -1; pointer-events: none; } canvas { width: 100%; height: 100%; display: block; }`],
})
export class StarsComponent implements OnDestroy {
  private cv = viewChild.required<ElementRef<HTMLCanvasElement>>('c');
  private zone = inject(NgZone);
  private raf = 0; private stars: S[] = []; private w = 0; private h = 0; private dpr = 1;
  private mx = 0; private my = 0; private sy = 0; private rgb = '255,255,255';
  private onMove = (e: PointerEvent) => { this.mx = e.clientX / innerWidth - .5; this.my = e.clientY / innerHeight - .5; };
  private onScroll = () => (this.sy = scrollY);
  private onResize = () => this.size();
  private onVis = () => { if (document.hidden) cancelAnimationFrame(this.raf); else this.loop(); };

  constructor() {
    afterNextRender(() => {
      this.size();
      this.rgb = getComputedStyle(document.documentElement).getPropertyValue('--star').trim() || this.rgb;
      new MutationObserver(() => (this.rgb = getComputedStyle(document.documentElement).getPropertyValue('--star').trim()))
        .observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
      addEventListener('resize', this.onResize); addEventListener('scroll', this.onScroll, { passive: true });
      addEventListener('pointermove', this.onMove, { passive: true }); document.addEventListener('visibilitychange', this.onVis);
      if (motionOK()) this.loop(); else this.draw(0);
    });
  }
  private size() {
    const c = this.cv().nativeElement; this.dpr = Math.min(devicePixelRatio || 1, 2);
    this.w = innerWidth; this.h = innerHeight; c.width = this.w * this.dpr; c.height = this.h * this.dpr;
    const n = Math.round((this.w * this.h) / 9000);
    this.stars = Array.from({ length: n }, () => ({ x: Math.random(), y: Math.random(), z: .2 + Math.random() * .8, r: Math.random() * 1.3 + .3, p: Math.random() * 6.28, v: .4 + Math.random() * 1.4 }));
    if (!motionOK()) this.draw(0);
  }
  private loop = () => { this.zone.runOutsideAngular(() => { const f = (t: number) => { this.draw(t / 1000); this.raf = requestAnimationFrame(f); }; this.raf = requestAnimationFrame(f); }); };
  private draw(t: number) {
    const c = this.cv().nativeElement, g = c.getContext('2d'); if (!g) return;
    g.setTransform(this.dpr, 0, 0, this.dpr, 0, 0); g.clearRect(0, 0, this.w, this.h);
    for (const s of this.stars) {
      const px = (s.x * this.w - this.mx * 40 * s.z + this.w) % this.w;
      const py = ((s.y * this.h - this.sy * .06 * s.z - this.my * 40 * s.z) % this.h + this.h) % this.h;
      const a = (.25 + .75 * s.z) * (.55 + .45 * Math.sin(t * s.v + s.p));
      g.fillStyle = `rgba(${this.rgb},${a.toFixed(3)})`; g.beginPath(); g.arc(px, py, s.r * s.z + .2, 0, 6.283); g.fill();
    }
  }
  ngOnDestroy() {
    cancelAnimationFrame(this.raf); removeEventListener('resize', this.onResize); removeEventListener('scroll', this.onScroll);
    removeEventListener('pointermove', this.onMove); document.removeEventListener('visibilitychange', this.onVis);
  }
}
