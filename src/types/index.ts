export interface StarColor {
  id: string;
  name: string;
  /** Hex color, e.g. #eab308 */
  color: string;
  isDefault: boolean;
}

export interface QA {
  id: string;
  /** Display order / number, 1-based */
  number: number;
  question: string;
  answer: string;
  /** id of the StarColor this question is starred with, or null if unstarred */
  starColorId: string | null;
}

export interface FlashCard {
  id: string;
  topic: string;
  /** ids of Category. Empty/absent means the card belongs to "No Category" */
  categoryIds: string[];
  items: QA[];
  starColorId: string | null;
  createdAt: number;
  updatedAt: number;
}

export interface Category {
  id: string;
  name: string;
  /** the built-in, non-deletable default category */
  isDefault: boolean;
}

export const NO_CATEGORY_ID = "no-category";
