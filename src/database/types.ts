export interface ProductRecord {
  i: string;
  n: string;
  c: string;
  u: string;
  ca: number;
  ua: number;

  s?: string;
  cp?: number;
  rp?: number;
  wp?: number;
  wq?: number;
  st?: number;
}

export interface VariantRecord {
  i: string;
  pi: string;
  n: string;
  s: string;
  ss?: string[];
  cp: number;
  rp: number;
  wp: number;
  wq: number;
  st: number;
  ca: number;
  ua: number;
}

export interface CartItemRecord {
  pi: string;
  pn: string;
  pp: number;
  q: number;
  pt: 0 | 1;
  sb: number;
  vi?: string;
  vn?: string;
  vs?: string;
}

export interface TransactionRecord {
  i: string;
  it: CartItemRecord[];
  t: number;
  p: number;
  ch: number;
  ca: number;
  cn?: string;
  pt?: 0 | 1;
  ci?: string;
}

