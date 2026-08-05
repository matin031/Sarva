/** Shapes and vocabulary of سروا کلاب.
 *
 *  Deliberately free of any `server-only` import or Supabase call: the
 *  composer, the feed cards and the admin panel are all Client Components and
 *  they need the same lists of قالب‌ها and برچسب‌ها the server validates
 *  against. Keeping the whitelist here means the dropdown and the check that
 *  rejects a forged value can never drift apart. */

export type ClubStatus = "pending" | "approved" | "rejected";

export type ClubPostForm =
  | "ghazal"
  | "ghaside"
  | "masnavi"
  | "robaee"
  | "dobeyti"
  | "chaharpare"
  | "ghete"
  | "nimaei"
  | "sepid"
  | "other";

export type ReportReason =
  | "plagiarism"
  | "offensive"
  | "spam"
  | "off_topic"
  | "other";

export type ReportStatus = "open" | "resolved" | "dismissed";

export const POST_FORMS: { id: ClubPostForm; label: string }[] = [
  { id: "ghazal", label: "غزل" },
  { id: "ghaside", label: "قصیده" },
  { id: "masnavi", label: "مثنوی" },
  { id: "robaee", label: "رباعی" },
  { id: "dobeyti", label: "دوبیتی" },
  { id: "chaharpare", label: "چهارپاره" },
  { id: "ghete", label: "قطعه" },
  { id: "nimaei", label: "نیمایی" },
  { id: "sepid", label: "سپید" },
  { id: "other", label: "سایر" },
];

export const POST_TAGS: { id: string; label: string }[] = [
  { id: "asheghane", label: "عاشقانه" },
  { id: "ejtemaee", label: "اجتماعی" },
  { id: "erfani", label: "عرفانی" },
  { id: "tanz", label: "طنز" },
  { id: "vatani", label: "وطنی" },
  { id: "aeeni", label: "آیینی" },
  { id: "delneveshte", label: "دل‌نوشته" },
  { id: "kudak", label: "کودک و نوجوان" },
];

export const REPORT_REASONS: { id: ReportReason; label: string }[] = [
  { id: "plagiarism", label: "سرقت ادبی — شعر از شاعر دیگری است" },
  { id: "offensive", label: "توهین‌آمیز یا نامناسب" },
  { id: "spam", label: "تبلیغ یا محتوای بی‌ربط تکراری" },
  { id: "off_topic", label: "بی‌ارتباط با شعر و ادبیات" },
  { id: "other", label: "دلیل دیگر" },
];

export const STATUS_LABEL: Record<ClubStatus, string> = {
  pending: "در انتظار بررسی",
  approved: "منتشر شده",
  rejected: "بازگردانده شده",
};

export const MAX_BODY = 4000;
export const MAX_TITLE = 80;
export const MAX_COMMENT = 1500;
export const MAX_TAGS = 3;
/** How many سروده‌ها one account may submit in a rolling 24 hours. Not a
 *  punishment — it is what stops one enthusiastic evening from burying the
 *  moderation queue for everyone else. */
export const DAILY_POST_LIMIT = 5;
/** …and how many may sit unreviewed at once. */
export const PENDING_POST_LIMIT = 5;
export const DAILY_COMMENT_LIMIT = 40;

export const formLabel = (id: string) =>
  POST_FORMS.find((f) => f.id === id)?.label ?? "سایر";
export const tagLabel = (id: string) =>
  POST_TAGS.find((t) => t.id === id)?.label ?? id;
export const reasonLabel = (id: string) =>
  REPORT_REASONS.find((r) => r.id === id)?.label ?? id;

export type ClubPost = {
  id: string;
  authorName: string;
  isAnonymous: boolean;
  isMine: boolean;
  title: string | null;
  body: string;
  form: ClubPostForm;
  tags: string[];
  meter: string | null;
  status: ClubStatus;
  reviewNote: string | null;
  featured: boolean;
  likeCount: number;
  commentCount: number;
  likedByMe: boolean;
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type ClubComment = {
  id: string;
  postId: string;
  parentId: string | null;
  authorName: string;
  body: string;
  status: ClubStatus;
  reviewNote: string | null;
  isMine: boolean;
  createdAt: string;
};

/** A دیدگاه as the admin queue shows it — with the سروده it belongs to, so a
 *  moderator can judge it without opening another page. */
export type ClubCommentWithPost = ClubComment & {
  postTitle: string | null;
  postExcerpt: string;
};

export type ClubReport = {
  id: string;
  reporterName: string;
  targetType: "post" | "comment";
  targetId: string;
  reason: ReportReason;
  note: string | null;
  status: ReportStatus;
  createdAt: string;
  /** first lines of the reported thing, resolved when the report is listed */
  targetExcerpt: string | null;
  /** null once the reported سروده or دیدگاه has been deleted */
  targetStatus: ClubStatus | null;
};

export type ClubFeedSort = "recent" | "popular" | "discussed";

export type ActionResult<T = null> =
  | { ok: true; data: T }
  | { ok: false; error: string };

/** Lines of a poem, with blank lines collapsed — used by every renderer so a
 *  سروده looks the same in the feed, the panel and the moderation queue. */
export function poemLines(body: string): string[] {
  return body
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);
}

export function poemExcerpt(body: string, lines = 2): string {
  return poemLines(body).slice(0, lines).join(" / ");
}
