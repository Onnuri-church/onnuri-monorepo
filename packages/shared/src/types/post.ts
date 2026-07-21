export type BoardType = "qt" | "prayer" | "team" | "group";

export interface Post {
  id: string;
  boardType: BoardType;
  authorId: string;
  title: string | null;
  content: string;
  isAnonymous: boolean;
  isPinned: boolean;
  createdAt: string;
  updatedAt: string;
}
