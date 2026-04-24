export const BRAND = {
  name: "Creative Gaming Entertainment",
  short: "CGE",
  address: "1 IT William Street, Akiama, Bonny Island",
  phone: "08160658509",
  email: "Creativegamingent@gmail.com",
  whatsapp: "https://wa.me/2348160658509",
  hours: { weekday: "10 AM – 9 PM", sunday: "1 PM – 9 PM" },
  agePolicy: "13+",
} as const;

export const PRICING = {
  mainLounge: [
    { game: "FC 26", price: 3000, unit: "hr" },
    { game: "Other Games", price: 2000, unit: "hr" },
  ],
  vipLounge: [
    { game: "Single Console (PS5)", price: 5000, unit: "hr" },
    { game: "Both Consoles", price: 10000, unit: "hr" },
  ],
  vr: [{ game: "VR Experience", price: 2000, unit: "15 min session" }],
  drinks: [
    { name: "Coca-Cola", price: 500, category: "drink" },
    { name: "Fanta", price: 500, category: "drink" },
    { name: "Sprite", price: 500, category: "drink" },
    { name: "Water", price: 300, category: "drink" },
    { name: "Energy Drink", price: 800, category: "drink" },
  ],
  snacks: [
    { name: "Chin Chin", price: 300, category: "snack" },
    { name: "Pringles", price: 1500, category: "snack" },
    { name: "Popcorn", price: 500, category: "snack" },
    { name: "Gala", price: 300, category: "snack" },
    { name: "Biscuits", price: 500, category: "snack" },
  ],
} as const;

export const ZONES = [
  {
    id: "main",
    name: "Main Lounge",
    icon: "🎮",
    capacity: 6,
    console: "PS4",
    desc: "6-player gaming arena with PS4 consoles",
  },
  {
    id: "vip",
    name: "VIP Lounge",
    icon: "👑",
    capacity: 2,
    console: "PS5",
    desc: "Premium PS5 experience, 2 consoles",
  },
  {
    id: "vr",
    name: "VR Zone",
    icon: "🥽",
    capacity: 1,
    console: "VR",
    desc: "Immersive virtual reality",
  },
] as const;

export const TIME_SLOTS = [
  "10:00 AM",
  "11:00 AM",
  "12:00 PM",
  "1:00 PM",
  "2:00 PM",
  "3:00 PM",
  "4:00 PM",
  "5:00 PM",
  "6:00 PM",
  "7:00 PM",
  "8:00 PM",
] as const;

// Sunday opens at 1 PM
export const SUNDAY_TIME_SLOTS = [
  "1:00 PM",
  "2:00 PM",
  "3:00 PM",
  "4:00 PM",
  "5:00 PM",
  "6:00 PM",
  "7:00 PM",
  "8:00 PM",
] as const;

export const GAME_OPTIONS: Record<string, string[]> = {
  main: ["FC 26", "Tekken 8", "Mortal Kombat 1", "Call of Duty", "GTA V", "NBA 2K25"],
  vip: ["FC 26", "Tekken 8", "Mortal Kombat 1", "Call of Duty", "Spider-Man 2", "God of War"],
  vr: ["Beat Saber", "VR Boxing", "VR Racing", "VR Adventure"],
};

export const MARKETPLACE_CATEGORIES = [
  "All",
  "Controllers",
  "Games",
  "Accessories",
  "Furniture",
  "Consoles",
] as const;

export const LISTING_CONDITIONS = [
  "New",
  "Used - Like New",
  "Used - Good",
  "Used - Fair",
] as const;

export const TOURNAMENT_GAMES = [
  "FC 26",
  "Tekken 8",
  "Call of Duty",
  "MK1",
  "NBA 2K",
  "GTA",
  "Spider-Man",
  "God of War",
] as const;

export const TOURNAMENT_FORMATS = [
  "Single Elimination",
  "Double Elimination",
  "Round Robin",
  "Swiss",
  "Best of 3",
  "Best of 5",
] as const;

export const TOURNAMENT_PLATFORMS = [
  "PS5",
  "Xbox Series X",
  "PC",
  "Cross-Platform",
  "Mobile",
] as const;

export const SWAP_SUGGESTIONS = [
  "PS5 Controller",
  "Xbox Controller",
  "Gaming Headset",
  "FIFA/FC 26",
  "GTA VI",
  "Gaming Mouse",
  "Mechanical Keyboard",
  "Gaming Monitor",
  "PS5 Console",
  "Xbox Series X",
  "Nintendo Switch",
  "VR Headset",
  "Gaming Chair",
  "Any PS5 Game",
  "Any Xbox Game",
] as const;

export const NAV_LINKS = [
  { label: "Lounge", href: "/lounge" },
  { label: "Marketplace", href: "/marketplace" },
  { label: "Esports", href: "/esports" },
  { label: "Community", href: "/community" },
  { label: "About", href: "/about" },
] as const;
