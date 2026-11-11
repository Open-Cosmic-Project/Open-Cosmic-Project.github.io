import { ChangeDetectionStrategy, Component, ElementRef, effect, inject, input, signal, untracked } from '@angular/core';
import { animate, utils } from 'animejs';
import { fmt, motionOK } from './util';

/** Número que se anima hacia su nuevo valor y destella al cambiar. */
@Component({
  selector: 'oc-count',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `{{ shown() }}`,
  styles: [`:host { font-variant-numeric: tabular-nums; display: inline-block; transition: color .3s, text-shadow .3s; }
    :host(.bump) { color: var(--tone, var(--primary)); text-shadow: 0 0 22px var(--tone, var(--primary)); }`],
})
export class CountComponent {
  value = input.required<number>();
  shown = signal('0');
  private host = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
  private cur = { v: 0 };
  private first = true;
  constructor() {
    effect(() => {
      const to = this.value();
      untracked(() => {
        if (!motionOK()) { this.cur.v = to; this.shown.set(fmt.format(to)); return; }
        const up = !this.first && to !== Math.round(this.cur.v);
        animate(this.cur, {
          v: to, duration: this.first ? 1600 : 900, ease: 'outExpo', modifier: utils.round(0),
          onUpdate: () => this.shown.set(fmt.format(Math.round(this.cur.v))),
        });
        if (up) { this.host.classList.add('bump'); setTimeout(() => this.host.classList.remove('bump'), 1200); }
        this.first = false;
      });
    });
  }
}

/** Avatar con inicial de respaldo (si la imagen no carga o no hay). */
@Component({
  selector: 'oc-avatar',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<span class="ini" aria-hidden="true">{{ name().charAt(0).toUpperCase() }}</span>
    @if (src() && !bad()) { <img [src]="src()" [alt]="''" loading="lazy" decoding="async" referrerpolicy="no-referrer" (error)="bad.set(true)"> }`,
  styles: [`:host { position: relative; display: inline-grid; place-items: center; width: var(--s, 36px); height: var(--s, 36px); border-radius: 50%; overflow: hidden; flex: none;
      background: hsl(var(--h, 260) 70% 45%); color: #fff; font-weight: 700; font-size: calc(var(--s, 36px) * .42); }
    img { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; }`],
  host: { '[style.--h]': 'hue()' },
})
export class AvatarComponent {
  src = input<string>('');
  name = input.required<string>();
  bad = signal(false);
  hue = () => [...this.name()].reduce((a, c) => (a * 31 + c.charCodeAt(0)) % 360, 7);
}
