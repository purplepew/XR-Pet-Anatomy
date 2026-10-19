import React from 'react';
import { X, QrCode, Check, Printer } from 'lucide-react';
import { FLASHCARD_MARKERS, PetSpeciesId } from '../data/anatomyData.ts';
import { matchFiducialMatrix } from '../utils/anatomyState.ts';

interface FlashcardModalProps {
  isOpen: boolean;
  activeSpecies: PetSpeciesId;
  onSelectSpeciesCard: (species: PetSpeciesId) => void;
  onClose: () => void;
}

export const FlashcardModal: React.FC<FlashcardModalProps> = ({
  isOpen,
  activeSpecies,
  onSelectSpeciesCard,
  onClose,
}) => {
  if (!isOpen) return null;

  const speciesList: PetSpeciesId[] = ['dog', 'cat'];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="flashcard-modal-title"
    >
      <div className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-3xl border border-slate-800 bg-slate-950 p-6 text-slate-100 shadow-2xl">
        <div className="flex items-start justify-between gap-4 border-b border-slate-800 pb-4">
          <div>
            <div className="flex items-center gap-2 text-xs text-sky-400">
              <QrCode className="h-4 w-4" aria-hidden="true" />
              <span>Optical Fiducial Target Deck</span>
            </div>
            <h2
              id="flashcard-modal-title"
              className="mt-1 font-display text-2xl font-bold text-white"
            >
              Physical WebAR Flashcard Markers
            </h2>
            <p className="mt-1 text-xs text-slate-400">
              Point your mobile camera at a printed 4×4 binary fiducial card or select a card below to anchor its 3D specimen in the AR viewport.
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close flashcard marker modal"
            className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-xl border border-slate-800 bg-slate-900 text-slate-300 transition-colors hover:border-slate-600 hover:text-white"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="mt-6 grid grid-cols-1 gap-5 md:grid-cols-2">
          {speciesList.map((speciesId) => {
            const spec = FLASHCARD_MARKERS[speciesId];
            const verification = matchFiducialMatrix(spec.fiducialMatrix);
            const isSelected = activeSpecies === speciesId;

            return (
              <div
                key={speciesId}
                className={`flex flex-col justify-between rounded-2xl border p-5 transition-colors ${
                  isSelected
                    ? 'border-sky-500 bg-slate-900/90'
                    : 'border-slate-800 bg-slate-900/40 hover:border-slate-700'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between gap-2 text-xs text-slate-400">
                    <span className="font-mono-tabular font-semibold text-sky-400">
                      {spec.markerCode}
                    </span>
                    <span className="font-mono-tabular">
                      Confidence {(verification.confidence * 100).toFixed(0)}%
                    </span>
                  </div>

                  <h3 className="mt-1 font-display text-xl font-bold text-white">
                    {spec.commonName}
                  </h3>
                  <p className="text-xs italic text-slate-400">{spec.scientificName}</p>

                  {/* Scannable 4x4 Binary Fiducial Matrix Preview */}
                  <div className="my-4 flex items-center gap-4 rounded-xl border border-slate-800 bg-slate-950 p-4">
                    <div
                      className="grid h-28 w-28 shrink-0 grid-cols-4 gap-0.5 border-8 border-slate-950 bg-slate-950 p-1 ring-4 ring-white"
                      aria-label={`${spec.commonName} 4 by 4 fiducial matrix`}
                    >
                      {spec.fiducialMatrix.flatMap((row, rIdx) =>
                        row.map((cell, cIdx) => (
                          <div
                            key={`${rIdx}-${cIdx}`}
                            className={cell === 1 ? 'bg-slate-950' : 'bg-white'}
                          />
                        ))
                      )}
                    </div>

                    <div className="space-y-1.5 text-xs text-slate-300">
                      <p className="leading-snug text-slate-300">{spec.summary}</p>
                      <div className="pt-1 font-mono-tabular text-[11px] text-slate-400">
                        <div>Heart Rate: {spec.restingHeartRateBpm}</div>
                        <div>Respiration: {spec.respiratoryRateBpm}</div>
                        <div>Vertebrae: {spec.vertebralFormula}</div>
                      </div>
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    onSelectSpeciesCard(speciesId);
                    onClose();
                  }}
                  className={`mt-2 flex min-h-[44px] w-full items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-xs font-semibold transition-colors whitespace-nowrap ${
                    isSelected
                      ? 'bg-sky-500 text-slate-950 hover:bg-sky-400'
                      : 'border border-slate-700 bg-slate-800 text-white hover:bg-slate-700'
                  }`}
                >
                  {isSelected ? (
                    <>
                      <Check className="h-4 w-4" />
                      <span>Active Flashcard Anchored</span>
                    </>
                  ) : (
                    <span>Anchor {spec.commonName} Flashcard</span>
                  )}
                </button>
              </div>
            );
          })}
        </div>

        <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-slate-800 pt-4 text-xs text-slate-400">
          <span>
            Optical tracker matches 4×4 binary fiducial grid within ≤ 2 Hamming bit tolerance.
          </span>
          <button
            type="button"
            onClick={() => window.print()}
            className="flex min-h-[40px] items-center gap-2 rounded-xl border border-slate-800 bg-slate-900 px-4 py-2 text-xs font-medium text-slate-200 transition-colors hover:border-slate-700 hover:text-white whitespace-nowrap shrink-0"
          >
            <Printer className="h-4 w-4" />
            <span>Print Flashcards</span>
          </button>
        </div>
      </div>
    </div>
  );
};
