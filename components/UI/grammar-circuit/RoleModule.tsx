"use client";

import { memo } from "react";

/** قطعهٔ نقش.
 *
 *  این کامپوننت *نمی‌داند* پاسخِ درست چیست و نباید بداند؛ فقط برچسبش را نشان
 *  می‌دهد و رویدادِ ورودی را بالا می‌فرستد. */
export interface RoleModuleProps {
  pieceId: string;
  label: string;
  used: boolean;
  selected: boolean;
  dragging: boolean;
  disabled: boolean;
  onPointerDown: (event: React.PointerEvent<HTMLElement>, pieceId: string) => void;
  onActivate: (pieceId: string, viaKeyboard: boolean) => void;
}

function RoleModuleImpl({
  pieceId,
  label,
  used,
  selected,
  dragging,
  disabled,
  onPointerDown,
  onActivate,
}: RoleModuleProps) {
  return (
    <button
      type="button"
      className="gc-module"
      data-piece-id={pieceId}
      data-used={used || undefined}
      data-selected={selected || undefined}
      data-dragging={dragging || undefined}
      disabled={used || disabled}
      aria-pressed={selected}
      aria-label={`قطعهٔ نقشِ ${label}`}
      onPointerDown={(event) => onPointerDown(event, pieceId)}
      onClick={(event) => onActivate(pieceId, event.detail === 0)}
    >
      <span aria-hidden className="gc-module-pin" style={{ insetInlineStart: 10 }} />
      <span aria-hidden className="gc-module-pin" style={{ insetInlineEnd: 10 }} />
      <span className="gc-module-label">{label}</span>
    </button>
  );
}

export const RoleModule = memo(RoleModuleImpl);
