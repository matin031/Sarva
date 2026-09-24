"use client";

import type { GrammarRolePiece } from "@/lib/grammar-circuit";
import { RoleModule } from "./RoleModule";

export interface RoleTrayProps {
  hostRef?: React.RefObject<HTMLElement | null>;
  pieces: readonly GrammarRolePiece[];
  labelOf: (roleKey: string) => string;
  usedPieceIds: ReadonlySet<string>;
  selectedPieceId: string | null;
  draggingPieceId: string | null;
  disabled: boolean;
  onPointerDown: (event: React.PointerEvent<HTMLElement>, pieceId: string) => void;
  onActivate: (pieceId: string, viaKeyboard: boolean) => void;
}

export default function RoleTray({
  hostRef,
  pieces,
  labelOf,
  usedPieceIds,
  selectedPieceId,
  draggingPieceId,
  disabled,
  onPointerDown,
  onActivate,
}: RoleTrayProps) {
  return (
    <section
      ref={hostRef as React.RefObject<HTMLElement>}
      className="gc-tray"
      style={{ flex: "0 0 auto", minHeight: 0 }}
      aria-label="سینیِ نقش‌ها"
    >
      <div className="gc-tray-inner">
        <div className="gc-tray-items">
          {pieces.map((piece) => (
            <RoleModule
              key={piece.id}
              pieceId={piece.id}
              label={labelOf(piece.roleKey)}
              used={usedPieceIds.has(piece.id)}
              selected={selectedPieceId === piece.id}
              dragging={draggingPieceId === piece.id}
              disabled={disabled}
              onPointerDown={onPointerDown}
              onActivate={onActivate}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
