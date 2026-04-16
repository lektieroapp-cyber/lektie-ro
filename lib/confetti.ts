import confetti from "canvas-confetti"

/** Fires confetti from both bottom corners — the classic celebration blast. */
export function fireConfetti() {
  const defaults = {
    spread: 55,
    ticks: 60,
    gravity: 1.2,
    decay: 0.94,
    startVelocity: 30,
    colors: ["#E98873", "#4A6A8A", "#F7E8A0", "#34C17A", "#D85C48"],
  }

  // Left corner
  confetti({
    ...defaults,
    particleCount: 40,
    origin: { x: 0.15, y: 1 },
    angle: 60,
  })

  // Right corner
  confetti({
    ...defaults,
    particleCount: 40,
    origin: { x: 0.85, y: 1 },
    angle: 120,
  })

  // Second burst slightly delayed for extra pop
  setTimeout(() => {
    confetti({
      ...defaults,
      particleCount: 30,
      origin: { x: 0.1, y: 1 },
      angle: 70,
      startVelocity: 40,
    })
    confetti({
      ...defaults,
      particleCount: 30,
      origin: { x: 0.9, y: 1 },
      angle: 110,
      startVelocity: 40,
    })
  }, 200)
}
