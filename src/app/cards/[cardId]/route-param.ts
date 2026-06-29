export function decodeCardIdRouteParam(cardId: string) {
  try {
    return decodeURIComponent(cardId);
  } catch {
    return null;
  }
}
