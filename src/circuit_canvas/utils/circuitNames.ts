/**
 * Collection of random circuit names inspired by TinkerCAD
 * Used for generating unique default names for new circuits
 */

export const CIRCUIT_NAMES = [
  // Tech-inspired names
  "Bright Beacon",
  "Quick Pulse",
  "Silent Signal",
  "Swift Circuit",
  "Gentle Spark",
  "Dynamic Flow",
  "Smooth Voltage",
  "Steady Current",
  "Clever Device",
  "Smart Connect",

  // Nature-inspired names
  "Flowing Stream",
  "Dancing Light",
  "Whispering Wind",
  "Glowing Ember",
  "Shining Star",
  "Growing Tree",
  "Flying Bird",
  "Rising Sun",
  "Calm Water",
  "Fresh Breeze",

  // Adventure-themed names
  "Bold Explorer",
  "Brave Warrior",
  "Hidden Treasure",
  "Lost Kingdom",
  "Secret Quest",
  "Mystic Journey",
  "Epic Adventure",
  "Grand Voyage",
  "Wild Frontier",
  "Dark Mystery",

  // Color-themed names
  "Red Thunder",
  "Blue Diamond",
  "Green Forest",
  "Yellow Light",
  "Purple Dream",
  "Orange Flame",
  "Pink Blossom",
  "Silver Moon",
  "Golden Hour",
  "Black Magic",

  // Speed-themed names
  "Rocket Speed",
  "Lightning Fast",
  "Turbo Boost",
  "Sonic Rush",
  "Flash Strike",
  "Rapid Fire",
  "Quick Dash",
  "Swift Arrow",
  "Speedy Gonzales",
  "Instant Action",

  // Energy-themed names
  "Power Surge",
  "Energy Burst",
  "Vibrant Pulse",
  "Intense Fire",
  "Blazing Force",
  "Mighty Wave",
  "Strong Shield",
  "Unstoppable Force",
  "Electric Charge",
  "Nuclear Core",

  // Creative-themed names
  "Artistic Vision",
  "Creative Spark",
  "Brilliant Idea",
  "Innovative Design",
  "Unique Solution",
  "Original Concept",
  "Fresh Perspective",
  "Bold Statement",
  "Masterpiece",
  "Inspired Work",

  // Time-themed names
  "Timeless Classic",
  "Future Vision",
  "Past Memory",
  "Present Moment",
  "Quick Moment",
  "Forever Young",
  "Ancient Wisdom",
  "Modern Age",
  "Era Changing",
  "Time Keeper",

  // Space-themed names
  "Cosmic Wonder",
  "Starry Night",
  "Galaxy Quest",
  "Meteor Strike",
  "Infinite Space",
  "Black Hole",
  "Solar Flare",
  "Nebula Dream",
  "Asteroid Belt",
  "Universe Explorer",

  // Sound-themed names
  "Echo Chamber",
  "Sound Wave",
  "Silent Night",
  "Harmony Bell",
  "Resonant Tone",
  "Musical Note",
  "Acoustic Dream",
  "Melody Maker",
  "Rhythm Keeper",
  "Noise Maker",

  // Element-themed names
  "Fire Element",
  "Water Spirit",
  "Earth Foundation",
  "Air Current",
  "Metal Master",
  "Stone Wall",
  "Clay Craft",
  "Crystal Clear",
  "Diamond Hard",
  "Glass House",

  // Fantasy-themed names
  "Dragon's Lair",
  "Wizard's Tower",
  "Enchanted Forest",
  "Magic Potion",
  "Spell Master",
  "Fairy Tale",
  "Legendary Beast",
  "Sacred Temple",
  "Dark Dungeon",
  "Cursed Artifact",

  // Science-themed names
  "Lab Experiment",
  "Test Subject",
  "Data Analysis",
  "Quantum Leap",
  "Particle Physics",
  "Molecular Bond",
  "Atomic Structure",
  "Chemical Reaction",
  "Scientific Method",
  "Discovery Zone",

  // Machine-themed names
  "Robot Builder",
  "Mechanical Mind",
  "Gear Master",
  "Engine Power",
  "Turbine Spin",
  "Clockwork Precision",
  "Automated System",
  "Digital Brain",
  "Cyber World",
  "Machine Learning",

  // Emotion-themed names
  "Happy Birthday",
  "Joyful Moment",
  "Peaceful Mind",
  "Calm Serenity",
  "Loving Heart",
  "Brave Heart",
  "Curious Mind",
  "Confident Stride",
  "Hopeful Future",
  "Free Spirit",

  // Weather-themed names
  "Sunny Day",
  "Rainy Afternoon",
  "Stormy Night",
  "Cloudy Morning",
  "Snowy Peak",
  "Windy Hill",
  "Rainbow Bridge",
  "Thunder Cloud",
  "Hurricane Force",
  "Tornado Spin",

  // Success-themed names
  "Victory Lap",
  "Champion Rise",
  "Winner's Circle",
  "Success Story",
  "Trophy Moment",
  "Gold Medal",
  "First Place",
  "Peak Performance",
  "Hall of Fame",
  "legendary Status",

  // Mystery-themed names
  "Secret Code",
  "Hidden Message",
  "Mysterious Box",
  "Unknown Object",
  "Cryptic Clue",
  "Puzzle Solver",
  "Riddle Master",
  "Enigma Solved",
  "Hidden Path",
  "Lost Artifact",
];

/**
 * Get a random circuit name from the predefined list
 * @returns A random circuit name
 */
export function getRandomCircuitName(): string {
  const randomIndex = Math.floor(Math.random() * CIRCUIT_NAMES.length);
  return CIRCUIT_NAMES[randomIndex];
}

/**
 * Get multiple random circuit names without duplicates
 * @param count Number of names to get
 * @returns Array of random circuit names
 */
export function getRandomCircuitNames(count: number): string[] {
  const shuffled = [...CIRCUIT_NAMES].sort(() => 0.5 - Math.random());
  return shuffled.slice(0, Math.min(count, CIRCUIT_NAMES.length));
}
