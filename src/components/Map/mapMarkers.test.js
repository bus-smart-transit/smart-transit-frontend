import { describe, expect, it } from 'vitest';
import { BUS_COLORS, busIconSvg, createBusMarkerElement, createYouAreHereElement } from './mapMarkers';

describe('map markers', () => {
  it('draws the bus badge in the given colour', () => {
    expect(busIconSvg('#f59e0b')).toContain('fill="#f59e0b"');
    expect(busIconSvg()).toContain(`fill="${BUS_COLORS.live}"`);
  });

  it('makes a bus marker that can change colour and heading, with no arrow when the heading is unknown', () => {
    const { element, setColor, setHeading } = createBusMarkerElement({ title: 'Bus DEMO-101' });
    const arrow = element.querySelector('.st-bus-heading');

    expect(element.getAttribute('aria-label')).toBe('Bus DEMO-101');
    expect(arrow.style.display).toBe('none');

    setHeading(90);
    expect(arrow.style.display).toBe('block');
    expect(arrow.style.transform).toBe('rotate(90deg)');

    setColor('#94a3b8');
    expect(element.querySelector('.st-bus-badge').innerHTML).toContain('fill="#94a3b8"');
  });

  it('makes a "You are here" pin', () => {
    const element = createYouAreHereElement();

    expect(element.getAttribute('aria-label')).toBe('You are here');
    expect(element.querySelector('svg path')).not.toBeNull();
  });
});
