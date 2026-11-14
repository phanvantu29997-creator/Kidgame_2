import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import confetti from 'canvas-confetti';
import {
  Check,
  ChevronLeft,
  ChevronRight,
  Eye,
  EyeOff,
  Grid,
  Puzzle,
  RotateCcw,
  Sparkles,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { JigsawPieceSvg } from './components/JigsawPieceSvg';
import { PUZZLE_LEVELS } from './data/levels';
import { BOARD_SIZE, generateJigsawPieces, PuzzlePieceDef } from './utils/jigsaw';
import {
  playCongratsVoice,
  playPickupSound,
  playSnapSound,
  playWrongPieceVoice,
  preloadTeacherVoices,
} from './utils/sound';

interface DragState {
  piece: PuzzlePieceDef;
  startX: number;
  startY: number;
  currentX: number;
  currentY: number;
  relX: number;
  relY: number;
  hasMoved: boolean;
  renderWidth: number;
  renderHeight: number;
}

type ViewMode = 'PLAY' | 'GALLERY';

function shufflePieces(pieces: PuzzlePieceDef[]): PuzzlePieceDef[] {
  const arr = [...pieces];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  if (arr.length === 2 && arr[0].id === pieces[0].id) {
    return [arr[1], arr[0]];
  }
  return arr;
}

export function App() {
  const [viewMode, setViewMode] = useState<ViewMode>('PLAY');
  const [currentLevelIdx, setCurrentLevelIdx] = useState(0);
  const currentLevel = PUZZLE_LEVELS[currentLevelIdx];

  const basePieces = useMemo(
    () => generateJigsawPieces(currentLevel.cols, currentLevel.rows),
    [currentLevel.cols, currentLevel.rows],
  );

  const [trayOrder, setTrayOrder] = useState<string[]>(() =>
    shufflePieces(basePieces).map((p) => p.id),
  );
  const [placedIds, setPlacedIds] = useState<string[]>([]);
  const [completedLevels, setCompletedLevels] = useState<number[]>([]);
  const [selectedPieceId, setSelectedPieceId] = useState<string | null>(null);
  const [dragState, setDragState] = useState<DragState | null>(null);
  const [hoveredSnapSlotId, setHoveredSnapSlotId] = useState<string | null>(null);
  const [justPlacedId, setJustPlacedId] = useState<string | null>(null);
  const [wiggleSlotId, setWiggleSlotId] = useState<string | null>(null);
  const [feedbackText, setFeedbackText] = useState<string | null>(null);
  const [showHint, setShowHint] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [imageFailed, setImageFailed] = useState(false);

  const boardRef = useRef<HTMLDivElement | null>(null);

  const isComplete = placedIds.length === basePieces.length;

  useEffect(() => {
    preloadTeacherVoices();
  }, []);

  const pieceMap = useMemo(() => {
    const map = new Map<string, PuzzlePieceDef>();
    basePieces.forEach((p) => map.set(p.id, p));
    return map;
  }, [basePieces]);

  const unplacedPieces = useMemo(
    () =>
      trayOrder
        .filter((id) => !placedIds.includes(id))
        .map((id) => pieceMap.get(id))
        .filter((p): p is PuzzlePieceDef => Boolean(p)),
    [trayOrder, placedIds, pieceMap],
  );

  const resetLevel = useCallback((levelIdx: number) => {
    const lvl = PUZZLE_LEVELS[levelIdx];
    const nextBase = generateJigsawPieces(lvl.cols, lvl.rows);
    setViewMode('PLAY');
    setCurrentLevelIdx(levelIdx);
    setTrayOrder(shufflePieces(nextBase).map((p) => p.id));
    setPlacedIds([]);
    setSelectedPieceId(null);
    setDragState(null);
    setHoveredSnapSlotId(null);
    setJustPlacedId(null);
    setWiggleSlotId(null);
    setFeedbackText(null);
    setImageFailed(false);
  }, []);

  const triggerCelebration = useCallback(
    (levelId: number) => {
      playCongratsVoice(soundEnabled);
      setCompletedLevels((prev) =>
        prev.includes(levelId) ? prev : [...prev, levelId],
      );

      const prefersReduced =
        typeof window !== 'undefined' &&
        window.matchMedia('(prefers-reduced-motion: reduce)').matches;

      if (!prefersReduced) {
        confetti({
          particleCount: 80,
          spread: 72,
          origin: { y: 0.6 },
          colors: ['#EA580C', '#F59E0B', '#16A34A', '#38BDF8', '#F472B6'],
        });
      }
    },
    [soundEnabled],
  );

  const placePiece = useCallback(
    (pieceId: string) => {
      setPlacedIds((prev) => {
        if (prev.includes(pieceId)) return prev;
        const next = [...prev, pieceId];
        setJustPlacedId(pieceId);
        setSelectedPieceId(null);
        setFeedbackText(null);

        if (next.length === basePieces.length) {
          setTimeout(() => triggerCelebration(currentLevel.id), 140);
        } else {
          playSnapSound(soundEnabled);
        }
        return next;
      });
    },
    [basePieces.length, currentLevel.id, soundEnabled, triggerCelebration],
  );

  useEffect(() => {
    if (!justPlacedId) return;
    const timer = window.setTimeout(() => setJustPlacedId(null), 650);
    return () => window.clearTimeout(timer);
  }, [justPlacedId]);

  useEffect(() => {
    if (!wiggleSlotId) return;
    const timer = window.setTimeout(() => setWiggleSlotId(null), 350);
    return () => window.clearTimeout(timer);
  }, [wiggleSlotId]);

  const checkSnapEligibility = useCallback(
    (
      piece: PuzzlePieceDef,
      clientX: number,
      clientY: number,
      dragLeft: number,
      dragTop: number,
    ) => {
      const boardEl = boardRef.current;
      if (!boardEl) return false;

      const rect = boardEl.getBoundingClientRect();
      const scale = rect.width / BOARD_SIZE;

      const targetLeft = rect.left + piece.bbox.x * scale;
      const targetTop = rect.top + piece.bbox.y * scale;
      const dist = Math.hypot(dragLeft - targetLeft, dragTop - targetTop);

      const threshold = rect.width * 0.24;
      if (dist <= threshold) return true;

      const cellW = (BOARD_SIZE / currentLevel.cols) * scale;
      const cellH = (BOARD_SIZE / currentLevel.rows) * scale;
      const cellLeft = rect.left + piece.col * cellW;
      const cellTop = rect.top + piece.row * cellH;
      const pad = 18;
      if (
        clientX >= cellLeft - pad &&
        clientX <= cellLeft + cellW + pad &&
        clientY >= cellTop - pad &&
        clientY <= cellTop + cellH + pad
      ) {
        return true;
      }

      return false;
    },
    [currentLevel.cols, currentLevel.rows],
  );

  const findHoveredBoardSlot = useCallback(
    (clientX: number, clientY: number): PuzzlePieceDef | null => {
      const boardEl = boardRef.current;
      if (!boardEl) return null;

      const rect = boardEl.getBoundingClientRect();
      if (
        clientX < rect.left ||
        clientX > rect.right ||
        clientY < rect.top ||
        clientY > rect.bottom
      ) {
        return null;
      }

      const relX = ((clientX - rect.left) / rect.width) * BOARD_SIZE;
      const relY = ((clientY - rect.top) / rect.height) * BOARD_SIZE;

      const col = Math.min(
        currentLevel.cols - 1,
        Math.max(0, Math.floor(relX / (BOARD_SIZE / currentLevel.cols))),
      );
      const row = Math.min(
        currentLevel.rows - 1,
        Math.max(0, Math.floor(relY / (BOARD_SIZE / currentLevel.rows))),
      );

      return basePieces.find((p) => p.col === col && p.row === row) || null;
    },
    [basePieces, currentLevel.cols, currentLevel.rows],
  );

  const handlePiecePointerDown = (
    e: React.PointerEvent<HTMLButtonElement>,
    piece: PuzzlePieceDef,
  ) => {
    if (isComplete || placedIds.includes(piece.id)) return;
    e.preventDefault();

    const boardEl = boardRef.current;
    const scale = boardEl ? boardEl.getBoundingClientRect().width / BOARD_SIZE : 1;
    const renderWidth = piece.bbox.width * scale;
    const renderHeight = piece.bbox.height * scale;

    const btnRect = e.currentTarget.getBoundingClientRect();
    const relX = Math.max(
      0.1,
      Math.min(0.9, (e.clientX - btnRect.left) / btnRect.width),
    );
    const relY = Math.max(
      0.1,
      Math.min(0.9, (e.clientY - btnRect.top) / btnRect.height),
    );

    playPickupSound(soundEnabled);
    setFeedbackText(null);

    setDragState({
      piece,
      startX: e.clientX,
      startY: e.clientY,
      currentX: e.clientX,
      currentY: e.clientY,
      relX,
      relY,
      hasMoved: false,
      renderWidth,
      renderHeight,
    });
  };

  useEffect(() => {
    if (!dragState) return;

    const handlePointerMove = (e: PointerEvent) => {
      const movedDist = Math.hypot(
        e.clientX - dragState.startX,
        e.clientY - dragState.startY,
      );
      const hasMoved = dragState.hasMoved || movedDist > 8;

      const dragLeft = e.clientX - dragState.relX * dragState.renderWidth;
      const dragTop = e.clientY - dragState.relY * dragState.renderHeight;

      const canSnap = hasMoved
        ? checkSnapEligibility(
            dragState.piece,
            e.clientX,
            e.clientY,
            dragLeft,
            dragTop,
          )
        : false;

      setHoveredSnapSlotId(canSnap ? dragState.piece.id : null);
      setDragState((prev) =>
        prev
          ? {
              ...prev,
              currentX: e.clientX,
              currentY: e.clientY,
              hasMoved,
            }
          : null,
      );
    };

    const handlePointerUp = (e: PointerEvent) => {
      const movedDist = Math.hypot(
        e.clientX - dragState.startX,
        e.clientY - dragState.startY,
      );
      const hasMoved = dragState.hasMoved || movedDist > 8;

      if (!hasMoved) {
        setSelectedPieceId((prev) =>
          prev === dragState.piece.id ? null : dragState.piece.id,
        );
      } else {
        const dragLeft = e.clientX - dragState.relX * dragState.renderWidth;
        const dragTop = e.clientY - dragState.relY * dragState.renderHeight;
        if (
          checkSnapEligibility(
            dragState.piece,
            e.clientX,
            e.clientY,
            dragLeft,
            dragTop,
          )
        ) {
          placePiece(dragState.piece.id);
        } else {
          const hoveredSlot = findHoveredBoardSlot(e.clientX, e.clientY);
          if (hoveredSlot) {
            playWrongPieceVoice(soundEnabled);
            setWiggleSlotId(hoveredSlot.id);
            setFeedbackText(
              'Chưa đúng rồi bé ơi! Bé thử đặt sang vị trí khác nhé.',
            );
          }
        }
      }

      setHoveredSnapSlotId(null);
      setDragState(null);
    };

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);
    window.addEventListener('pointercancel', handlePointerUp);

    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
      window.removeEventListener('pointercancel', handlePointerUp);
    };
  }, [
    dragState,
    checkSnapEligibility,
    findHoveredBoardSlot,
    placePiece,
    soundEnabled,
  ]);

  const handleBoardSlotClick = (slotPiece: PuzzlePieceDef) => {
    if (isComplete || placedIds.includes(slotPiece.id)) return;
    if (!selectedPieceId) {
      setFeedbackText(
        'Bé hãy chọn hoặc kéo một mảnh ghép vào ô này nhé!',
      );
      return;
    }

    if (selectedPieceId === slotPiece.id) {
      placePiece(slotPiece.id);
    } else {
      playWrongPieceVoice(soundEnabled);
      setWiggleSlotId(slotPiece.id);
      setFeedbackText(
        'Chưa đúng rồi bé ơi! Bé thử chạm vào ô khác nhé.',
      );
    }
  };

  const hasPrevLevel = currentLevelIdx > 0;
  const hasNextLevel = currentLevelIdx < PUZZLE_LEVELS.length - 1;

  const mobileTrayCols =
    currentLevel.pieceCount === 2
      ? 'grid-cols-2'
      : currentLevel.pieceCount === 3
        ? 'grid-cols-3'
        : currentLevel.pieceCount === 4
          ? 'grid-cols-2'
          : 'grid-cols-3';

  return (
    <div className="w-[100vw] h-[100dvh] flex flex-col overflow-hidden bg-[#F6F3EA] text-[#2D2A26] touch-none-drag">
      <img
        src={currentLevel.imageUrl}
        alt=""
        referrerPolicy="no-referrer"
        onLoad={() => setImageFailed(false)}
        onError={() => setImageFailed(true)}
        className="sr-only"
      />

      {/* Safe-Area Top Header (notch / Dynamic Island compatible) */}
      <header className="pt-safe bg-white/95 backdrop-blur-sm border-b border-[#E5DEC9] shrink-0 z-30">
        <div className="max-w-[1180px] mx-auto px-safe py-2 sm:py-3 flex items-center justify-between gap-2 sm:gap-8">
          {/* Zone 1: Brand Title */}
          <button
            type="button"
            onClick={() => setViewMode('PLAY')}
            className="flex items-center gap-2 whitespace-nowrap shrink-0 cursor-pointer min-h-[44px] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#EA580C]"
          >
            <span className="inline-flex items-center justify-center w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-[#EA580C] text-white shadow-sm">
              <Puzzle className="w-4 h-4 sm:w-5 sm:h-5" />
            </span>
            <span className="font-display text-base sm:text-xl font-bold tracking-tight text-[#2D2A26]">
              Bé Ghép Tranh
            </span>
          </button>

          {/* Zone 2: Concise Navigation Controls */}
          <nav
            aria-label="Điều hướng trò chơi"
            className="flex items-center gap-3 sm:gap-7 text-xs sm:text-sm font-semibold text-[#5C554C]"
          >
            <button
              type="button"
              onClick={() => setViewMode('PLAY')}
              className={`min-h-[44px] px-1.5 flex items-center whitespace-nowrap shrink-0 cursor-pointer transition-colors border-b-2 ${
                viewMode === 'PLAY'
                  ? 'text-[#EA580C] border-[#EA580C]'
                  : 'border-transparent hover:text-[#2D2A26]'
              }`}
            >
              Đang chơi
            </button>
            <button
              type="button"
              onClick={() => setViewMode('GALLERY')}
              className={`min-h-[44px] px-1.5 inline-flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer transition-colors border-b-2 ${
                viewMode === 'GALLERY'
                  ? 'text-[#EA580C] border-[#EA580C]'
                  : 'border-transparent hover:text-[#2D2A26]'
              }`}
            >
              <Grid className="w-4 h-4" />
              <span>10 màn</span>
            </button>
          </nav>

          {/* Zone 3: 1 Primary Action */}
          <div className="shrink-0">
            <button
              type="button"
              onClick={() => resetLevel(currentLevelIdx)}
              className="inline-flex items-center justify-center gap-1.5 min-h-[44px] px-3 sm:px-4 py-2 rounded-xl bg-[#EA580C] hover:bg-[#C2410C] active:scale-[0.98] text-white text-xs sm:text-sm font-semibold transition-all shadow-sm whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#EA580C]"
            >
              <RotateCcw className="w-4 h-4" />
              <span>Chơi lại</span>
            </button>
          </div>
        </div>
      </header>

      {viewMode === 'GALLERY' ? (
        /* All 10 Levels Selection Gallery (scroll-enabled safely within 100dvh) */
        <main className="flex-1 min-h-0 w-full max-w-[1180px] mx-auto px-safe pb-safe py-4 sm:py-6 overflow-y-auto touch-pan-y-scroll">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-2 mb-4 sm:mb-6">
            <div>
              <h1 className="font-display text-xl sm:text-3xl font-bold text-[#2D2A26] tracking-tight text-balance">
                Chọn màn chơi cho bé
              </h1>
              <p className="mt-0.5 text-xs sm:text-sm text-[#665F55] tabular-nums">
                10 bức tranh con vật đáng yêu · Đã hoàn thành {completedLevels.length}/10 màn
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4 pb-6">
            {PUZZLE_LEVELS.map((lvl, idx) => {
              const isSolved = completedLevels.includes(lvl.id);
              const isCurrent = idx === currentLevelIdx;

              return (
                <button
                  key={lvl.id}
                  type="button"
                  onClick={() => resetLevel(idx)}
                  className={`group text-left bg-white rounded-2xl border p-2.5 sm:p-3 transition-all cursor-pointer hover:shadow-md focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#EA580C] ${
                    isCurrent
                      ? 'border-[#EA580C] shadow-sm'
                      : 'border-[#E5DEC9] hover:border-[#C8AA7A]'
                  }`}
                >
                  <div className="aspect-square w-full rounded-xl overflow-hidden bg-[#FAF8F2] mb-2 relative">
                    <img
                      src={lvl.imageUrl}
                      alt={lvl.animalName}
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover transition-transform duration-200 group-hover:scale-[1.04]"
                    />
                  </div>
                  <div className="flex items-center justify-between gap-1.5">
                    <span className="font-display text-sm sm:text-base font-bold text-[#2D2A26] truncate">
                      {lvl.shortTitle}: {lvl.title}
                    </span>
                    {isSolved && (
                      <Check
                        className="w-4 h-4 text-[#15803D] shrink-0"
                        aria-label="Đã hoàn thành"
                      />
                    )}
                  </div>
                  <div className="mt-0.5 text-xs text-[#665F55] tabular-nums">
                    {lvl.pieceCount} mảnh ghép
                  </div>
                </button>
              );
            })}
          </div>
        </main>
      ) : (
        /* Full-Screen Portrait iPhone (9:19.5) + Desktop Play Workspace */
        <main className="flex-1 min-h-0 w-full max-w-[1180px] mx-auto px-safe pb-safe py-2 sm:py-5 flex flex-col gap-2 sm:gap-4 overflow-hidden lg:overflow-y-auto">
          {/* Desktop Level Quick-Jump Strip (hidden on narrow portrait mobile to preserve 100dvh canvas) */}
          <div className="hidden sm:flex items-center gap-2 overflow-x-auto pb-1 shrink-0 touch-pan-x-scroll">
            <button
              type="button"
              onClick={() => hasPrevLevel && resetLevel(currentLevelIdx - 1)}
              disabled={!hasPrevLevel}
              aria-label="Màn trước"
              className="inline-flex items-center justify-center w-10 h-10 rounded-xl bg-white border border-[#E5DEC9] text-[#4A443B] disabled:opacity-40 disabled:cursor-not-allowed hover:bg-[#FAF7F0] shrink-0 cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-1 p-1 bg-[#EDE6D6] rounded-xl overflow-x-auto touch-pan-x-scroll">
              {PUZZLE_LEVELS.map((lvl, idx) => {
                const isActive = idx === currentLevelIdx;
                const isSolved = completedLevels.includes(lvl.id);
                return (
                  <button
                    key={lvl.id}
                    type="button"
                    onClick={() => resetLevel(idx)}
                    title={`${lvl.shortTitle}: ${lvl.title} (${lvl.pieceCount} mảnh)`}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#EA580C] ${
                      isActive
                        ? 'bg-white text-[#2D2A26] shadow-sm'
                        : 'text-[#665F55] hover:text-[#2D2A26]'
                    }`}
                  >
                    <span>{lvl.shortTitle}</span>
                    {isSolved && (
                      <Check
                        className="w-3.5 h-3.5 text-[#15803D]"
                        aria-label="Đã hoàn thành"
                      />
                    )}
                  </button>
                );
              })}
            </div>

            <button
              type="button"
              onClick={() => hasNextLevel && resetLevel(currentLevelIdx + 1)}
              disabled={!hasNextLevel}
              aria-label="Màn tiếp theo"
              className="inline-flex items-center justify-center w-10 h-10 rounded-xl bg-white border border-[#E5DEC9] text-[#4A443B] disabled:opacity-40 disabled:cursor-not-allowed hover:bg-[#FAF7F0] shrink-0 cursor-pointer"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* Level Title & Compact Controls Row */}
          <div className="flex items-center justify-between gap-2 shrink-0">
            <div className="flex items-center gap-1.5 min-w-0">
              {/* Mobile Prev/Next arrows inline with title */}
              <button
                type="button"
                onClick={() => hasPrevLevel && resetLevel(currentLevelIdx - 1)}
                disabled={!hasPrevLevel}
                aria-label="Màn trước"
                className="sm:hidden inline-flex items-center justify-center w-10 h-10 rounded-xl bg-white border border-[#E5DEC9] text-[#4A443B] disabled:opacity-35 shrink-0 cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              <div className="min-w-0">
                <h1 className="font-display text-base sm:text-2xl lg:text-3xl font-bold text-[#2D2A26] tracking-tight truncate">
                  {currentLevel.shortTitle}: {currentLevel.title}
                </h1>
                <div className="flex items-center gap-1.5 text-xs sm:text-sm text-[#665F55] tabular-nums truncate">
                  <span>{currentLevel.pieceCount} mảnh</span>
                  <span aria-hidden="true">·</span>
                  <span>
                    Đã ghép {placedIds.length}/{currentLevel.pieceCount}
                  </span>
                  <span className="hidden md:inline" aria-hidden="true">
                    ·
                  </span>
                  <span className="hidden md:inline truncate">
                    {currentLevel.instruction}
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => hasNextLevel && resetLevel(currentLevelIdx + 1)}
                disabled={!hasNextLevel}
                aria-label="Màn tiếp theo"
                className="sm:hidden inline-flex items-center justify-center w-10 h-10 rounded-xl bg-white border border-[#E5DEC9] text-[#4A443B] disabled:opacity-35 shrink-0 cursor-pointer"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            {/* Utility Controls (44px+ touch targets) */}
            <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">
              <button
                type="button"
                onClick={() => setShowHint((prev) => !prev)}
                aria-pressed={showHint}
                aria-label={showHint ? 'Ẩn gợi ý' : 'Xem mẫu rõ hơn'}
                className={`inline-flex items-center justify-center gap-1.5 min-h-[44px] min-w-[44px] px-2.5 sm:px-3.5 py-2 rounded-xl border text-xs sm:text-sm font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#EA580C] ${
                  showHint
                    ? 'bg-[#FEF3C7] border-[#F59E0B] text-[#92400E]'
                    : 'bg-white border-[#DDD5C1] text-[#4A443B] hover:bg-[#FAF7F0]'
                }`}
              >
                {showHint ? (
                  <EyeOff className="w-4 h-4" />
                ) : (
                  <Eye className="w-4 h-4" />
                )}
                <span className="hidden sm:inline">
                  {showHint ? 'Ẩn gợi ý' : 'Xem mẫu rõ hơn'}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setSoundEnabled((prev) => !prev)}
                aria-pressed={soundEnabled}
                aria-label={soundEnabled ? 'Tắt âm thanh' : 'Bật âm thanh'}
                className="inline-flex items-center justify-center gap-1.5 min-h-[44px] min-w-[44px] px-2.5 sm:px-3.5 py-2 rounded-xl bg-white border border-[#DDD5C1] text-[#4A443B] hover:bg-[#FAF7F0] text-xs sm:text-sm font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#EA580C]"
              >
                {soundEnabled ? (
                  <Volume2 className="w-4 h-4 text-[#15803D]" />
                ) : (
                  <VolumeX className="w-4 h-4 text-[#8C8376]" />
                )}
                <span className="hidden sm:inline">
                  {soundEnabled ? 'Âm thanh: Bật' : 'Âm thanh: Tắt'}
                </span>
              </button>
            </div>
          </div>

          {/* 2-Region Play Arena: Top/Left Board + Bottom/Right Tray */}
          <div className="flex-1 min-h-0 flex flex-col lg:grid lg:grid-cols-[1.1fr_0.9fr] gap-2.5 sm:gap-6 items-stretch">
            {/* Wooden Puzzle Frame */}
            <section
              aria-label="Bảng ghép hình"
              className="bg-[#E8D5B5] border-2 border-[#C8AA7A] rounded-2xl sm:rounded-3xl p-2.5 sm:p-5 shadow-md flex flex-col items-center justify-center shrink-0 lg:shrink"
            >
              <div
                ref={boardRef}
                className="relative w-[min(80vw,38dvh)] sm:w-[min(65vw,44dvh)] lg:w-full lg:max-w-[460px] aspect-square rounded-xl sm:rounded-2xl overflow-hidden bg-[#FDFBF5] shadow-inner border-2 border-[#C8AA7A]/70 select-none"
              >
                {!imageFailed ? (
                  <img
                    src={currentLevel.imageUrl}
                    alt={`Hình gợi ý ${currentLevel.animalName}`}
                    referrerPolicy="no-referrer"
                    draggable={false}
                    className="absolute inset-0 w-full h-full object-cover pointer-events-none transition-opacity duration-300"
                    style={{ opacity: isComplete ? 1 : showHint ? 0.68 : 0.22 }}
                  />
                ) : (
                  <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#FEF3C7] text-[#92400E] p-4 text-center">
                    <Puzzle className="w-10 h-10 mb-2 opacity-70" />
                    <span className="font-display font-bold text-base sm:text-lg">
                      {currentLevel.animalName}
                    </span>
                  </div>
                )}

                <svg
                  viewBox={`0 0 ${BOARD_SIZE} ${BOARD_SIZE}`}
                  className="absolute inset-0 w-full h-full"
                >
                  {basePieces.map((piece) => {
                    const isPlaced = placedIds.includes(piece.id);
                    if (isPlaced) return null;

                    const isSnapHovered = hoveredSnapSlotId === piece.id;
                    const isWiggling = wiggleSlotId === piece.id;

                    return (
                      <g
                        key={`slot-${piece.id}`}
                        onClick={() => handleBoardSlotClick(piece)}
                        className={`cursor-pointer ${isWiggling ? 'animate-wiggle' : ''}`}
                        style={{
                          transformOrigin: `${piece.center.x}px ${piece.center.y}px`,
                        }}
                      >
                        <path
                          d={piece.path}
                          fill={
                            isWiggling
                              ? 'rgba(234, 88, 12, 0.16)'
                              : isSnapHovered
                                ? 'rgba(22, 163, 74, 0.22)'
                                : selectedPieceId
                                  ? 'rgba(234, 88, 12, 0.08)'
                                  : 'rgba(255, 255, 255, 0.25)'
                          }
                          stroke={
                            isWiggling
                              ? '#DC2626'
                              : isSnapHovered
                                ? '#16A34A'
                                : selectedPieceId
                                  ? '#EA580C'
                                  : '#8A7961'
                          }
                          strokeWidth={isSnapHovered || isWiggling ? 5 : 3}
                          strokeDasharray={isSnapHovered ? undefined : '8 6'}
                          strokeLinejoin="round"
                        />
                      </g>
                    );
                  })}

                  {basePieces.map((piece) => {
                    const isPlaced = placedIds.includes(piece.id);
                    if (!isPlaced) return null;

                    const isJustPlaced = justPlacedId === piece.id;

                    return (
                      <g
                        key={`placed-${piece.id}`}
                        className={isJustPlaced ? 'animate-pop-in' : ''}
                        style={{
                          transformOrigin: `${piece.center.x}px ${piece.center.y}px`,
                        }}
                      >
                        <defs>
                          <clipPath
                            id={`board-clip-${currentLevel.id}-${piece.id}`}
                          >
                            <path d={piece.path} />
                          </clipPath>
                        </defs>

                        <g
                          clipPath={`url(#board-clip-${currentLevel.id}-${piece.id})`}
                        >
                          {!imageFailed && (
                            <image
                              href={currentLevel.imageUrl}
                              x={0}
                              y={0}
                              width={BOARD_SIZE}
                              height={BOARD_SIZE}
                              preserveAspectRatio="xMidYMid slice"
                            />
                          )}
                        </g>

                        <path
                          d={piece.path}
                          fill="none"
                          stroke="rgba(255, 255, 255, 0.7)"
                          strokeWidth={2.5}
                          strokeLinejoin="round"
                          className={`transition-opacity duration-500 ${
                            isComplete ? 'opacity-0' : 'opacity-100'
                          }`}
                        />

                        {isJustPlaced && (
                          <g
                            transform={`translate(${piece.center.x}, ${piece.center.y})`}
                            className="pointer-events-none"
                          >
                            <circle
                              r={26}
                              fill="none"
                              stroke="#F59E0B"
                              strokeWidth={4}
                              className="animate-sparkle"
                            />
                          </g>
                        )}
                      </g>
                    );
                  })}
                </svg>
              </div>

              <div className="w-[min(80vw,38dvh)] sm:w-[min(65vw,44dvh)] lg:w-full lg:max-w-[460px] mt-2 sm:mt-4">
                <div className="h-2 sm:h-3 w-full bg-[#D7C19C] rounded-full overflow-hidden">
                  <div
                    className="h-full bg-[#16A34A] transition-all duration-300 rounded-full"
                    style={{
                      width: `${(placedIds.length / currentLevel.pieceCount) * 100}%`,
                    }}
                  />
                </div>
              </div>
            </section>

            {/* Bottom/Right: Piece Tray OR Level Complete Celebration */}
            <section
              aria-label={isComplete ? 'Chúc mừng hoàn thành' : 'Khay mảnh ghép'}
              className="flex-1 min-h-0 bg-white border border-[#E5DEC9] rounded-2xl sm:rounded-3xl p-3 sm:p-6 shadow-sm flex flex-col justify-between gap-2 sm:gap-5 overflow-hidden"
            >
              {!isComplete ? (
                <>
                  <div className="shrink-0">
                    <div className="flex items-center justify-between gap-2">
                      <h2 className="font-display text-sm sm:text-xl font-bold text-[#2D2A26]">
                        Mảnh ghép của bé
                      </h2>
                      <span className="text-xs sm:text-sm font-medium text-[#665F55] tabular-nums">
                        Còn {unplacedPieces.length} mảnh
                      </span>
                    </div>
                    <p
                      className={`mt-0.5 sm:mt-1.5 text-xs sm:text-sm leading-snug sm:leading-relaxed line-clamp-2 ${
                        feedbackText
                          ? 'text-[#B45309] font-semibold'
                          : 'text-[#5C554C]'
                      }`}
                    >
                      {feedbackText
                        ? feedbackText
                        : selectedPieceId
                          ? 'Bé chạm vào ô nét đứt trên bảng để ghép mảnh vừa chọn!'
                          : 'Kéo mảnh lên bảng hoặc chạm chọn mảnh rồi chạm vào ô trống.'}
                    </p>
                  </div>

                  {/* Responsive Touch-Friendly Pieces Grid */}
                  <div
                    className={`flex-1 min-h-0 grid gap-2 sm:gap-4 place-items-center ${mobileTrayCols} ${
                      currentLevel.pieceCount <= 4
                        ? 'lg:grid-cols-2'
                        : 'lg:grid-cols-3'
                    }`}
                  >
                    {unplacedPieces.map((piece, idx) => {
                      const isDraggingThis =
                        dragState?.hasMoved && dragState.piece.id === piece.id;
                      const isSelected = selectedPieceId === piece.id;
                      const aspectRatio = piece.bbox.width / piece.bbox.height;

                      return (
                        <button
                          key={piece.id}
                          type="button"
                          onPointerDown={(e) => handlePiecePointerDown(e, piece)}
                          aria-label={`Mảnh ghép số ${idx + 1} của ${currentLevel.animalName}`}
                          className={`touch-none-drag group relative w-full h-full min-h-[72px] sm:min-h-[130px] flex items-center justify-center p-1.5 sm:p-3 rounded-xl sm:rounded-2xl border-2 transition-all cursor-grab active:cursor-grabbing focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#EA580C] ${
                            isDraggingThis
                              ? 'opacity-25 border-dashed border-[#C8AA7A] bg-[#FAF7F0]'
                              : isSelected
                                ? 'border-[#EA580C] bg-[#FFF7ED] shadow-md scale-[1.02]'
                                : 'border-[#ECE5D5] bg-[#FAF8F2] hover:border-[#D9A76A] hover:bg-white hover:shadow-md'
                          }`}
                        >
                          <div
                            className="h-full max-h-[116px] sm:max-h-[168px] lg:max-h-[180px] flex items-center justify-center transition-transform duration-150 group-hover:scale-[1.03]"
                            style={{
                              maxWidth: '92%',
                              aspectRatio: `${aspectRatio}`,
                            }}
                          >
                            <JigsawPieceSvg
                              piece={piece}
                              imageUrl={currentLevel.imageUrl}
                              imageFailed={imageFailed}
                              className="w-full h-full drop-shadow-[0_4px_8px_rgba(45,42,38,0.18)]"
                            />
                          </div>
                        </button>
                      );
                    })}
                  </div>

                  {/* Reference Card (shown on tablet/desktop where space is abundant) */}
                  <div className="hidden sm:flex pt-3 border-t border-[#F0EAE0] items-center gap-4 shrink-0">
                    <div className="w-14 h-14 rounded-xl overflow-hidden border border-[#E5DEC9] shrink-0 bg-[#FAF8F2]">
                      {!imageFailed ? (
                        <img
                          src={currentLevel.imageUrl}
                          alt={`Ảnh mẫu ${currentLevel.animalName}`}
                          referrerPolicy="no-referrer"
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-[#FEF3C7]">
                          <Puzzle className="w-6 h-6 text-[#92400E]" />
                        </div>
                      )}
                    </div>
                    <div className="min-w-0">
                      <div className="text-sm font-semibold text-[#2D2A26]">
                        Tranh mẫu: {currentLevel.animalName}
                      </div>
                      <p className="text-xs text-[#665F55] mt-0.5 leading-relaxed">
                        Bé quan sát tranh mẫu để tìm đúng vị trí ghép hình nhé!
                      </p>
                    </div>
                  </div>
                </>
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center text-center py-2 sm:py-6 px-2 animate-pop-in">
                  <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-2xl bg-[#DCFCE7] text-[#15803D] flex items-center justify-center mb-2 sm:mb-4 shadow-sm">
                    <Sparkles className="w-7 h-7 sm:w-9 sm:h-9" />
                  </div>

                  <h2 className="font-display text-xl sm:text-3xl font-extrabold text-[#2D2A26] text-balance">
                    Chúc mừng bé! Bé ghép xong rồi!
                  </h2>

                  <p className="mt-1 sm:mt-2 text-sm sm:text-base font-semibold text-[#15803D]">
                    Bức tranh {currentLevel.animalName} thật đáng yêu!
                  </p>

                  <p className="mt-1.5 sm:mt-3 text-xs sm:text-sm text-[#5C554C] max-w-sm leading-relaxed line-clamp-2 sm:line-clamp-none">
                    {currentLevel.funFact}
                  </p>

                  <div className="mt-4 sm:mt-7 flex flex-row sm:flex-row items-center justify-center gap-2.5 sm:gap-3 w-full">
                    {hasNextLevel ? (
                      <button
                        type="button"
                        onClick={() => resetLevel(currentLevelIdx + 1)}
                        className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 min-h-[48px] px-4 sm:px-6 py-3 rounded-2xl bg-[#EA580C] hover:bg-[#C2410C] active:scale-[0.98] text-white font-display text-sm sm:text-base font-bold shadow-md transition-all cursor-pointer whitespace-nowrap focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#EA580C]"
                      >
                        <span>Màn tiếp theo</span>
                        <ChevronRight className="w-5 h-5" />
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => resetLevel(0)}
                        className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 min-h-[48px] px-4 sm:px-6 py-3 rounded-2xl bg-[#EA580C] hover:bg-[#C2410C] active:scale-[0.98] text-white font-display text-sm sm:text-base font-bold shadow-md transition-all cursor-pointer whitespace-nowrap focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#EA580C]"
                      >
                        <span>Chơi lại Màn 1</span>
                        <ChevronRight className="w-5 h-5" />
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => resetLevel(currentLevelIdx)}
                      className="inline-flex items-center justify-center gap-1.5 min-h-[48px] px-4 sm:px-5 py-3 rounded-2xl bg-[#F4EFE4] hover:bg-[#EAE2D0] text-[#2D2A26] font-display text-sm sm:text-base font-semibold transition-colors cursor-pointer whitespace-nowrap focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#EA580C]"
                    >
                      <RotateCcw className="w-4 h-4" />
                      <span>Ghép lại</span>
                    </button>
                  </div>
                </div>
              )}
            </section>
          </div>
        </main>
      )}

      {/* Floating 1:1 Scale Dragged Piece */}
      {dragState && dragState.hasMoved && (
        <div
          className="fixed top-0 left-0 pointer-events-none z-50"
          style={{
            width: `${dragState.renderWidth}px`,
            height: `${dragState.renderHeight}px`,
            transform: `translate3d(${dragState.currentX - dragState.relX * dragState.renderWidth}px, ${dragState.currentY - dragState.relY * dragState.renderHeight}px, 0) scale(1.03)`,
          }}
        >
          <JigsawPieceSvg
            piece={dragState.piece}
            imageUrl={currentLevel.imageUrl}
            imageFailed={imageFailed}
            className="w-full h-full drop-shadow-[0_18px_28px_rgba(45,42,38,0.32)]"
            strokeColor={
              hoveredSnapSlotId === dragState.piece.id
                ? '#16A34A'
                : 'rgba(45, 42, 38, 0.45)'
            }
          />
        </div>
      )}
    </div>
  );
}

export default App;
