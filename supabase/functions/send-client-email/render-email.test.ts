import { renderClientEmail } from './render-email.ts';
import { defaultChristmasEmail } from '../_shared/christmas-email.ts';

Deno.test('renders the bilingual email with matching React and server renderer versions', () => {
  const html = renderClientEmail({ ...defaultChristmasEmail, catalogUrl: 'https://example.test/catalog' }, 'https://example.test/unsubscribe');
  if (!html.startsWith('<!DOCTYPE html>') || !html.includes('A CHRISTMAS FLASH SALE') || !html.includes('UNE VENTE ÉCLAIR')) throw new Error('Bilingual email did not render');
  if (!html.includes('href="https://example.test/catalog"') || !html.includes('href="https://example.test/unsubscribe"')) throw new Error('Email links missing');
});