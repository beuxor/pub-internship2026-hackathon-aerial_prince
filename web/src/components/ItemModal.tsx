"use client";
import { AnimatePresence, motion } from "motion/react";
import { useEffect } from "react";
import type { Offering } from "@/lib/types";
import { Portrait } from "./Stage";

/**
 * 献上品の検分。RPG ウィンドウで統一。
 * 枠は画面に収め、長い内容は本文だけがスクロールする（話者タグと閉じるボタンは動かない）。
 */
export default function ItemModal({ offering, onClose }: { offering: Offering | null; onClose: () => void }) {
  useEffect(() => {
    if (!offering) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" || e.key === "Enter" || e.key === " ") { e.preventDefault(); e.stopPropagation(); onClose(); }
      if (e.key.startsWith("Arrow")) e.stopPropagation();
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [offering, onClose]);

  return (
    <AnimatePresence>
      {offering && (
        <motion.div className="backdrop" onClick={onClose} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
          <motion.div className="dlg" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal
            initial={{ scale: .92, y: 18, opacity: 0 }} animate={{ scale: 1, y: 0, opacity: 1 }} exit={{ scale: .95, y: 8, opacity: 0 }}
            transition={{ type: "spring", stiffness: 240, damping: 24 }}>
            <div className="win">
              <span className="win-speaker" style={{ color: offering.retainer.color, borderColor: offering.retainer.color }}>
                {offering.retainer.name} の 献 上 品
              </span>
              <button className="dlg-x" onClick={onClose} aria-label="閉じる">✕</button>
              <div className="win-body dlg-body">
                <div className="dlg-scroll">
                  <div className="item-grid">
                    <div className="item-visual">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img className="item-img" src={offering.item.image} alt="" />
                      <div className="item-by"><Portrait retainer={offering.retainer} /></div>
                    </div>
                    <div className="item-info">
                      <h3 className="item-name">{offering.item.displayName}</h3>
                      <div className="item-price">{offering.item.price.toLocaleString()}<small> 円</small></div>
                      {offering.speech && <p className="item-speech">「{offering.speech}」</p>}
                      <dl className="item-spec">
                        <dt>正式な品名</dt><dd>{offering.item.name}</dd>
                        {offering.item.shop && (<><dt>商い</dt><dd>{offering.item.shop}</dd></>)}
                        {offering.query && (<><dt>探した言葉</dt><dd>{offering.query}</dd></>)}
                      </dl>
                    </div>
                  </div>
                </div>
                <div className="dlg-foot">
                  {offering.item.url
                    ? <a className="btn gold" href={offering.item.url} target="_blank" rel="noreferrer">現物を検分する ↗</a>
                    : <span />}
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
