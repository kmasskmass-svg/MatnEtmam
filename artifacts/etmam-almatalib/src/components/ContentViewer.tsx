import { useSettings } from "@/hooks/useSettings";
import { useBookmarks } from "@/hooks/useBookmarks";
import { normalizeArabic, countWords, estimateReadingTime } from "@/utils/arabic";
import { Bookmark, BookmarkCheck, Copy, Check, Clock, FileText } from "lucide-react";
import { useState, useMemo } from "react";
import type { Book, Bab, Fasl } from "@/types";
import AudioPlayer from "@/components/AudioPlayer";

interface Props {
  book: Book;
  bab?: Bab;
  fasl?: Fasl;
  searchQuery?: string;
}

function HighlightedLine({ text, query }: { text: string; query: string }) {
  if (!query || query.length < 2) return <>{text}</>;
  const nq = normalizeArabic(query);
  const parts: React.ReactElement[] = [];
  let remaining = text;
  let key = 0;
  while (remaining.length > 0) {
    const normRemain = normalizeArabic(remaining);
    const idx = normRemain.indexOf(nq);
    if (idx === -1) { parts.push(<span key={key++}>{remaining}</span>); break; }
    if (idx > 0) parts.push(<span key={key++}>{remaining.slice(0, idx)}</span>);
    const matchLen = Math.min(nq.length + 4, remaining.length - idx);
    parts.push(<mark key={key++} className="search-mark">{remaining.slice(idx, idx + matchLen)}</mark>);
    remaining = remaining.slice(idx + matchLen);
  }
  return <>{parts}</>;
}

export default function ContentViewer({ book, bab, fasl, searchQuery = "" }: Props) {
  const { settings } = useSettings();
  const { addBookmark, removeBookmark, isBookmarked, bookmarks } = useBookmarks();
  const [copied, setCopied] = useState(false);

  const fontFamilyMap: Record<string, string> = {
    amiri: "'Amiri', serif",
    noto: "'Noto Naskh Arabic', serif",
    scheherazade: "'Scheherazade New', serif",
  };
  const fontFamily = fontFamilyMap[settings.fontFamily] || "'Amiri', serif";

  const bookmarked = isBookmarked(book.id, bab?.id, fasl?.id);

  const handleBookmarkToggle = () => {
    if (bookmarked) {
      const bm = bookmarks.find(b =>
        b.bookId === book.id && b.babId === bab?.id && b.faslId === fasl?.id
      );
      if (bm) removeBookmark(bm.id);
    } else {
      addBookmark({
        bookId: book.id,
        babId: bab?.id,
        faslId: fasl?.id,
        title: fasl?.title || bab?.title || book.title,
        bookTitle: book.title,
      });
    }
  };

  const contentLines = useMemo(() => {
    if (fasl) return fasl.content;
    if (bab) return [...bab.content];
    return book.introContent || [];
  }, [book, bab, fasl]);

  const allContent = useMemo(() => {
    if (fasl) return fasl.content;
    if (bab) return [...bab.content, ...bab.fusul.flatMap(f => f.content)];
    return book.introContent || [];
  }, [book, bab, fasl]);

  const wordCount = useMemo(() => countWords(allContent), [allContent]);
  const readingTime = useMemo(() => estimateReadingTime(wordCount), [wordCount]);

  const handleCopy = () => {
    const text = allContent.join("\n\n");
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const textStyle = {
    fontSize: settings.fontSize,
    lineHeight: settings.lineHeight,
    fontFamily,
    color: "var(--text-primary)",
    textAlign: "right" as const,
    direction: "rtl" as const,
  };

  const renderLines = (lines: string[]) =>
    lines.map((line, i) => (
      <p key={i} style={{ ...textStyle, marginBottom: "1em" }}>
        {searchQuery ? <HighlightedLine text={line} query={searchQuery} /> : line}
      </p>
    ));

  const sectionTitle = fasl
    ? (fasl.title === "فَصْلٌ" ? "فَصْلٌ" : fasl.title)
    : bab ? bab.title : book.title;

  const titleSize = Math.max(settings.fontSize + 8, 26);
  const babTitleSize = Math.max(settings.fontSize + 4, 22);
  const faslTitleSize = Math.max(settings.fontSize + 2, 20);

  return (
    <div className="fade-in">
      {/* Breadcrumb */}
      <div style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 16, display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
        <span style={{ color: "var(--accent)", fontWeight: 600 }}>{book.title}</span>
        {bab && <><span>›</span><span>{bab.title}</span></>}
        {fasl && <><span>›</span><span>{fasl.title === "فَصْلٌ" ? "فصل" : fasl.title}</span></>}
      </div>

      {/* Action bar */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20, gap: 12 }}>
        <div style={{ display: "flex", gap: 8, alignItems: "center", color: "var(--text-muted)", fontSize: 12 }}>
          <span style={{ display: "flex", alignItems: "center", gap: 4 }}><Clock size={12} /> {readingTime}</span>
          <span style={{ color: "var(--border)" }}>·</span>
          <span style={{ display: "flex", alignItems: "center", gap: 4 }}><FileText size={12} /> {wordCount.toLocaleString("ar-SA")} كلمة</span>
        </div>
        <div style={{ display: "flex", gap: 6 }}>
          <button
            onClick={handleBookmarkToggle}
            title={bookmarked ? "إزالة العلامة" : "إضافة علامة مرجعية"}
            style={{ padding: "7px 12px", borderRadius: 8, border: `1px solid ${bookmarked ? "var(--accent)" : "var(--border)"}`, background: bookmarked ? "var(--accent-bg)" : "var(--bg-secondary)", color: bookmarked ? "var(--accent)" : "var(--text-muted)", cursor: "pointer", display: "flex", alignItems: "center", gap: 6, fontSize: 12, fontFamily: "inherit" }}
          >
            {bookmarked ? <BookmarkCheck size={14} /> : <Bookmark size={14} />}
            {bookmarked ? "محفوظ" : "احفظ"}
          </button>
          <button
            onClick={handleCopy}
            title="نسخ النص"
            style={{ padding: "7px 12px", borderRadius: 8, border: "1px solid var(--border)", background: copied ? "var(--accent-bg)" : "var(--bg-secondary)", color: copied ? "var(--accent)" : "var(--text-muted)", cursor: "pointer", display: "flex", alignItems: "center", gap: 6, fontSize: 12, fontFamily: "inherit" }}
          >
            {copied ? <Check size={14} /> : <Copy size={14} />}
            {copied ? "تم النسخ" : "نسخ"}
          </button>
        </div>
      </div>

      {/* Audio Player */}
      <AudioPlayer lines={allContent} sectionTitle={sectionTitle} />

      {/* Section title */}
      <div style={{ textAlign: "center", marginBottom: 28, padding: "20px 16px", borderTop: "2px solid var(--accent-light)", borderBottom: "2px solid var(--accent-light)" }}>
        {!bab && !fasl && (
          <h1 style={{ ...textStyle, fontSize: titleSize, fontWeight: 700, color: "var(--accent)", textAlign: "center", lineHeight: 1.5 }}>
            {book.title}
          </h1>
        )}
        {bab && !fasl && (
          <h2 style={{ ...textStyle, fontSize: babTitleSize, fontWeight: 700, color: "var(--accent)", textAlign: "center", lineHeight: 1.5 }}>
            {bab.title}
          </h2>
        )}
        {fasl && (
          <h3 style={{ ...textStyle, fontSize: faslTitleSize, fontWeight: 700, color: "var(--green)", textAlign: "center", lineHeight: 1.5 }}>
            {fasl.title === "فَصْلٌ" ? "فَصْلٌ" : fasl.title}
          </h3>
        )}
      </div>

      {/* Basmala */}
      <div style={{ textAlign: "center", marginBottom: 28, fontSize: Math.max(settings.fontSize + 4, 24), fontFamily, color: "var(--accent-light)" }}>
        ﷽
      </div>

      {/* Main content */}
      <div style={{ padding: "0 8px" }}>
        {fasl ? (
          renderLines(fasl.content)
        ) : bab ? (
          <div>
            {renderLines(bab.content)}
            {bab.fusul.map((f, fi) => (
              <div key={f.id} style={{ marginTop: 36 }}>
                <div style={{ textAlign: "center", margin: "24px 0 20px" }}>
                  <span style={{
                    display: "inline-block",
                    fontFamily,
                    fontSize: faslTitleSize,
                    fontWeight: 700,
                    color: "var(--green)",
                    padding: "6px 24px",
                    border: "1px solid var(--border)",
                    borderRadius: 8,
                    background: "var(--bg-secondary)",
                  }}>
                    {f.title === "فَصْلٌ" ? `فَصْلٌ` : f.title}
                  </span>
                </div>
                {renderLines(f.content)}
              </div>
            ))}
          </div>
        ) : (
          renderLines(book.introContent || [])
        )}
      </div>
    </div>
  );
}
