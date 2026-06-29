export function getCardDetailHref(cardId: string) {
  return `/cards/${encodeURIComponent(cardId)}`;
}
