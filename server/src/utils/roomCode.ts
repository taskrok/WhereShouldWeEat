const FOOD_WORDS = [
  'TACO', 'RICE', 'SOUP', 'CAKE', 'SODA', 'WRAP', 'DINE', 'BITE', 'BREW',
  'CHEF', 'CHOP', 'COOK', 'CORN', 'CRAB', 'DELI', 'DISH', 'DUCK', 'DUMP',
  'EATS', 'EGGS', 'FIGS', 'FISH', 'FIZZ', 'FORK', 'FLAN', 'FRY', 'GRIL',
  'GRUB', 'HERB', 'ICED', 'JAMS', 'JERK', 'JUIC', 'KALE', 'LAMB', 'LEEK',
  'LIME', 'LOAF', 'MALT', 'MAYO', 'MEAT', 'MELT', 'MENU', 'MILK', 'MINT',
  'MISO', 'MUNG', 'NAAN', 'NORI', 'NUTS', 'OATS', 'OILS', 'OKRA', 'OVEN',
  'PARM', 'PEAR', 'PEAS', 'PEEL', 'PIES', 'PLUM', 'POKE', 'PORK', 'RAGU',
  'RIBS', 'ROAM', 'ROLL', 'ROUX', 'SAGE', 'SAKE', 'SALT', 'SEAR', 'SEED',
  'SLAW', 'STEW', 'STIR', 'SUBS', 'TART', 'TOFU', 'TUNA', 'VEAL', 'WAFFLES',
  'WINGS', 'WOKS', 'YAMS', 'ZEST', 'BASIL', 'CURRY', 'FEAST', 'GRAIN',
  'HONEY', 'NACHO', 'OLIVE', 'PASTA', 'PEACH', 'SALAD', 'SPICE', 'TOAST',
];

const activeRoomCodes = new Set<string>();

export function generateRoomCode(): string {
  const available = FOOD_WORDS.filter(w => !activeRoomCodes.has(w));
  if (available.length === 0) {
    // Fallback: random 4-char alphanumeric
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
    let code: string;
    do {
      code = Array.from({ length: 4 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
    } while (activeRoomCodes.has(code));
    activeRoomCodes.add(code);
    return code;
  }
  const code = available[Math.floor(Math.random() * available.length)];
  activeRoomCodes.add(code);
  return code;
}

export function releaseRoomCode(code: string): void {
  activeRoomCodes.delete(code);
}
