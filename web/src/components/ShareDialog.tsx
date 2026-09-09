"use client";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useState } from "react";
import { sfx } from "@/lib/sfx";
import { renderImage, share, shareText, toUrl, type Shared } from "@/lib/share";

/** 共有ダイアログ。画像・URL・文章のどれで持ち帰るかをここで選ぶ */
export default function ShareDialog({ data, open, onClose }: { data: Shared; open: boolean; onClose: () => void }) {
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);

  useEffect(() => {
    if (!open) { setPreview(null); setNotice(null); return; }
    let url: string | null = null;
    renderImage(data).then((b) => { if (b) { url = URL.createObjectURL(b); setPreview(url); } });
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") { e.preventDefault(); e.stopPropagation(); onClose(); }
      if (e.key.startsWith("Arrow") || e.key === "Enter" || e.key === " ") e.stopPropagation();
    };
    window.addEventListener("keydown", onKey, true);
    return () => { window.removeEventListener("keydown", onKey, true); if (url) URL.revokeObjectURL(url); };
  }, [open, data, onClose]);

  const say = (m: string) => { setNotice(m); setTimeout(() => setNotice(null), 2400); };
  const text = shareText(data);
  const url = toUrl(data);

  const saveImage = async () => {
    if (busy) return; setBusy(true); sfx.confirm();
    try {
      const blob = await renderImage(data);
      if (!blob) { say("画像を作れませんでした"); return; }
      const file = new File([blob], "gemin-shopping.png", { type: "image/png" });
      if (navigator.share && navigator.canShare?.({ files: [file] })) {
        try { await navigator.share({ files: [file], title: "下民ショッピング", text }); say("共有しました"); return; } catch { /* 保存へ */ }
      }
      const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = file.name; a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 4000);
      say("画像を保存しました");
    } finally { setBusy(false); }
  };
  const copy = async (s: string, m: string) => { sfx.confirm(); try { await navigator.clipboard.writeText(s); say(m); } catch { say("コピーできませんでした"); } };
  const sheet = async () => { sfx.confirm(); const r = await share(data); say(r === "shared" ? "共有しました" : r === "copied" ? "文章と URL をコピーしました" : "共有できませんでした"); };

  return (
    <AnimatePresence>
      {open && (
        <motion.div className="backdrop" onClick={onClose} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
          <motion.div className="dlg dlg-wide" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal
            initial={{ scale: .9, y: 20, opacity: 0 }} animate={{ scale: 1, y: 0, opacity: 1 }} exit={{ scale: .94, y: 10, opacity: 0 }}
            transition={{ type: "spring", stiffness: 220, damping: 22 }}>
            <div className="win">
            <span className="win-speaker">き ょ う ゆ う</span>
            <button className="dlg-x" onClick={onClose} aria-label="閉じる">✕</button>
            <div className="win-body dlg-body">
              <div className="dlg-scroll">
              <div className="share-grid">
                <div className="share-preview">
                  {preview
                    ? /* eslint-disable-next-line @next/next/no-img-element */
                      <img src={preview} alt="結果画像" />
                    : <div className="share-preview-wait">絵師が描いております…</div>}
                </div>
                <div className="share-actions">
                  <button className="share-btn" onClick={saveImage} disabled={busy}>
                    <b>🖼 画像にする</b><span>{busy ? "描いております…" : "PNG を保存（スマホは共有シートへ）"}</span>
                  </button>
                  <button className="share-btn" onClick={() => copy(url, "URL をコピーしました")}>
                    <b>🔗 URL にする</b><span>読み取り専用の年代記を開ける</span>
                  </button>
                  <button className="share-btn" onClick={() => copy(text, "文章をコピーしました")}>
                    <b>📝 文章にする</b><span>称号・戦利品・寓話を数行で</span>
                  </button>
                  {typeof navigator !== "undefined" && "share" in navigator && (
                    <button className="share-btn" onClick={sheet}>
                      <b>📤 共有シート</b><span>端末の共有画面を開く</span>
                    </button>
                  )}
                  <pre className="share-text">{text}</pre>
                </div>
              </div>
              </div>
              <div className="dlg-foot">
                <span className="share-notice">{notice ?? ""}</span>
                <button className="btn ghost" onClick={onClose}>とじる</button>
              </div>
            </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
