import type {LessonId} from './lessons';
export const buttonExercises={
 'button-toggle':{number:'05',title:'按一次，切換一次。',goal:'GPIO18 按下後穩定 50 ms 才切換 GPIO23；放開保持、長按不重複切換。',hint:'用全域變數保留上次讀值、穩定電位及變動時間；只在穩定 HIGH → LOW 時切換 0／1。',topic:'button-toggle'},
 'button-counter':{number:'06',title:'每次按下，都有紀錄。',goal:'每次有效按下只加 1，長按與放開不加；先穩定 50 ms，再更新全域計數變數。LED 表示穩定按下。',hint:'把計數變數宣告在函式外；穩定 HIGH → LOW 時加 1，在全域變數觀察區查看。',topic:'button-counter'},
} as const;
export function buttonExercise(id:LessonId){return id==='button-toggle'||id==='button-counter'?buttonExercises[id]:null;}
