interface Props {
  tekst: string;
}

const BASE = import.meta.env.BASE_URL;

export default function MorsomFakta({ tekst }: Props) {
  return (
    <div className="fun-fact-box p-3 md:p-4 flex gap-3 items-start">
      <img
        src={`${BASE}images/maskot-ikon.png`}
        alt="Maskot"
        className="w-10 h-10 flex-shrink-0"
      />
      <div>
        <h4 className="font-display text-xl text-accent font-bold mb-1">Morsom fakta:</h4>
        <p className="font-body text-sm text-foreground">{tekst}</p>
      </div>
    </div>
  );
}
