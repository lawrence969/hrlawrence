import React from 'npm:react@18.3.1';
import { renderToStaticMarkup } from 'npm:react-dom@18.3.1/server';
import { Html, Head, Preview, Body, Container, Text, Button, Hr, Link } from 'npm:@react-email/components@0.0.22';
import type { ChristmasEmail } from '../_shared/christmas-email.ts';

export function renderClientEmail(draft: ChristmasEmail, unsubscribe: string): string {
  const sections = (text: string, label: string) => [
    ...text.split('\n\n').map((paragraph, i) => React.createElement(Text, { key: `${label}-${i}`, style: { fontSize: i === 0 ? '22px' : '15px', lineHeight: '1.7', whiteSpace: 'pre-line', fontFamily: i === 0 ? 'Georgia,serif' : 'Arial,sans-serif' } }, paragraph)),
    React.createElement(Button, { key: label, href: draft.catalogUrl, style: { backgroundColor: '#1c2854', color: '#ffffff', padding: '14px 24px', fontFamily: 'Arial,sans-serif' } }, label),
  ];
  const email = React.createElement(Html, null, React.createElement(Head), React.createElement(Preview, null, draft.preview), React.createElement(Body, { style: { backgroundColor: '#ffffff', color: '#1c2854' } }, React.createElement(Container, { style: { maxWidth: '620px', padding: '32px 20px' } }, React.createElement(Text, { style: { fontFamily: 'Georgia,serif', fontSize: '26px', borderBottom: '1px solid #c29a47', paddingBottom: '20px' } }, 'HR Lawrence Fine Jewelry'), ...sections(draft.english, 'Browse the Collection'), React.createElement(Hr), ...sections(draft.french, 'Découvrir la collection'), React.createElement(Hr), React.createElement(Link, { href: unsubscribe }, 'Unsubscribe / Se désabonner'))));
  return '<!DOCTYPE html>' + renderToStaticMarkup(email);
}