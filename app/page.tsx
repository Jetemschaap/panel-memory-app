"use client";

import { useEffect, useMemo, useRef, useState } from "react";

type Card = {
  id: string;
  img: string;
  flipped: boolean;
  matched: boolean;
  owner: number | null; // speler die dit paar vond
};

function shuffle<T>(arr: T[]) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// Speler 1 groen, 2 rood, 3 geel, 4 blauw
const PLAYER_COLORS = ["#22c55e", "#ef4444", "#facc15", "#3b82f6"];

// Jij hebt set1 t/m set6
const TOTAL_SETS = 6;

// Joker: als bestandsnaam "heerjan" bevat => 3 punten
const JOKER_KEYWORD = "heerjan";

export default function Home() {
  // ✅ ALLEEN bestandsnamen (zonder /memory/setX/ ervoor)
  // ✅ Deze 18 moeten in elke set-map bestaan (set1..set6)
  const fileNames = useMemo(
    () => [
      "aadt.png",
      "ceesdg.png",
      "ceesm.png",
      "ceesvt.png",
      "corh.png",
      "dickn.png",
      "edb.png",
      "edj.png",
      "henkdg.png",
      "pietvl.png",
      "hennyg.png",
      "huugn.png",
      "janb.png",
      "johns.png",
      "leo.png",
      "martin.png",
      "pieters.png",
      "heerjan.png", // ✅ joker
    ],
    []
  );

  // Startscherm
  const [started, setStarted] = useState(false);
  const [numPlayers, setNumPlayers] = useState(2);

  // Random gekozen set (1..6)
  const [activeSet, setActiveSet] = useState(1);

  // Game state
  const [cards, setCards] = useState<Card[]>([]);
  const [openIds, setOpenIds] = useState<string[]>([]);
  const [locked, setLocked] = useState(false);

  // Multiplayer
  const [currentPlayer, setCurrentPlayer] = useState(0);
  const [scores, setScores] = useState<number[]>([]);

  // Refs voor stabiele match-check
  const cardsRef = useRef<Card[]>([]);
  const currentPlayerRef = useRef(0);
  const numPlayersRef = useRef(2);

  useEffect(() => {
    cardsRef.current = cards;
  }, [cards]);

  useEffect(() => {
    currentPlayerRef.current = currentPlayer;
  }, [currentPlayer]);

  useEffect(() => {
    numPlayersRef.current = numPlayers;
  }, [numPlayers]);

  const totalPairs = fileNames.length;
  const pairsFound = useMemo(
    () => cards.filter((c) => c.matched).length / 2,
    [cards]
  );

  function newGame(players = numPlayersRef.current) {
    // ✅ random set kiezen
    const randomSet = Math.floor(Math.random() * TOTAL_SETS) + 1;
    setActiveSet(randomSet);

    // ✅ maak 18 paren => 36 kaarten
    const base = fileNames
      .filter((f) => typeof f === "string" && f.trim().length > 0)
      .map((f) => `/memory/set${randomSet}/${f}`);

    const doubled: Card[] = [...base, ...base].map((img, i) => ({
      id: `${i}-${Math.random().toString(16).slice(2)}`,
      img,
      flipped: false,
      matched: false,
      owner: null,
    }));

    setCards(shuffle(doubled));
    setOpenIds([]);
    setLocked(false);

    setCurrentPlayer(0);
    setScores(new Array(players).fill(0));
  }

  function flip(id: string) {
    if (locked) return;
    if (openIds.length >= 2) return;

    setCards((prev) => {
      const card = prev.find((c) => c.id === id);
      if (!card || card.flipped || card.matched) return prev;
      return prev.map((c) => (c.id === id ? { ...c, flipped: true } : c));
    });

    setOpenIds((prev) => (prev.includes(id) ? prev : [...prev, id]));
  }

  // Match-check + score/turn
  useEffect(() => {
    if (openIds.length !== 2) return;

    const [id1, id2] = openIds;
    setLocked(true);

    const t = setTimeout(() => {
      const snapshot = cardsRef.current;
      const a = snapshot.find((c) => c.id === id1);
      const b = snapshot.find((c) => c.id === id2);

      const isMatch = !!a && !!b && a.img === b.img;

      // Update cards
      setCards((prev) => {
        const aa = prev.find((c) => c.id === id1);
        const bb = prev.find((c) => c.id === id2);
        if (!aa || !bb) return prev;

        if (isMatch) {
          const owner = currentPlayerRef.current;
          return prev.map((c) =>
            c.id === id1 || c.id === id2
              ? { ...c, matched: true, owner }
              : c
          );
        } else {
          return prev.map((c) =>
            c.id === id1 || c.id === id2 ? { ...c, flipped: false } : c
          );
        }
      });

      // Score + beurt
      if (isMatch) {
        const owner = currentPlayerRef.current;

        const isJoker = (a?.img ?? "").toLowerCase().includes(JOKER_KEYWORD);
        const points = isJoker ? 3 : 1;

        setScores((s) => {
          const next = [...s];
          next[owner] = (next[owner] ?? 0) + points;
          return next;
        });
        // match = zelfde speler blijft
      } else {
        setCurrentPlayer((p) => (p + 1) % numPlayersRef.current);
      }

      setOpenIds([]);
      setLocked(false);
    }, 900);

    return () => clearTimeout(t);
  }, [openIds]);

  // Startscherm
  if (!started) {
    
// ✅ EINDSCHERM
if (pairsFound === totalPairs && totalPairs > 0) {
  const maxScore = Math.max(...scores.map((s) => s ?? 0));
  const winners = scores
    .map((s, i) => ({ s: s ?? 0, i }))
    .filter((x) => x.s === maxScore)
    .map((x) => x.i);

  const winnaarTekst =
    winners.length === 1
      ? `WINNAAR: Speler ${winners[0] + 1}`
      : `GELIJKSPEL: Speler ${winners.map((w) => w + 1).join(" & ")}`;

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#0b1020",
        color: "white",
        display: "grid",
        placeItems: "center",
        padding: 20,
        fontFamily:
          'system-ui, -apple-system, Segoe UI, Roboto, "Helvetica Neue", Arial',
      }}
    >
      <div style={{ width: "100%", maxWidth: 520, display: "grid", gap: 14 }}>
        <div style={{ fontSize: 28, fontWeight: 1000 }}>{winnaarTekst}</div>

        <div
          style={{
            padding: 14,
            borderRadius: 14,
            background: "rgba(255,255,255,.06)",
            border: "1px solid rgba(255,255,255,.12)",
            display: "grid",
            gap: 8,
            fontWeight: 900,
          }}
        >
          {scores.map((s, i) => (
            <div
              key={i}
              style={{
                display: "flex",
                justifyContent: "space-between",
                padding: "8px 10px",
                borderRadius: 12,
                border: `2px solid ${PLAYER_COLORS[i] ?? "white"}`,
                background: "rgba(0,0,0,.15)",
              }}
            >
              <span>Speler {i + 1}</span>
              <span>{s ?? 0}</span>
            </div>
          ))}
        </div>

        <button
          onClick={() => newGame(numPlayers)}
          style={{
            background: "#ffcc00",
            color: "#111",
            border: "none",
            padding: "12px 14px",
            borderRadius: 12,
            fontWeight: 900,
            cursor: "pointer",
          }}
        >
          Nog een potje (random set)
        </button>

        <button
          onClick={() => setStarted(false)}
          style={{
            background: "rgba(255,255,255,.08)",
            color: "white",
            border: "1px solid rgba(255,255,255,.18)",
            padding: "12px 14px",
            borderRadius: 12,
            fontWeight: 900,
            cursor: "pointer",
          }}
        >
          Terug naar start
        </button>
      </div>
    </div>
  );
}

return (
      <div
        style={{
          minHeight: "100vh",
          background: "#0b1020",
          color: "white",
          display: "grid",
          placeItems: "center",
          padding: 20,
          fontFamily:
            'system-ui, -apple-system, Segoe UI, Roboto, "Helvetica Neue", Arial',
        }}
      >
        <div style={{ width: "100%", maxWidth: 420, display: "grid", gap: 14 }}>
          <div style={{ fontSize: 22, fontWeight: 900 }}>🎾 Padel Memory</div>

          <div style={{ opacity: 0.9, fontWeight: 800 }}>Aantal spelers</div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(4, 1fr)",
              gap: 10,
            }}
          >
            {[1, 2, 3, 4].map((n) => (
              <button
                key={n}
                onClick={() => setNumPlayers(n)}
                style={{
                  border: "1px solid rgba(255,255,255,.18)",
                  background:
                    n === numPlayers
                      ? "rgba(255,204,0,.22)"
                      : "rgba(255,255,255,.06)",
                  color: "white",
                  padding: "12px 0",
                  borderRadius: 12,
                  fontWeight: 900,
                  cursor: "pointer",
                }}
              >
                {n}
              </button>
            ))}
          </div>

          <button
            onClick={() => {
              newGame(numPlayers);
              setStarted(true);
            }}
            style={{
              background: "#ffcc00",
              color: "#111",
              border: "none",
              padding: "12px 14px",
              borderRadius: 12,
              fontWeight: 900,
              cursor: "pointer",
            }}
          >
            Start (random set)
          </button>

          <div style={{ opacity: 0.7, fontSize: 12, lineHeight: 1.35 }}>
            Achterkant: <code>/public/memory/back.png</code> <br />
            Sets: <code>/public/memory/set1</code> t/m{" "}
            <code>set{TOTAL_SETS}</code> <br />
            Joker: bestandsnaam bevat “{JOKER_KEYWORD}” ⇒ 3 punten.
          </div>
        </div>
      </div>
    );
  }

  const activeColor = PLAYER_COLORS[currentPlayer] ?? "#ffcc00";

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#0b1020",
        color: "white",
        padding: 14,
        fontFamily:
          'system-ui, -apple-system, Segoe UI, Roboto, "Helvetica Neue", Arial',
      }}
    >
      <div style={{ maxWidth: 980, margin: "0 auto", display: "grid", gap: 12 }}>
        {/* header */}
        <div
          style={{
            display: "flex",
            gap: 12,
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
          }}
        >
          <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
            <div style={{ fontWeight: 900, fontSize: 18 }}>🎾 Padel Memory</div>
            <div style={{ opacity: 0.85, fontSize: 13 }}>
              PAREN: {pairsFound}/{totalPairs}
            </div>
            <div style={{ fontWeight: 900, fontSize: 13, color: activeColor }}>
              AAN ZET: Speler {currentPlayer + 1}
            </div>
            <div style={{ opacity: 0.85, fontSize: 13 }}>
              Set: {activeSet}
            </div>
          </div>

          <div style={{ display: "flex", gap: 10 }}>
            <button
              onClick={() => newGame(numPlayers)}
              style={{
                background: "#ffcc00",
                color: "#111",
                border: "none",
                padding: "10px 12px",
                borderRadius: 10,
                fontWeight: 900,
                cursor: "pointer",
              }}
            >
              Reset (random set)
            </button>

            <button
              onClick={() => setStarted(false)}
              style={{
                background: "rgba(255,255,255,.08)",
                color: "white",
                border: "1px solid rgba(255,255,255,.18)",
                padding: "10px 12px",
                borderRadius: 10,
                fontWeight: 900,
                cursor: "pointer",
              }}
            >
              Terug
            </button>
          </div>
        </div>

        {/* scores */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: `repeat(${Math.min(numPlayers, 4)}, 1fr)`,
            gap: 10,
          }}
        >
          {Array.from({ length: numPlayers }).map((_, i) => {
            const c = PLAYER_COLORS[i] ?? "#ffffff";
            const active = i === currentPlayer;
            return (
              <div
                key={i}
                style={{
                  padding: 12,
                  borderRadius: 12,
                  background: "rgba(255,255,255,.06)",
                  border: active
                    ? `2px solid ${c}`
                    : "1px solid rgba(255,255,255,.12)",
                  fontWeight: 900,
                  display: "flex",
                  justifyContent: "space-between",
                }}
              >
                <span>Speler {i + 1}</span>
                <span>{scores[i] ?? 0}</span>
              </div>
            );
          })}
        </div>

        {/* grid */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(6, 1fr)",
            gap: 8,
          }}
        >
          {cards.map((c) => {
            const ownerColor =
              c.owner != null ? PLAYER_COLORS[c.owner] : null;

            return (
              <button
                key={c.id}
                onClick={() => flip(c.id)}
                style={{
                  border: "none",
                  background: "transparent",
                  padding: 0,
                  cursor: "pointer",
                }}
                aria-label="memory card"
              >
                <div
                  style={{
                    width: "100%",
                    aspectRatio: "1 / 1",
                    borderRadius: 12,
                    overflow: "hidden",
                    background: "#111827",
                    position: "relative",
                    boxShadow: "0 6px 16px rgba(0,0,0,.25)",
                  }}
                >
                  {!c.flipped && !c.matched ? (
                    <img
                      src="/memory/back.png"
                      alt="back"
                      style={{
                        width: "100%",
                        height: "100%",
                        objectFit: "cover",
                      }}
                    />
                  ) : (
                    <img
                      src={c.img}
                      alt="front"
                      style={{
                        width: "100%",
                        height: "100%",
                        objectFit: "cover",
                      }}
                    />
                  )}

                  {/* Rand in spelerkleur voor gevonden paar */}
                  {c.matched && ownerColor && (
                    <div
                      style={{
                        position: "absolute",
                        inset: 0,
                        border: `5px solid ${ownerColor}`,
                        borderRadius: 12,
                        pointerEvents: "none",
                      }}
                    />
                  )}
                </div>
              </button>
            );
          })}
        </div>

        {/* win */}
        {pairsFound === totalPairs && (
          <div
            style={{
              marginTop: 6,
              padding: 12,
              borderRadius: 12,
              background: "rgba(34,197,94,.15)",
              border: "1px solid rgba(34,197,94,.4)",
              fontWeight: 900,
              textAlign: "center",
            }}
          >
            🎉 Klaar! Eindstand:{" "}
            {scores.map((s, i) => `Speler ${i + 1}: ${s}`).join(" • ")}
          </div>
        )}
      </div>
    </div>
  );
}
