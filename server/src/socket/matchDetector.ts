import type { Room, Restaurant } from '../types.js';

export function recordSwipe(
  room: Room,
  socketId: string,
  placeId: string,
  liked: boolean
): void {
  if (!room.swipes[socketId]) {
    room.swipes[socketId] = {};
  }
  room.swipes[socketId][placeId] = liked;
  room.lastActivity = Date.now();
}

export function checkAllSwiped(room: Room, socketId: string): boolean {
  const userSwipes = room.swipes[socketId] || {};
  return Object.keys(userSwipes).length >= room.restaurants.length;
}

export function checkAllDone(room: Room): boolean {
  const userIds = Object.keys(room.users);
  if (userIds.length === 0) return false;
  return userIds.every(id => {
    const swipes = room.swipes[id] || {};
    const swipedAll = Object.keys(swipes).length >= room.restaurants.length;
    const explicitlyDone = room.doneUsers?.has(id) ?? false;
    return swipedAll || explicitlyDone;
  });
}

export function getAllMatches(room: Room): Restaurant[] {
  // Count yes-swipes from ALL entries in room.swipes (includes departed players)
  const swiperIds = Object.keys(room.swipes);
  const totalSwipers = swiperIds.length;
  if (totalSwipers === 0) return [];

  // Solo: every right swipe is a match
  if (totalSwipers === 1) {
    return room.restaurants.filter(r => room.swipes[swiperIds[0]]?.[r.placeId] === true);
  }

  // For 2 swipers: require both (unanimous). For 3+: require > 50%
  const threshold = totalSwipers === 2 ? 2 : Math.ceil(totalSwipers * 0.5);

  return room.restaurants.filter(r => {
    const yesCount = swiperIds.filter(id => room.swipes[id]?.[r.placeId] === true).length;
    return yesCount >= threshold;
  });
}

export function getSwipeProgress(room: Room): { done: number; total: number } {
  const currentUserIds = Object.keys(room.users);
  const done = currentUserIds.filter(id => {
    const swipes = room.swipes[id] || {};
    const swipedAll = Object.keys(swipes).length >= room.restaurants.length;
    const explicitlyDone = room.doneUsers?.has(id) ?? false;
    return swipedAll || explicitlyDone;
  }).length;
  return { done, total: currentUserIds.length };
}
