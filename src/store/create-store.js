import {
  createStore as _createStore,
  combineReducers,
  applyMiddleware,
} from 'redux';
import { synchronizedUserReducer } from '@generative.fm/user';
import queueReducer from '../queue/queue-reducer';
import playbackReducer from '../playback/playback-reducer';
import pieceReducer from '../piece/piece-reducer';
import masterGainReducer from '../volume/master-gain-reducer';
import playbackMiddleware from '../playback/playback-middleware';
import storeUserStateMiddleware from '../user/store-user-state-middleware';
import synchronizeUserMiddleware from '../user/synchronize-user-middleware';
import persistStateMiddleware from '../storage/persist-state-middleware';

const createStore = (preloadedState) =>
  _createStore(
    combineReducers({
      queue: queueReducer,
      playback: playbackReducer,
      user: synchronizedUserReducer,
      piece: pieceReducer,
      masterGain: masterGainReducer,
    }),
    preloadedState,
    applyMiddleware(
      playbackMiddleware,
      storeUserStateMiddleware,
      synchronizeUserMiddleware,
      persistStateMiddleware
    )
  );

export default createStore;
