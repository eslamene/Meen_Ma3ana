/**
 * Type definition for Next.js App Router route handlers
 * 
 * In Next.js 15+, route params are now Promise-based for better performance
 * and to support async route parameters.
 * 
 * @example
 * ```ts
 * import { RouteContext } from "@/types/next-api";
 * 
 * export async function GET(
 *   req: Request,
 *   context: RouteContext<{ id: string }>
 * ) {
 *   const { id } = await context.params;
 *   // ...
 * }
 * ```
 */
export type RouteContext<T extends Record<string, string>> = {
  params: Promise<T>;
};

