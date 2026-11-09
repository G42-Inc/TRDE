import assert from 'node:assert/strict';
import test from 'node:test';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { AnimatedNumber, AnimatedCurrency, AnimatedPercentage } from '../src/components/AnimatedNumber';

test('metrics render their real value before hydration or scrolling', () => {
  const markup = renderToStaticMarkup(createElement(AnimatedNumber, { value: 490, prefix: '$', decimals: 2 }));
  assert.match(markup, /class="sr-only">\$490\.00</);
  assert.match(markup, /aria-hidden="true">\$490\.00</);
  assert.doesNotMatch(markup, />\$0\.00</);
});

test('currency and percentage displays retain fractional precision', () => {
  assert.match(renderToStaticMarkup(createElement(AnimatedCurrency, { value: -110.25 })), />-\$110\.25</);
  assert.match(renderToStaticMarkup(createElement(AnimatedPercentage, { value: 16.7 })), />16\.7%</);
});
