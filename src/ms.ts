import vercelMs from "ms";

import { StringValue } from "./types/msStringValue";

type Options = {
  long?: boolean;
};

export type { StringValue };

export default function ms(value: number, options?: Options): StringValue;
export default function ms(value: StringValue): number;
export default function ms(value: number | StringValue, options?: Options): number | StringValue {
  if (typeof value === "number") {
    return vercelMs(value, options);
  }

  return vercelMs(value);
}
