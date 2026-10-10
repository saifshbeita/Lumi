import { Fragment } from 'react';

/** Keep exact quoted words intact while isolating their direction from an explanation. */
export function QuotedText({ text }: { text: string }) {
  return <>{text.split(/("[^"]*")/g).map((part, i) =>
    i % 2 ? <bdi key={i} dir="auto">{part}</bdi> : <Fragment key={i}>{part}</Fragment>
  )}</>;
}

/** Render a translated name template without parsing user-entered text as markup. */
export function NamedText({ template, name }: { template: string; name: string }) {
  return <>{template.split('__NAME__').map((part, i) =>
    <Fragment key={i}>{i > 0 && <bdi dir="auto">{name}</bdi>}{part}</Fragment>
  )}</>;
}
