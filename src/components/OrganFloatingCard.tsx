import React from 'react';
import { X, ChevronLeft, ChevronRight, Activity } from 'lucide-react';
import { INTERNAL_ORGANS, OrganInfo, PetSpeciesId } from '../data/anatomyData.ts';
import { clampCalloutPosition } from '../utils/anatomyState.ts';

interface OrganFloatingCardProps {
  organ: OrganInfo;
  speciesId: PetSpeciesId;
  projectedPos: { x: number; y: number } | null;
  viewportSize: { width: number; height: number };
  onClose: () => void;
  onSelectOrgan: (organId: string) => void;
}

export const OrganFloatingCard: React.FC<OrganFloatingCardProps> = ({
  organ,
  speciesId,
  projectedPos,
  viewportSize,
  onClose,
  onSelectOrgan,
}) => {
  const currentIndex = INTERNAL_ORGANS.findIndex((o) => o.id === organ.id);
  const prevOrgan =
    INTERNAL_ORGANS[(currentIndex - 1 + INTERNAL_ORGANS.length) % INTERNAL_ORGANS.length];
  const nextOrgan = INTERNAL_ORGANS[(currentIndex + 1) % INTERNAL_ORGANS.length];

  const isMobile = viewportSize.width < 640;
  const cardWidth = isMobile ? Math.min(358, viewportSize.width - 24) : 348;
  const cardHeight = isMobile ? 195 : 230;

  const fallbackAnchorX = Math.round(viewportSize.width * 0.5);
  const fallbackAnchorY = Math.round(viewportSize.height * 0.36);

  const rawX = projectedPos ? projectedPos.x : fallbackAnchorX;
  const rawY = projectedPos ? projectedPos.y : fallbackAnchorY;

  const { cardX, cardY, anchorX, anchorY } = clampCalloutPosition(
    rawX,
    rawY,
    viewportSize.width,
    viewportSize.height,
    cardWidth,
    cardHeight
  );

  // Leader line attachment point on the floating card
  const cardAttachX = isMobile
    ? Math.max(cardX + 24, Math.min(cardX + cardWidth - 24, anchorX))
    : anchorX < cardX + cardWidth * 0.5
      ? cardX + 16
      : cardX + cardWidth - 16;
  const cardAttachY =
    anchorY < cardY
      ? cardY + 12
      : anchorY > cardY + cardHeight
        ? cardY + cardHeight - 8
        : anchorY;

  return (
    <div
      className="pointer-events-none fixed inset-0 z-20 overflow-hidden"
      aria-live="polite"
    >
      {/* SVG Spatial Leader Line & Organ Target Pin */}
      <svg
        className="pointer-events-none absolute inset-0 h-full w-full"
        aria-hidden="true"
      >
        <line
          x1={anchorX}
          y1={anchorY}
          x2={cardAttachX}
          y2={cardAttachY}
          stroke={organ.highlightHex}
          strokeWidth="2"
          strokeDasharray="5 4"
        />
        <circle
          cx={anchorX}
          cy={anchorY}
          r="11"
          fill="none"
          stroke={organ.highlightHex}
          strokeWidth="2"
        />
        <circle cx={anchorX} cy={anchorY} r="4" fill={organ.highlightHex} />
      </svg>

      {/* Floating Organ Bio-Card */}
      <aside
        role="dialog"
        aria-label={`${organ.name} biological function card`}
        data-testid="organ-floating-card"
        style={{
          width: `${cardWidth}px`,
          transform: `translate3d(${cardX}px, ${cardY}px, 0)`,
        }}
        className="pointer-events-auto absolute top-0 left-0 rounded-2xl border border-slate-700/90 bg-slate-950/95 p-3 sm:p-4 text-slate-100 shadow-2xl transition-transform duration-150 ease-out"
      >
        {/* Header Row: Organ Name, Latin Nomenclature & Dismiss Button */}
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 text-[11px] text-slate-400 truncate">
              <span
                className="inline-block h-2 w-2 shrink-0 rounded-xs"
                style={{ backgroundColor: organ.highlightHex }}
                aria-hidden="true"
              />
              <span className="truncate">{organ.system}</span>
              <span aria-hidden="true">·</span>
              <span className="italic text-slate-300 shrink-0">{organ.latinName}</span>
            </div>
            <h2 className="mt-0.5 font-display text-lg sm:text-xl font-bold tracking-tight text-white">
              {organ.name}
            </h2>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close organ details"
            className="flex min-h-[36px] min-w-[36px] shrink-0 items-center justify-center rounded-xl border border-slate-800 bg-slate-900 text-slate-300 transition-colors hover:border-slate-600 hover:text-white focus-visible:outline-2 focus-visible:outline-sky-400"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Biological Function */}
        <p className="mt-1.5 text-xs leading-snug text-slate-200 line-clamp-3 sm:line-clamp-none">
          {organ.biologicalFunction}
        </p>

        {/* Species-Specific Clinical & Physiological Readout */}
        <div className="mt-2 border-t border-slate-800/90 pt-2">
          <div className="flex items-center justify-between gap-2 text-xs">
            <span className="flex items-center gap-1.5 font-medium text-sky-400">
              <Activity className="h-3.5 w-3.5" aria-hidden="true" />
              <span>{speciesId === 'dog' ? 'Canine Physiology' : 'Feline Physiology'}</span>
            </span>
            <span className="font-mono-tabular text-[11px] text-slate-300">
              {organ.vitalMetrics[speciesId]}
            </span>
          </div>
          <p className="hidden sm:block mt-1 text-[11px] leading-snug text-slate-400">
            {organ.clinicalNotes[speciesId]}
          </p>
        </div>

        {/* Footer: Cycle Previous / Next Organ */}
        <div className="mt-2 flex items-center justify-between gap-2 border-t border-slate-800/90 pt-2">
          <button
            type="button"
            onClick={() => onSelectOrgan(prevOrgan.id)}
            aria-label={`Inspect previous organ: ${prevOrgan.name}`}
            className="flex min-h-[36px] items-center gap-1.5 rounded-lg border border-slate-800 bg-slate-900 px-2.5 py-1 text-xs font-medium text-slate-200 transition-colors hover:border-slate-600 hover:bg-slate-800 whitespace-nowrap shrink-0"
          >
            <ChevronLeft className="h-3.5 w-3.5" />
            <span>{prevOrgan.name}</span>
          </button>

          <span className="font-mono-tabular text-[11px] text-slate-400">
            {currentIndex + 1} / {INTERNAL_ORGANS.length}
          </span>

          <button
            type="button"
            onClick={() => onSelectOrgan(nextOrgan.id)}
            aria-label={`Inspect next organ: ${nextOrgan.name}`}
            className="flex min-h-[36px] items-center gap-1.5 rounded-lg border border-slate-800 bg-slate-900 px-2.5 py-1 text-xs font-medium text-slate-200 transition-colors hover:border-slate-600 hover:bg-slate-800 whitespace-nowrap shrink-0"
          >
            <span>{nextOrgan.name}</span>
            <ChevronRight className="h-3.5 w-3.5" />
          </button>
        </div>
      </aside>
    </div>
  );
};
