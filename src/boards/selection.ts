import {readBoard,type BoardId} from './registry.ts';
export type SelectedBoardId=BoardId|'pico-2-w';
export function selectedBoard(value:string|null|undefined):SelectedBoardId {return value==='pico-2-w'?'pico-2-w':readBoard(value);}
export const selectedBoardId=selectedBoard(typeof window==='undefined'?null:new URLSearchParams(window.location.search).get('board'));
