import { _, console } from './utils';
import { getFromPersistence, STORAGE_CONSTANTS } from './persistence';


function regenerateAnonymousId(persist) {
  var newId = _.UUID();
  if (persist) {
    persist(STORAGE_CONSTANTS.STORED_ANONYMOUS_ID, newId);
  }
  return newId;
}

function getAnonymousId(persist) {
  var storedAnonId = getFromPersistence(STORAGE_CONSTANTS.STORED_ANONYMOUS_ID);
  if (storedAnonId) {
    return storedAnonId;
  }

  return regenerateAnonymousId(persist);
}

export { getAnonymousId, regenerateAnonymousId };
