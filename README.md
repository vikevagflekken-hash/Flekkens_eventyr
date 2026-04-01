# Flekkens reisedagbok

En interaktiv visuell reisedagbok for skolemaskoten, bygget som en statisk nettside for GitHub Pages.

## Legg til nye steder

1. Opprett en ny mappe i `/steder/`, f.eks. `sted-003`
2. Legg til en fil `informasjon.txt` med metadata
3. Legg til ett eller flere bilder (`.jpg`, `.png`, `.webp`)
4. Push til GitHub – nettsiden oppdateres automatisk

### Mal for `informasjon.txt`

```
id: mitt-unike-id
tittel: Stedets navn
land: Norge
by: Oslo
sted: Karl Johans gate
dato: 2025-06-01
beskrivelse: En kort beskrivelse av stedet.
morsom_fakta: En morsom fakta om stedet!
breddegrad: 59.913
lengdegrad: 10.752
rekkefolge: 3
forsidebilde: 1.jpg
```

**Valgfrie felt:** Alle felt unntatt `tittel` er valgfrie.

## Lokal utvikling

```bash
npm install
node scripts/generer-steder.mjs
cp -r steder/ public/steder/
npm run dev
```

## Teknisk oversikt

- **Vite + React + TypeScript** for frontend
- **Leaflet** for interaktivt kart
- **Build-time innholdspipeline** – ingen backend nødvendig
- **GitHub Actions** for automatisk bygging og publisering
