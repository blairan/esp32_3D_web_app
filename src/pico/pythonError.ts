export class PythonError extends Error {
 line:number;column:number;
 constructor(message:string,line:number,column=1){super(message);this.name='PythonError';this.line=line;this.column=column;}
}
