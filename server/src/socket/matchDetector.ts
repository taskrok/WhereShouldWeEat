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

export function checkBothDone(room: Room): boolean {
  const userIds = Object.keys(room.users);
  if (userIds.length < 2) return false;
  return userIds.every(id => {
    // Done if they've swiped on all restaurants OR explicitly sent swipe:done
    const swipes = room.swipes[id] || {};
    const swipedAll = Object.keys(swipes).length >= room.restaurants.length;
    const explicitlyDone = room.doneUsers?.has(id) ?? false;
    return swipedAll || explicitlyDone;
  });
}

export function getAllMatches(room: Room): Restaurant[] {
  const userIds = Object.keys(room.users);
  if (userIds.length < 2) return [];

  const [userA, userB] = userIds;
  const swipesA = room.swipes[userA] || {};
  const swipesB = room.swipes[userB] || {};

  // Find all placeIds where BOTH swiped right
  return room.restaurants.filter(r =>
    swipesA[r.placeId] === true && swipesB[r.placeId] === true
  );
}
