import { Component } from '@angular/core';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { GroupAccordionComponent } from './group-accordion.component';

@Component({
  imports: [GroupAccordionComponent],
  template: `
    <app-group-accordion tab="a" groupId="one" hue="blue" icon="1" title="One" data-testid="a-one">
      <span groupHead data-testid="head-extra"></span>
      <input data-testid="a-one-field" />
    </app-group-accordion>
    <app-group-accordion tab="a" groupId="two" hue="green" icon="2" title="Two" data-testid="a-two" />
    <app-group-accordion tab="b" groupId="one" hue="gold" icon="3" title="Other tab" data-testid="b-one" />
  `,
})
class HostComponent {}

describe('GroupAccordionComponent', () => {
  let fixture: ComponentFixture<HostComponent>;

  const mount = () => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({});
    fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();
  };
  const group = (id: string) => fixture.nativeElement.querySelector(`[data-testid="${id}"]`) as HTMLElement;
  const toggle = (id: string) => group(id).querySelector<HTMLButtonElement>('[data-testid="group-toggle"]')!;
  const panel = (id: string) => group(id).querySelector<HTMLElement>('[data-testid="group-panel"]')!;
  const isOpen = (id: string) => toggle(id).getAttribute('aria-expanded') === 'true';

  beforeEach(() => {
    localStorage.clear();
    mount();
  });

  it('starts with every group closed and its panel inert', () => {
    for (const id of ['a-one', 'a-two', 'b-one']) {
      expect(isOpen(id)).toBe(false);
      expect(panel(id).hasAttribute('inert')).toBe(true);
    }
  });

  it('keeps head controls outside the toggle and the content inside the panel', () => {
    expect(toggle('a-one').contains(group('a-one').querySelector('[data-testid="head-extra"]'))).toBe(false);
    expect(panel('a-one').querySelector('[data-testid="a-one-field"]')).not.toBeNull();
    expect(toggle('a-one').getAttribute('aria-controls')).toBe(panel('a-one').id);
  });

  it('opens and closes on its head', () => {
    toggle('a-one').click();
    fixture.detectChanges();
    expect(isOpen('a-one')).toBe(true);
    expect(panel('a-one').hasAttribute('inert')).toBe(false);
    expect(group('a-one').classList).toContain('is-open');

    toggle('a-one').click();
    fixture.detectChanges();
    expect(isOpen('a-one')).toBe(false);
  });

  it('remembers open groups after a reload, separately per tab', () => {
    toggle('a-two').click();
    fixture.detectChanges();

    mount();

    expect(isOpen('a-two')).toBe(true);
    expect(isOpen('a-one')).toBe(false);
    expect(isOpen('b-one')).toBe(false);
  });

  it('starts closed when the stored state is unreadable', () => {
    localStorage.setItem('newsletter-template-editor.group-open.v1', '{broken');
    mount();
    expect(isOpen('a-one')).toBe(false);
  });
});
