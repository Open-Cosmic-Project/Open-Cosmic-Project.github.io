import { Directive, ElementRef, HostListener, Input, OnDestroy, OnInit, inject, numberAttribute } from '@angular/core';
import { animate, stagger } from 'animejs';
import { motionOK } from './util';

/** Vidrio líquido: la luz especular sigue al puntero. */
@Directive({ selector: '[glass]', host: { class: 'glass' } })
export class GlassDirective {
  private el = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
  @HostListener('pointermove', ['$event']) move(e: PointerEvent) {
    const r = this.el.getBoundingClientRect();
    this.el.style.setProperty('--mx', `${e.clientX - r.left}px`);
    this.el.style.setProperty('--my', `${e.clientY - r.top}px`);
  }
}

/** Inclinación 3D suave al pasar el puntero. */
@Directive({ selector: '[tilt]' })
export class TiltDirective {
  private el = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
  @Input({ transform: numberAttribute }) tilt = 6;
  @HostListener('pointermove', ['$event']) move(e: PointerEvent) {
    if (e.pointerType === 'touch' || !motionOK()) return;
    const r = this.el.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width - .5, y = (e.clientY - r.top) / r.height - .5;
    this.el.style.transform = `perspective(900px) rotateX(${-y * this.tilt}deg) rotateY(${x * this.tilt}deg) translateZ(0)`;
  }
  @HostListener('pointerleave') leave() { this.el.style.transform = ''; }
}

/** Onda de Material al pulsar. */
@Directive({ selector: '[ripple]' })
export class RippleDirective {
  private el = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
  @HostListener('pointerdown', ['$event']) down(e: PointerEvent) {
    const r = this.el.getBoundingClientRect(), d = Math.max(r.width, r.height) * 2;
    const s = document.createElement('span');
    s.className = 'ripple';
    Object.assign(s.style, { width: `${d}px`, height: `${d}px`, left: `${e.clientX - r.left - d / 2}px`, top: `${e.clientY - r.top - d / 2}px` });
    this.el.appendChild(s);
    s.addEventListener('animationend', () => s.remove());
  }
}

/** Aparece al entrar en pantalla; con `reveal="selector"` escalona los hijos. */
@Directive({ selector: '[reveal]' })
export class RevealDirective implements OnInit, OnDestroy {
  private el = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
  @Input() reveal = '';
  private io?: IntersectionObserver;
  ngOnInit() {
    const targets = () => (this.reveal ? Array.from(this.el.querySelectorAll<HTMLElement>(this.reveal)) : [this.el]);
    if (!motionOK() || !('IntersectionObserver' in window)) return;
    targets().forEach(t => (t.style.opacity = '0'));
    this.io = new IntersectionObserver(entries => {
      if (!entries.some(e => e.isIntersecting)) return;
      this.io?.disconnect();
      animate(targets(), { opacity: [0, 1], translateY: [30, 0], scale: [.97, 1], duration: 900, ease: 'outExpo', delay: stagger(70) });
    }, { threshold: .12 });
    this.io.observe(this.el);
  }
  ngOnDestroy() { this.io?.disconnect(); }
}

/** Entrada destacada para elementos que llegan en vivo. */
@Directive({ selector: '[fresh]' })
export class FreshDirective implements OnInit {
  private el = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
  @Input() fresh = false;
  ngOnInit() {
    if (!this.fresh || !motionOK()) return;
    animate(this.el, { translateX: [-40, 0], opacity: [0, 1], scale: [.96, 1], duration: 900, ease: 'outElastic(1, .7)' });
    this.el.classList.add('is-fresh');
    setTimeout(() => this.el.classList.remove('is-fresh'), 3500);
  }
}
