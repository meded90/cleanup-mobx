/**
 * Local declaration for ms@2.x.
 *
 * ms@2.1.3 does not publish bundled TypeScript declarations. The StringValue
 * shape is aligned with the Vercel ms TypeScript source and @types/ms@2.1.0.
 */
declare module "ms" {
  export type StringValue = import("./msStringValue").StringValue;

  export default function ms(value: number, options?: { long?: boolean }): StringValue;

  export default function ms(value: StringValue): number;
}
