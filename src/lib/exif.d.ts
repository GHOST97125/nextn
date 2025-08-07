declare module 'exif-js' {
  export function getData(img: any, callback: (this: any) => void): any;
  export function getTag(img: any, tag: string): any;
  export function getAllTags(img: any): any;
}
