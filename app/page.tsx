"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";

type Card = {
  id: string;
  img: string;
  flipped: boolean;
  matched: boolean;
  owner: number | null;
};

type BoardOption = {
  cards: number;
  cols: number; // breed (klein getal)
  rows: number; // hoog (groot getal)
  label: string;
};

// ✅ jouw regels: eerst klein (breed), daarna groot (hoog)
const BOARD_OPTIONS: BoardOption[] = [
  { cards: 8, cols: 2, rows: 4, label: "8 (2×4)" },
  { cards: 12, cols: 3, rows: 4, label: "12 (3×4)" },
  { cards: 16, cols: 4, rows: 4, label: "16 (4×4)" },
  { cards: 20, cols: 4, rows: 5, label: "20 (4×5)" },
  { cards: 24, cols: 4, rows: 6, label: "24 (4×6)" },
  { cards: 30, cols: 5, rows: 6, label: "30 (5×6)" },
  { cards: 36, cols: 6, rows: 6, label: "36 (6×6)" },
];

const TOTAL_SETS = 5; // /public/memory/set1 ... set5
const JOKER_KEYWORD = "heerjan";
const PLAYER_COLORS = ["#ffcc00", "#60a5fa", "#34d399", "#f472b6"];

// ✅ tijden (pas aan als je wil)
const TURN_BACK_DELAY_MS = 1200; // fout: 1,2 sec kijken
const FINISH_SCREEN_DELAY_MS = 1500; // einde: 1,5 sec kijken
// ⏱️ timer (alleen voor 1 speler)


function shuffle<T>(arr: T[]) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// ✅ jouw front plaatjes (18 nodig voor 36 kaarten)
const fileNames: string[] = [
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
];

export default function Page() {
  const [showIntro, setShowIntro] = useState(true);
  const [introZoom, setIntroZoom] = useState(false);

  const [started, setStarted] = useState(false);
  const [numPlayers, setNumPlayers] = useState(2);

  const [board, setBoard] = useState<BoardOption>(
    BOARD_OPTIONS.find((b) => b.cards === 36) ?? BOARD_OPTIONS[0]
  );

  const [activeSet, setActiveSet] = useState(1);

  const [cards, setCards] = useState<Card[]>([]);
  const [openIds, setOpenIds] = useState<string[]>([]);
  const [locked, setLocked] = useState(false);

  const [currentPlayer, setCurrentPlayer] = useState(0);
  const [scores, setScores] = useState<number[]>([]);

  const [gameFinished, setGameFinished] = useState(false);

  // ⏱️ TIMER (alleen voor 1 speler)
  const [timeMs, setTimeMs] = useState(0);
  const [timerRunning, setTimerRunning] = useState(false);

  // ✅ refs: voorkomt iPhone “dubbel tik” bugs
  const cardsRef = useRef<Card[]>([]);
  const openIdsRef = useRef<string[]>([]);
  const lockedRef = useRef(false);
  const currentPlayerRef = useRef(0);
  const numPlayersRef = useRef(2);


  useEffect(() => {
    cardsRef.current = cards;
  }, [cards]);

  useEffect(() => {
    openIdsRef.current = openIds;
  }, [openIds]);

  useEffect(() => {
    lockedRef.current = locked;
  }, [locked]);

  useEffect(() => {
    currentPlayerRef.current = currentPlayer;
  }, [currentPlayer]);

  useEffect(() => {
    numPlayersRef.current = numPlayers;
  }, [numPlayers]);

  const totalPairs = useMemo(() => Math.floor(board.cards / 2), [board.cards]);

  const pairsFound = useMemo(() => {
    const matchedCount = cards.filter((c) => c.matched).length;
    return matchedCount / 2;
  }, [cards]);

  const allMatched = useMemo(() => {
    return cards.length > 0 && cards.every((c) => c.matched);
  }, [cards]);

  async function newGame(players: number, boardCards: number) {
    setGameFinished(false);

    const randomSet = Math.floor(Math.random() * TOTAL_SETS) + 1;
    setActiveSet(randomSet);

    const neededPairs = Math.floor(boardCards / 2);

    const cleaned = fileNames
      .filter((f) => typeof f === "string" && f.trim().length > 0)
      .map((f) => f.trim());

    const chosenFiles = shuffle(cleaned).slice(0, neededPairs);
    const fronts = chosenFiles.map((f) => `/memory/set${randomSet}/${f}`);
// 🔄 preload afbeeldingen
await Promise.all(
  fronts.map((src) => {
    return new Promise<void>((resolve) => {
      const img = new Image();
      img.src = src;
      img.onload = () => resolve();
      img.onerror = () => resolve();
    });
  })
);


    const doubled: Card[] = [...fronts, ...fronts].map((img, i) => ({
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
    if (lockedRef.current) return;

    const nowOpen = openIdsRef.current;
    if (nowOpen.length >= 2) return;
    if (nowOpen.includes(id)) return;

    const card = cardsRef.current.find((c) => c.id === id);
    if (!card) return;
    if (card.flipped) return;
    if (card.matched) return;

    setCards((prev) =>
      prev.map((c) => (c.id === id ? { ...c, flipped: true } : c))
    );

    setOpenIds((prev) => {
      const next = [...prev, id];
      if (next.length === 2) setLocked(true);
      return next;
    });
  }

  // match check
  useEffect(() => {
    if (openIds.length !== 2) return;

    const [idA, idB] = openIds;
    const a = cardsRef.current.find((c) => c.id === idA);
    const b = cardsRef.current.find((c) => c.id === idB);

    const isMatch = !!a && !!b && a.img === b.img;

    const delay = isMatch ? 650 : TURN_BACK_DELAY_MS;

    const t = window.setTimeout(() => {
      if (isMatch) {
        const p = currentPlayerRef.current;

        const isJoker = (a?.img ?? "").toLowerCase().includes(JOKER_KEYWORD);
        const points = isJoker ? 3 : 1;

        setCards((prev) =>
          prev.map((c) =>
            c.id === idA || c.id === idB
              ? { ...c, matched: true, owner: p }
              : c
          )
        );

        setScores((prev) => {
          const next = [...prev];
          next[p] = (next[p] ?? 0) + points;
          return next;
        });
        // zelfde speler blijft aan zet
      } else {
        setCards((prev) =>
          prev.map((c) =>
            c.id === idA || c.id === idB ? { ...c, flipped: false } : c
          )
        );

        setCurrentPlayer((prev) => (prev + 1) % numPlayersRef.current);
      }

      setOpenIds([]);
      setLocked(false);
    }, delay);

    return () => window.clearTimeout(t);
  }, [openIds]);

  // eindscherm vertragen
 useEffect(() => {
  if (!allMatched) return;

  if (numPlayers === 1) {
    setTimerRunning(false);

    const key = `bestTime_${board.cards}`;
    const best = localStorage.getItem(key);

    if (!best || timeMs < Number(best)) {
      localStorage.setItem(key, String(timeMs));
    }
  }

  const t = window.setTimeout(() => {
    setGameFinished(true);
  }, FINISH_SCREEN_DELAY_MS);

  return () => window.clearTimeout(t);
}, [allMatched]);


useEffect(() => {
  if (!allMatched) return;

  const t = window.setTimeout(() => {
    setGameFinished(true);
  }, FINISH_SCREEN_DELAY_MS);

  return () => window.clearTimeout(t);
}, [allMatched]);

// ⏱️ TIMER
useEffect(() => {
  if (!timerRunning) return;

  const start = Date.now() - timeMs;
  const t = window.setInterval(() => {
    setTimeMs(Date.now() - start);
  }, 200);

  return () => window.clearInterval(t);
}, [timerRunning, timeMs]);


  // END SCREEN
if (gameFinished) {
  const maxScore = scores.length ? Math.max(...scores) : 0;
  const winners = scores
    .map((s, i) => ({ s: s ?? 0, i }))
    .filter((x) => x.s === maxScore)
    .map((x) => x.i);

  let bestTime: number | null = null;

  if (numPlayers === 1) {
    const key = `bestTime_${board.cards}`;
    const stored = localStorage.getItem(key);
    if (stored) {
      bestTime = Number(stored);
    }
  }

  const winnaarTekst =
    winners.length === 1
      ? `WINNAAR: Speler ${winners[0] + 1}`
      : `GELIJKSPEL: Speler ${winners.map((w) => w + 1).join(" & ")}`;

  return (
    <div style={styles.page}>
      <div style={{ width: "100%", maxWidth: 520, display: "grid", gap: 14 }}>
        <div style={{ fontSize: 28, fontWeight: 1000 }}>
          {numPlayers === 1 ? "KLAAR!" : winnaarTekst}
        </div>

        {numPlayers === 1 && (
          <div style={{ fontWeight: 900 }}>
            Jouw tijd: {(timeMs / 1000).toFixed(1)} sec
            <br />
            Beste tijd ({board.cards} kaarten):{" "}
            {bestTime ? (bestTime / 1000).toFixed(1) + " sec" : "Nog geen record"}
          </div>
        )}

        {numPlayers > 1 && (
          <div style={styles.panel}>
            {scores.map((s, i) => (
              <div
                key={i}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  padding: "10px 12px",
                  borderRadius: 12,
                  border: `2px solid ${PLAYER_COLORS[i] ?? "white"}`,
                  background: "rgba(0,0,0,.15)",
                  fontWeight: 900,
                }}
              >
                <span>Speler {i + 1}</span>
                <span>{s ?? 0}</span>
              </div>
            ))}
          </div>
        )}

        <button
          onClick={() => newGame(numPlayers, board.cards)}
          style={styles.primaryBtn}
        >
          Nog een potje
        </button>

        <button
          onClick={() => {
            setGameFinished(false);
            setStarted(false);
          }}
          style={styles.secondaryBtn}
        >
          Terug naar start
        </button>
      </div>
    </div>
  );
}

// INTRO SCREEN
if (showIntro) {
  return (
    <div
      style={{
        minHeight: "100vh",
        backgroundImage: "url(/heerjanoud.png)",
        backgroundSize: "cover",
        backgroundPosition: "center",
        position: "relative",
      }}
    >
      {/* tennisbal onderaan */}
      <button
        onClick={() => {
          setIntroZoom(true);
          setTimeout(() => {
            setShowIntro(false);
            setIntroZoom(false);
          }, 250);
        }}
        style={{
          position: "absolute",
          left: "50%",
          bottom: 40,
          transform: `translateX(-50%) scale(${introZoom ? 2 : 1})`,
          transition: "transform 250ms ease",
          width: 140,
          height: 140,
          borderRadius: "50%",
          border: "none",
          background: "transparent",
          cursor: "pointer",
          padding: 0,
        }}
        aria-label="Start"
      >
        <img
          src="/tennisbal.png"
          alt="Start"
          style={{
            width: "100%",
            height: "100%",
            objectFit: "contain",
            display: "block",
          }}
          draggable={false}
        />
      </button>
    </div>
  );
}


  // START SCREEN
  if (!started) {
    return (
      <div style={styles.page}>
        <div style={{ width: "100%", maxWidth: 480, display: "grid", gap: 14 }}>
          <div style={{ fontSize: 22, fontWeight: 900 }}>🎾 Padel Memory</div>

          <div style={{ opacity: 0.9, fontWeight: 900 }}>Aantal spelers</div>

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
                  ...styles.choiceBtn,
                  background:
                    n === numPlayers
                      ? "rgba(255,204,0,.22)"
                      : "rgba(255,255,255,.06)",
                }}
              >
                {n}
              </button>
            ))}
          </div>

          <div style={{ opacity: 0.9, fontWeight: 900 }}>Bord kiezen</div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(3, 1fr)",
              gap: 10,
            }}
          >
            {BOARD_OPTIONS.map((opt) => {
              const active = opt.cards === board.cards;
              return (
                <button
                  key={opt.cards}
                  onClick={() => setBoard(opt)}
                  style={{
                    ...styles.choiceBtn,
                    padding: "12px 10px",
                    background: active
                      ? "rgba(255,204,0,.22)"
                      : "rgba(255,255,255,.06)",
                  }}
                >
                  {opt.label}
                </button>
              );
            })}
          </div>

          <button
  onClick={async () => {
    await newGame(numPlayers, board.cards);
    setStarted(true);

    if (numPlayers === 1) {
      setTimeMs(0);
      setTimerRunning(true);
    }
  }}
  style={styles.primaryBtn}
>
  Start (random set)
</button>

        </div>
      </div>
    );
  }

  // GAME SCREEN
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
        <div style={styles.headerRow}>
          <div
            style={{
              display: "flex",
              gap: 10,
              alignItems: "center",
              flexWrap: "wrap",
            }}
          >
            <div style={{ fontWeight: 900, fontSize: 18 }}>🎾 Padel Memory</div>
{numPlayers === 1 && (
  <div style={{ fontWeight: 900, fontSize: 14 }}>
    Tijd: {(timeMs / 1000).toFixed(1)} sec
  </div>
)}

            <div style={{ opacity: 0.85, fontSize: 13 }}>
              PAREN: {pairsFound}/{totalPairs}
            </div>
            <div style={{ fontWeight: 900, fontSize: 13, color: activeColor }}>
              AAN ZET: Speler {currentPlayer + 1}
            </div>
            <div style={{ opacity: 0.85, fontSize: 13 }}>Set: {activeSet}</div>
            <div style={{ opacity: 0.85, fontSize: 13 }}>
              Bord: {board.cols}×{board.rows}
            </div>
          </div>

          <div style={{ display: "flex", gap: 10 }}>
            <button
              onClick={() => newGame(numPlayers, board.cards)}
              style={styles.primarySmallBtn}
            >
              Reset
            </button>
            <button
              onClick={() => {
                setGameFinished(false);
                setStarted(false);
              }}
              style={styles.secondarySmallBtn}
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
            gridTemplateColumns: `repeat(${board.cols}, 1fr)`,
            gap: 8,
          }}
        >
          {cards.map((c) => {
            const ownerColor = c.owner != null ? PLAYER_COLORS[c.owner] : null;

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
                    boxShadow: "0 6px 16px rgba(0,0,0,.25)",
                    outline: ownerColor ? `3px solid ${ownerColor}` : "none",
                    outlineOffset: ownerColor ? -3 : 0,
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
                      draggable={false}
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
                      draggable={false}
                    />
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page: {
    minHeight: "100vh",
    background: "#0b1020",
    color: "white",
    display: "grid",
    placeItems: "center",
    padding: 20,
    fontFamily:
      'system-ui, -apple-system, Segoe UI, Roboto, "Helvetica Neue", Arial',
  },
  panel: {
    padding: 14,
    borderRadius: 14,
    background: "rgba(255,255,255,.06)",
    border: "1px solid rgba(255,255,255,.12)",
    display: "grid",
    gap: 8,
  },
  headerRow: {
    display: "flex",
    gap: 12,
    alignItems: "center",
    justifyContent: "space-between",
    flexWrap: "wrap",
  },
  choiceBtn: {
    border: "1px solid rgba(255,255,255,.18)",
    color: "white",
    padding: "12px 0",
    borderRadius: 12,
    fontWeight: 900,
    cursor: "pointer",
  },
  primaryBtn: {
    background: "#ffcc00",
    color: "#111",
    border: "none",
    padding: "12px 14px",
    borderRadius: 12,
    fontWeight: 900,
    cursor: "pointer",
  },
  secondaryBtn: {
    background: "rgba(255,255,255,.08)",
    color: "white",
    border: "1px solid rgba(255,255,255,.18)",
    padding: "12px 14px",
    borderRadius: 12,
    fontWeight: 900,
    cursor: "pointer",
  },
  primarySmallBtn: {
    background: "#ffcc00",
    color: "#111",
    border: "none",
    padding: "10px 12px",
    borderRadius: 10,
    fontWeight: 900,
    cursor: "pointer",
  },
  secondarySmallBtn: {
    background: "rgba(255,255,255,.08)",
    color: "white",
    border: "1px solid rgba(255,255,255,.18)",
    padding: "10px 12px",
    borderRadius: 10,
    fontWeight: 900,
    cursor: "pointer",
  },
};
