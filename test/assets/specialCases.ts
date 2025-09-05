import { expect, test } from "@jest/globals";
import { InternalTimeInt, TimeInt } from "../../src";
import { TestAsset, TestDataset } from "./asset";

const MAX_ROUNDS = 6;
const PARAMS = [
  1,
  4,
  [0, 0],
  { walkSpeed: 1 * 1_000, maxTransferLength: NaN },
  MAX_ROUNDS,
] satisfies TestAsset<InternalTimeInt>["tests"][number]["params"];

const routes: TestAsset<InternalTimeInt>["data"][2] = [
  [
    1,
    [1, 2],
    [
      [
        [
          [10, 11],
          [11, 12],
        ],
        [
          [13, 14],
          [14, 15],
        ],
      ],
    ],
  ],
  [
    2,
    [2, 3],
    [
      [
        [
          [2, 16],
          [3, 17],
        ],
        [
          [5, 18],
          [6, 19],
        ],
      ],
    ],
  ],
  [
    3,
    [3, 4],
    [
      [
        [
          [7, 8],
          [8, 9],
        ],
        [
          [10, 11],
          [11, 12],
        ],
      ],
    ],
  ],
];

export default [
  "Special cases",
  {
    /**
     * When performing a connection.
     * Check a journey doesn't correspond to something like this:
     * ```
     * 1.     [ ]
     * 2. [      ]
     * 3.  [ ]     <= should be impossible
     * 4.   [ ]
     * ...
     * ```
     */
    timeTravel: {
      data: [
        TimeInt,
        [
          [1, [1], []],
          [2, [1, 2], []],
          [3, [2, 3], []],
          [4, [3], []],
        ],
        routes,
      ],
      tests: [
        {
          params: PARAMS,
          validate: (res) => {
            test("No time travel", () => {
              for (const journeys of res) expect(journeys.length).toBe(0);
            });
          },
        },
      ],
    },
  },
] satisfies TestDataset<InternalTimeInt>;

export { MAX_ROUNDS };
