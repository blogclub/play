import { Transport, Gain, getContext } from 'tone';
import { byId } from '@generative-music/pieces-alex-bainter';
import sampleLibrary from './sample-library';
import { USER_PLAYED_PIECE } from './user-played-piece';
import selectCurrentPieceId from '../queue/select-current-piece-id';
import pieceStartedPlaying from './piece-started-playing';
import { USER_STOPPED_PLAYBACK } from './user-stopped-playback';
import { USER_STARTED_PLAYBACK } from './user-started-playback';

const playbackMiddleware = (store) => (next) => {
  const activatingPieces = new Set();
  const activePieces = new Map();

  const stopAll = () => {
    Array.from(activePieces).forEach(
      ([pieceId, { schedule, deactivate, end, gainNode }]) => {
        if (end) {
          Transport.stop();
          Transport.cancel();
          end();
        }
        activePieces.set(pieceId, { deactivate, schedule, gainNode });
      }
    );
  };

  const playPiece = ({ pieceId, destination }) => {
    if (activatingPieces.has(pieceId)) {
      return;
    }
    let activePiece = activePieces.get(pieceId);
    if (activePiece) {
      const { deactivate, schedule, gainNode } = activePiece;
      const end = schedule();
      activePieces.set(pieceId, {
        deactivate,
        schedule,
        end,
        gainNode,
      });
      Transport.start();
      store.dispatch(pieceStartedPlaying());
      return;
    }
    const pieceGain = new Gain().connect(destination);
    const piece = byId[pieceId];
    activatingPieces.add(pieceId);
    piece.loadActivate().then((activate) => {
      activate({
        context: getContext(),
        sampleLibrary,
        destination: pieceGain,
      }).then(([deactivate, schedule]) => {
        activatingPieces.delete(pieceId);
        const currentPieceId = selectCurrentPieceId(store.getState());
        if (currentPieceId !== pieceId) {
          return;
        }
        activePiece = activePieces.get(pieceId);
        if (activePiece && activePiece.end) {
          console.warn(
            `${pieceId} activated but it's already been scheduled. Was it activated twice?`
          );
          return;
        }
        const end = schedule();
        activePieces.set(pieceId, {
          deactivate,
          schedule,
          end,
          gainNode: pieceGain,
        });
        Transport.start();
        store.dispatch(pieceStartedPlaying());
      });
    });
  };

  return (action) => {
    const result = next(action);
    switch (action.type) {
      case USER_STARTED_PLAYBACK: {
        const pieceId = selectCurrentPieceId(store.getState());
        const { destination } = action.payload;
        stopAll();
        playPiece({ pieceId, destination });
        break;
      }
      case USER_PLAYED_PIECE: {
        const { index, selectionPieceIds, destination } = action.payload;
        const pieceId = selectionPieceIds[index];
        stopAll();
        playPiece({ pieceId, destination });
        break;
      }
      case USER_STOPPED_PLAYBACK: {
        stopAll();
      }
    }

    return result;
  };
};

export default playbackMiddleware;
