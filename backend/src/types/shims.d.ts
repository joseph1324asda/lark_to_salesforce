declare const process: { env: Record<string, string | undefined> };
declare const console: { log(...args: unknown[]): void; warn(...args: unknown[]): void; error(...args: unknown[]): void };
declare module 'fs' { const fs: any; export default fs; export const existsSync: any; export const mkdirSync: any; export const readFileSync: any; }
declare module 'path' { const path: any; export default path; export const dirname: any; export const resolve: any; export const join: any; }
declare module 'url' { export const fileURLToPath: any; }
declare module 'crypto' { const crypto: any; export default crypto; }
declare module 'dotenv' { const dotenv: { config(): void }; export default dotenv; }
declare module 'jsonwebtoken' { const jwt: { sign(payload: unknown, secret: string, options: unknown): string }; export default jwt; }
declare module 'axios' {
  export interface AxiosInstance { get<T = any>(url: string, config?: any): Promise<{ data: T }>; post<T = any>(url: string, data?: any, config?: any): Promise<{ data: T }>; put<T = any>(url: string, data?: any, config?: any): Promise<{ data: T }>; }
  const axios: AxiosInstance & { create(config?: any): AxiosInstance };
  export default axios;
}
declare module 'better-sqlite3' { export default class Database { constructor(path: string); pragma(sql: string): void; exec(sql: string): void; prepare(sql: string): { all(...args: any[]): unknown[]; get(...args: any[]): unknown; run(...args: any[]): { lastInsertRowid: number | bigint } }; transaction(fn: (...args: any[]) => void): (...args: any[]) => void; } }
declare module 'node-cron' { const cron: { validate(expr: string): boolean; schedule(expr: string, fn: () => void | Promise<void>): void }; export default cron; }
declare module 'cors' { const cors: () => any; export default cors; }
declare module 'express' {
  export interface Request { params: Record<string, string>; body: any }
  export interface Response { json(body: unknown): void; status(code: number): Response; sendFile(path: string): void }
  export type NextFunction = (error?: unknown) => void;
  export type ErrorRequestHandler = (error: unknown, req: Request, res: Response, next: NextFunction) => void;
  export interface RouterLike { get(path: string, ...handlers: any[]): void; post(path: string, ...handlers: any[]): void; put(path: string, ...handlers: any[]): void; use(...args: any[]): void; }
  export function Router(): RouterLike;
  function express(): RouterLike & { listen(port: number, cb?: () => void): void };
  namespace express { function json(options?: unknown): any; function static(path: string): any; }
  export default express;
}
