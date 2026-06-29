export function getCardIdRouteLookupCandidates(routeCardId: string): string[] {
  try {
    const decodedRouteCardId = decodeURIComponent(routeCardId);

    if (decodedRouteCardId === routeCardId) {
      return [routeCardId];
    }

    return [routeCardId, decodedRouteCardId];
  } catch {
    return [routeCardId];
  }
}

export async function getFirstCardDetailLookupResult<T>(
  routeCardId: string,
  lookupCardDetail: (cardId: string) => Promise<T | null>,
): Promise<T | null> {
  for (const candidate of getCardIdRouteLookupCandidates(routeCardId)) {
    const card = await lookupCardDetail(candidate);

    if (card) {
      return card;
    }
  }

  return null;
}
