import { isPreviewBackdropClick } from './preview-selection';

function mount(html: string): HTMLElement {
  const host = document.createElement('div');
  host.innerHTML = html;
  return host;
}

describe('isPreviewBackdropClick', () => {
  const host = mount(`
    <table data-testid="outer"><tbody>
      <tr data-block-id="a" class="nte-block"><td><span class="inner">x</span><button class="nte-edit-btn"></button></td></tr>
      <tr><td class="gutter"></td></tr>
    </tbody></table>
    <button class="nte-drag-handle"></button>
    <button class="nte-delete-btn"></button>`);
  const q = (s: string) => host.querySelector(s);

  it('treats the outer table and gutters as backdrop', () => {
    expect(isPreviewBackdropClick(q('[data-testid="outer"]'))).toBe(true);
    expect(isPreviewBackdropClick(q('.gutter'))).toBe(true);
  });

  it('treats blocks and their content as not backdrop', () => {
    expect(isPreviewBackdropClick(q('tr[data-block-id]'))).toBe(false);
    expect(isPreviewBackdropClick(q('.inner'))).toBe(false);
  });

  it('treats block chrome buttons as not backdrop', () => {
    expect(isPreviewBackdropClick(q('.nte-edit-btn'))).toBe(false);
    expect(isPreviewBackdropClick(q('.nte-drag-handle'))).toBe(false);
    expect(isPreviewBackdropClick(q('.nte-delete-btn'))).toBe(false);
  });

  it('ignores a missing target', () => {
    expect(isPreviewBackdropClick(null)).toBe(false);
  });
});
