/**
 * Name normalization for event/workshop/paper/flagship registrations.
 *
 * Frontend sends card-title textContent which embeds newlines + indentation
 * (e.g. '...Design\n   with KiCad'), while stats/payment code matches exact
 * canonical names. That mismatch silently drops counts and payment updates.
 */

function normalizeName(name) {
  return String(name || '').replace(/\s+/g, ' ').trim();
}

function escapeRegex(s) {
  return String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// Matches a canonical name even if the stored variant has different
// whitespace (newlines, double spaces). Case-insensitive.
function tolerantNameRegex(canonical) {
  const pattern = escapeRegex(normalizeName(canonical)).replace(/ /g, '\\s+');
  return new RegExp(`^${pattern}$`, 'i');
}

const CANONICAL = {
  technical: [
    'TECH NEXUS',
    'BRAINBYTE 2026',
    'THRILLER TECHSCAPE',
    'TECHTOPIA'
  ],
  nonTechnical: [
    'CASE ZERO : THE FINAL VERDICT',
    'MYSTERY VOYAGE – Unveil the truth',
    'ROAD TO ENDGAME',
    'INFINITY CHASE'
  ],
  flagship: [
    'DEVSPRINT',
    'REVERSE ENGINEERING CHALLENGE',
    'VisionX'
  ],
  bots: [
    'MAZEBOTICS – RESCUE PROTOCOL',
    'ROBO DOMINION -Where Strategy Meets Strength',
    'BOT BLITZ'
  ],
  gaming: [
    'MARVEL ROYALE',
    'BATTLE NEXUS',
    'THE AUCTION ARENA'
  ],
  paper: [
    'TwinTech 2026',
    'VoltIQ 2026',
    'Mediverse',
    'NextGen',
    'NextWave'
  ],
  workshop: [
    'From Pixels to Intelligence: Hands-on Computer Vision with YOLO',
    'Powering Future Mobility: Hands-on EV Electronics Design with KiCad',
    'Automotive ECU Development: Hands-on Model-Based Design with Simulink',
    'Power Electronics: From MATLAB Simulation to Hardware Implementation',
    'Industrial IoT & Industry 4.0 – Industrial Communication Protocols, Edge Gateways & Cloud Data Visualization',
    'The Future of Automotive Safety: Advanced Driver Assistance Systems (ADAS)',
    'ROS 2 Jazzy: From Bot simulation to Autonomous Robotics with TurtleBot3',
    'Building Your Own AI Assistant: From Concept to Implementation',
    'UI/UX Design with Figma & AI: From Ideas to Interactive Prototypes',
    'AI-Powered Digital Twins: Modeling, Simulation & Intelligent Systems'
  ]
};

// Known shorthand variants seen in the wild → canonical.
const ALIASES = {};

// Alphanumeric-only lowercase form: strips spaces, punctuation, dashes,
// so 'TwinTech 2026', 'TWINTECH', 'twin-tech!' all become comparable.
function keyForm(name) {
  return normalizeName(name).toLowerCase().replace(/[^a-z0-9]/g, '');
}

const ALL_CANONICAL = Object.values(CANONICAL).flat();
const CANONICAL_KEYS = ALL_CANONICAL.map((c) => ({ name: c, key: keyForm(c) }));

// Map any incoming name to its canonical form when recognizable;
// otherwise return the whitespace-normalized input unchanged.
// Generic rules (no per-name list): exact key match, else unambiguous
// prefix/substring match either direction (covers shorthands like
// 'TWINTECH' → 'TwinTech 2026' and any whitespace/punctuation variant).
function canonicalizeName(name) {
  const norm = normalizeName(name);
  const key = keyForm(name);
  if (!key) return norm;
  if (ALIASES[key]) return ALIASES[key];
  const exact = CANONICAL_KEYS.filter((c) => c.key === key);
  if (exact.length === 1) return exact[0].name;
  const fuzzy = CANONICAL_KEYS.filter((c) => c.key.includes(key) || key.includes(c.key));
  if (fuzzy.length === 1) return fuzzy[0].name;
  return norm;
}

module.exports = {
  normalizeName,
  tolerantNameRegex,
  canonicalizeName,
  CANONICAL
};
