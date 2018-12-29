import { Player } from "@leancloud/play";
import { StateType } from "typesafe-actions";
import { fromServerOnly, ReduxEventHandlers } from "../stateful-game/core";
import * as actions from "./actions";
import { UNKNOWN_CHOICE, ValidChoice } from "./models";
import reducer from "./reducer";

export { UNKNOWN_CHOICE, ValidChoice } from "./models";

// [✊, ✌️, ✋] wins [✌️, ✋, ✊]
const wins = [1, 2, 0];

export enum Event {
  PLAY,
  GAME_START,
  PLAYER_LEFT,
}
declare interface IEventPayloads {
  [Event.PLAY]: { index: ValidChoice };
  [Event.GAME_START]: void;
  [Event.PLAYER_LEFT]: void;
}

export {
  reducer,
  actions,
 };
export type RPSGameState = StateType<typeof reducer>;

export const events: ReduxEventHandlers<RPSGameState, Event, IEventPayloads> = {
  [Event.PLAY]: (
    { dispatch, getState, emitEvent },
    { emitterIndex, players },
    { index },
  ) => {
    const { started, choices, result } = getState();
    if (!started) { return; }
    if (result) { return; }
    if (emitterIndex !== undefined) {
      // 如果该玩家已经做出选择，什么都不做
      if (choices[emitterIndex]) { return; }
      // 更新该玩家的选择
      dispatch(actions.setChoice(index, emitterIndex));
    }
    // State is immutable. we must get a new one.
    const { choices: newChoices } = getState();
    // 如果有人还未选择，继续等待
    if (newChoices.indexOf(null) !== -1) { return; }
    // 这里的逻辑可能同时在服务端或客户端运行，因此会需要考虑客户端看到的状态是 UNKNOWN_CHOICE 的情况。
    if (newChoices.indexOf(UNKNOWN_CHOICE) !== -1) { return; }
    // 计算出赢家并更新到结果中
    dispatch(actions.setWinner(getWinner(newChoices as number[], players)));
  },
  [Event.PLAYER_LEFT]: fromServerOnly((
    { dispatch, getState, emitEvent },
    { players },
  ) => {
    if (getState().result) { return; }
    // 判定留下的唯一玩家为赢家
    dispatch(actions.setWinner(players[0]));
  }),
};

const getWinner = ([player1Choice, player2Choice]: number[], players: Player[]) => {
  if (player1Choice === player2Choice) { return null; }
  return wins[player1Choice] === player2Choice ? players[0] : players[1];
};

export const filter = (
  state: RPSGameState,
  player: Player,
  playerIndex: number,
) => {
  if (state.result) {
    return state;
  }
  return {
    ...state,
    choices: state.choices.map((choice, index) => {
      if (index === playerIndex) {
        return choice;
      }
      if (choice === null) {
        return choice;
      }
      return UNKNOWN_CHOICE;
    }),
  };
};