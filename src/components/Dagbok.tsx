import { useState, useEffect } from "react";
import type { Sted } from "@/types/sted";
import VenstreSide from "./VenstreSide";
import HoyreSide from "./HoyreSide";

const BASE = import.meta.env.BASE_URL;

export default function Dagbok() {
  const [steder, setSteder] = useState<Sted[]>([]);
  const [aktivIndex, setAktivIndex] = useState(0);
  const [laster, setLaster] = useState(true);
  const [feil, setFeil] = useState(false);

  useEffect(() => {
    fetch(`${BASE}generert/steder.json`)
      .then((r) => {
        if (!r.ok) throw new Error("Feil");
        return r.json();
      })
      .then((data: Sted[]) => {
        setSteder(data);
        setLaster(false);
      })
      .catch(() => {
        setFeil(true);
        setLaster(false);
      });
  }, []);

  if (laster) {
    return (
      <div className="min-h-[100svh] flex items-center justify-center bg-background">
        <p className="font-display text-3xl text-foreground animate-pulse">
          Laster reisedagbok...
        </p>
      </div>
    );
  }

  if (feil || steder.length === 0) {
    return (
      <div className="min-h-[100svh] flex items-center justify-center bg-background">
        <div className="text-center p-8">
          <p className="font-display text-3xl text-foreground mb-2">
            {feil ? "Kunne ikke laste inn data" : "Ingen steder funnet"}
          </p>
          <p className="font-body text-muted-foreground">
            Legg til mapper i /steder/ og bygg prosjektet på nytt.
          </p>
        </div>
      </div>
    );
  }

  const aktivtSted = steder[aktivIndex];
  const forrige = () => setAktivIndex((i) => Math.max(0, i - 1));
  const neste = () => setAktivIndex((i) => Math.min(steder.length - 1, i + 1));

  return (
    <div
      className="min-h-[100svh] flex flex-col items-center justify-center px-3 py-4 md:px-6 md:py-6 lg:px-10 lg:py-8 relative"
      style={{
        backgroundImage: `url('${BASE}images/map-bg.jpg')`,
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundRepeat: "no-repeat",
      }}
    >
      <div className="absolute inset-0 bg-background/70 backdrop-blur-[2px]" />

      <div className="relative z-10 flex flex-col items-center w-full max-w-[1600px]">
        <h1 className="font-display text-4xl md:text-5xl lg:text-6xl text-foreground mb-4 md:mb-6 text-center shrink-0 drop-shadow-sm">
          Flekkens reisedagbok
        </h1>

        <div className="book-cover w-full rounded-xl p-2 md:p-3 lg:p-4 shadow-xl">
          <div className="flex flex-col lg:grid lg:grid-cols-[1.05fr_8px_0.95fr] gap-0 h-[78svh] min-h-[620px] max-h-[960px]">
            <div className="min-h-0 rounded-l-lg lg:rounded-l-lg rounded-t-lg lg:rounded-t-none overflow-hidden">
              <VenstreSide sted={aktivtSted} />
            </div>

            <div className="hidden lg:block bg-leather opacity-40 self-stretch shrink-0" />

            <div className="min-h-0 rounded-r-lg lg:rounded-r-lg rounded-b-lg lg:rounded-b-none overflow-hidden">
              <HoyreSide
                steder={steder}
                aktivtSted={aktivtSted}
                onVelgSted={setAktivIndex}
              />
            </div>
          </div>
        </div>

        <div className="flex items-center gap-4 mt-4 md:mt-6 shrink-0">
          <button className="nav-btn" onClick={forrige} disabled={aktivIndex === 0}>
            ← Forrige
          </button>

          <span className="font-body text-muted-foreground text-sm">
            {aktivIndex + 1} / {steder.length}
          </span>

          <button
            className="nav-btn"
            onClick={neste}
            disabled={aktivIndex === steder.length - 1}
          >
            Neste →
          </button>
        </div>
      </div>
    </div>
  );
}
