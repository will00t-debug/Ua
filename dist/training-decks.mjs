// Three PDF-submitted 50-card BLEACH decks for AI sparring.
// AP Card 查 source codes are metadata only; cards use simulator card identities.
// Distinct printings/art variants are collapsed to their canonical BLC ID.
export const TRAINING_DECKS = [
  {
    "id": "green-kenpachi-unohana",
    "name": "綠色｜劍八・卯之花・日番谷",
    "sourceCode": "eb05301f80",
    "color": "green",
    "counts": {
      "BLC-3-008": 2,
      "BLC-3-009": 4,
      "BLC-4-060": 4,
      "BLC-4-066": 4,
      "BLC-1-080": 4,
      "BLC-2-069": 4,
      "BLC-4-070": 4,
      "BLC-1-070": 4,
      "BLC-1-072": 4,
      "BLC-1-083": 4,
      "BLC-1-085": 4,
      "BLC-2-073": 4,
      "BLC-4-080": 4
    }
  },
  {
    "id": "purple-renji-rukia",
    "name": "紫色｜戀次・露琪亞・一護",
    "sourceCode": "eb052afef7",
    "color": "purple",
    "counts": {
      "BLC-1-039": 4,
      "BLC-1-041": 4,
      "BLC-4-050": 4,
      "BLC-4-048": 4,
      "BLC-4-049": 4,
      "BLC-1-047": 4,
      "BLC-2-052": 2,
      "BLC-1-053": 4,
      "BLC-4-054": 4,
      "BLC-4-082": 4,
      "BLC-4-083": 4,
      "BLC-4-058": 4,
      "BLC-4-059": 4
    }
  },
  {
    "id": "blue-ichigo-zangetsu",
    "name": "藍色｜一護・斬月・葛力姆喬",
    "sourceCode": "eb052c890b",
    "color": "blue",
    "counts": {
      "BLC-3-001": 4,
      "BLC-2-015": 3,
      "BLC-2-016": 4,
      "BLC-2-017": 2,
      "BLC-2-019": 4,
      "BLC-2-021": 4,
      "BLC-4-022": 3,
      "BLC-4-026": 3,
      "BLC-4-027": 4,
      "BLC-4-034": 4,
      "BLC-4-036": 3,
      "BLC-2-046": 4,
      "BLC-2-047": 4,
      "BLC-2-049": 4
    }
  }
].map(d=>Object.freeze({...d,counts:Object.freeze(d.counts)}));
export const TRAINING_BY_ID = Object.fromEntries(TRAINING_DECKS.map(d=>[d.id,d]));
