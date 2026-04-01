import { useEffect, useMemo, useRef, useState } from "react";
import type { BildeInnstilling, Sted } from "@/types/sted";
import BildeGalleri from "./BildeGalleri";
import MorsomFakta from "./MorsomFakta";

interface Props {
  sted: Sted;
}

const BASE = import.meta.env.BASE_URL;
const EDIT_PASSWORD = "flekken";
const DEFAULT_SETTINGS: BildeInnstilling = { x: 50, y: 50, scale: 1 };
const MIN_SCALE = 1;
const MAX_SCALE = 3;
const SCALE_STEP = 0.05;
const MOVE_STEP = 2;

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function getStorageKey(stedId: string, bildePath: string) {
  return `flekken-photo:${stedId}:${bildePath}`;
}

function normalizeSettings(value?: Partial<BildeInnstilling> | null): BildeInnstilling {
  return {
    x: clamp(Number(value?.x ?? DEFAULT_SETTINGS.x), 0, 100),
    y: clamp(Number(value?.y ?? DEFAULT_SETTINGS.y), 0, 100),
    scale: clamp(Number(value?.scale ?? DEFAULT_SETTINGS.scale), MIN_SCALE, MAX_SCALE),
  };
}

export default function VenstreSide({ sted }: Props) {
  const startIndex = useMemo(() => {
    if (!sted.bilder.length) return 0;
    if (!sted.forsidebilde) return 0;

    const found = sted.bilder.findIndex((bilde) => bilde === sted.forsidebilde);
    return found >= 0 ? found : 0;
  }, [sted]);

  const [valgtBildeIndex, setValgtBildeIndex] = useState(startIndex);
  const [secretBuffer, setSecretBuffer] = useState("");
  const [editMode, setEditMode] = useState(false);
  const [imageSettings, setImageSettings] = useState<BildeInnstilling>(DEFAULT_SETTINGS);
  const dragStateRef = useRef<{ startX: number; startY: number; initial: BildeInnstilling } | null>(null);

  useEffect(() => {
    setValgtBildeIndex(startIndex);
    setEditMode(false);
    setSecretBuffer("");
  }, [startIndex, sted.id]);

  const valgtBildePath = sted.bilder.length > 0 ? sted.bilder[valgtBildeIndex] : null;
  const valgtBilde = valgtBildePath ? `${BASE}${valgtBildePath}` : null;

  useEffect(() => {
    if (!valgtBildePath) {
      setImageSettings(DEFAULT_SETTINGS);
      return;
    }

    const stored = (() => {
      try {
        const raw = window.localStorage.getItem(getStorageKey(sted.id, valgtBildePath));
        return raw ? JSON.parse(raw) : null;
      } catch {
        return null;
      }
    })();

    const fileSettings = sted.bildeInnstillinger?.[valgtBildePath] ?? null;
    setImageSettings(normalizeSettings(stored ?? fileSettings ?? DEFAULT_SETTINGS));
  }, [sted.id, sted.bildeInnstillinger, valgtBildePath]);

  const persistSettings = (next: BildeInnstilling) => {
    if (!valgtBildePath) return;
    try {
      window.localStorage.setItem(getStorageKey(sted.id, valgtBildePath), JSON.stringify(next));
    } catch {
      // ignore storage errors
    }
  };

  const updateSettings = (updater: (current: BildeInnstilling) => BildeInnstilling) => {
    setImageSettings((current) => {
      const next = normalizeSettings(updater(current));
      persistSettings(next);
      return next;
    });
  };

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const tagName = target?.tagName?.toLowerCase();
      const isTypingTarget =
        tagName === "input" ||
        tagName === "textarea" ||
        target?.isContentEditable;

      if (isTypingTarget) return;

      if (!editMode) {
        if (event.key.length === 1) {
          const next = `${secretBuffer}${event.key.toLowerCase()}`.slice(-EDIT_PASSWORD.length);
          setSecretBuffer(next);
          if (next === EDIT_PASSWORD) {
            setEditMode(true);
            setSecretBuffer("");
          }
        } else if (event.key === "Escape") {
          setSecretBuffer("");
        }
        return;
      }

      if (event.key === "Escape") {
        setEditMode(false);
        setSecretBuffer("");
        return;
      }

      if (event.key === "+" || event.key === "=") {
        event.preventDefault();
        updateSettings((current) => ({ ...current, scale: current.scale + SCALE_STEP }));
        return;
      }

      if (event.key === "-") {
        event.preventDefault();
        updateSettings((current) => ({ ...current, scale: current.scale - SCALE_STEP }));
        return;
      }

      if (event.key === "0") {
        event.preventDefault();
        updateSettings(() => DEFAULT_SETTINGS);
        return;
      }

      if (event.key.toLowerCase() === "c" && valgtBildePath) {
        event.preventDefault();
        const imageNumber = valgtBildeIndex + 1;
        const text = [
          `bilde_${imageNumber}_x: ${imageSettings.x.toFixed(2)}`,
          `bilde_${imageNumber}_y: ${imageSettings.y.toFixed(2)}`,
          `bilde_${imageNumber}_scale: ${imageSettings.scale.toFixed(3)}`,
        ].join("\n");
        navigator.clipboard?.writeText(text).catch(() => undefined);
        return;
      }

      if (event.key === "ArrowLeft") {
        event.preventDefault();
        updateSettings((current) => ({ ...current, x: current.x - MOVE_STEP }));
      } else if (event.key === "ArrowRight") {
        event.preventDefault();
        updateSettings((current) => ({ ...current, x: current.x + MOVE_STEP }));
      } else if (event.key === "ArrowUp") {
        event.preventDefault();
        updateSettings((current) => ({ ...current, y: current.y - MOVE_STEP }));
      } else if (event.key === "ArrowDown") {
        event.preventDefault();
        updateSettings((current) => ({ ...current, y: current.y + MOVE_STEP }));
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [editMode, imageSettings, secretBuffer, valgtBildeIndex, valgtBildePath]);

  const harMorsomFakta = Boolean(sted.morsom_fakta?.trim());

  return (
    <div className="book-page flex flex-col h-full p-4 md:p-5 lg:p-6 overflow-hidden">
      <div className="shrink-0">
        <h2 className="font-display text-3xl md:text-4xl lg:text-5xl text-foreground text-center mb-1 leading-tight">
          {sted.tittel}
        </h2>

        {(sted.dato || sted.by || sted.land) && (
          <p className="text-center text-muted-foreground font-body text-sm md:text-base mb-3">
            {sted.by ? `${sted.by}` : ""}
            {sted.by && sted.land ? ", " : ""}
            {sted.land ? `${sted.land}` : ""}
            {(sted.by || sted.land) && sted.dato ? " · " : ""}
            {sted.dato ? sted.dato : ""}
          </p>
        )}
      </div>

      <div className="shrink-0">
        {valgtBilde ? (
          <div className="photo-frame tape-decoration mx-auto mb-3 w-full max-w-md">
            <div
              className="relative w-full h-[220px] md:h-[250px] lg:h-[280px] rounded-sm overflow-hidden bg-muted/20"
              onClick={() => {
                setSecretBuffer("");
              }}
              onWheel={(event) => {
                if (!editMode) return;
                event.preventDefault();
                const delta = event.deltaY > 0 ? -SCALE_STEP : SCALE_STEP;
                updateSettings((current) => ({ ...current, scale: current.scale + delta }));
              }}
              onMouseDown={(event) => {
                if (!editMode) return;
                event.preventDefault();
                dragStateRef.current = {
                  startX: event.clientX,
                  startY: event.clientY,
                  initial: imageSettings,
                };
              }}
              onMouseMove={(event) => {
                if (!editMode || !dragStateRef.current) return;
                const dx = event.clientX - dragStateRef.current.startX;
                const dy = event.clientY - dragStateRef.current.startY;
                const box = event.currentTarget.getBoundingClientRect();
                const dxPct = (dx / box.width) * 100;
                const dyPct = (dy / box.height) * 100;
                const next = normalizeSettings({
                  ...dragStateRef.current.initial,
                  x: dragStateRef.current.initial.x - dxPct,
                  y: dragStateRef.current.initial.y - dyPct,
                });
                setImageSettings(next);
              }}
              onMouseUp={() => {
                if (!editMode || !dragStateRef.current) return;
                persistSettings(imageSettings);
                dragStateRef.current = null;
              }}
              onMouseLeave={() => {
                if (!editMode || !dragStateRef.current) return;
                persistSettings(imageSettings);
                dragStateRef.current = null;
              }}
              style={{ cursor: editMode ? "grab" : "default" }}
              title={editMode ? "Tryb edycji kadru aktywny" : undefined}
            >
              <img
                src={valgtBilde}
                alt={sted.tittel}
                draggable={false}
                className="w-full h-full select-none"
                style={{
                  objectFit: "cover",
                  objectPosition: `${imageSettings.x}% ${imageSettings.y}%`,
                  transform: `scale(${imageSettings.scale})`,
                  transformOrigin: "center center",
                }}
              />
              {editMode ? (
                <div className="absolute inset-x-2 bottom-2 rounded bg-black/55 px-2 py-1 text-[11px] text-white">
                  Edycja: przeciągnij, kółko myszy lub +/- , strzałki, 0 reset, C kopiuj, Esc wyjdź
                </div>
              ) : null}
            </div>
          </div>
        ) : (
          <div className="photo-frame mx-auto mb-3 w-full max-w-md">
            <div className="w-full h-[220px] md:h-[250px] lg:h-[280px] rounded-sm bg-muted flex items-center justify-center">
              <span className="text-muted-foreground font-body text-sm">
                Ingen bilder
              </span>
            </div>
          </div>
        )}
      </div>

      <div className="shrink-0 mb-3">
        <BildeGalleri
          bilder={sted.bilder}
          tittel={sted.tittel}
          valgtIndex={valgtBildeIndex}
          onVelg={setValgtBildeIndex}
        />
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto pr-1">
        {sted.beskrivelse?.trim() ? (
          <p className="font-body text-foreground text-sm md:text-base leading-relaxed mb-3">
            {sted.beskrivelse}
          </p>
        ) : (
          <p className="font-body text-muted-foreground text-sm md:text-base mb-3">
            Ingen beskrivelse.
          </p>
        )}

        {harMorsomFakta ? <MorsomFakta tekst={sted.morsom_fakta!.trim()} /> : null}
      </div>
    </div>
  );
}
