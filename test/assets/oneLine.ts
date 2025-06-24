import { FootPath, RAPTORData } from "../../src/Structures";

/**
 * 1 route with 4 stops and 2 trips
 */
export default {
  withoutTransfers: [
    [
      { id: 1, connectedRoutes: [1], transfers: [] as FootPath<number>[] },
      { id: 2, connectedRoutes: [1], transfers: [] as FootPath<number>[] },
      { id: 3, connectedRoutes: [1], transfers: [] as FootPath<number>[] },
      { id: 4, connectedRoutes: [1], transfers: [] as FootPath<number>[] },
    ],
    [
      [
        1,
        [1, 2, 3, 4],
        [
          {
            id: 1,
            times: [
              [0, 0],
              [2, 2],
              [4, 4],
              [6, 6],
            ],
          },
          {
            id: 2,
            times: [
              [3, 3],
              [5, 5],
              [7, 7],
              [9, 9],
            ],
          },
        ],
      ],
    ],
  ],
  withSlowTransfers: [
    [
      {
        id: 1,
        connectedRoutes: [1],
        transfers: [
          // Not better
          { to: 2, length: 3 },
          { to: 3, length: 5 },
          // Dumb
          { to: 1, length: 1 },
        ] as FootPath<number>[],
      },
      {
        id: 2,
        connectedRoutes: [1],
        transfers: [
          // Not better
          { to: 4, length: 5 },
        ] as FootPath<number>[],
      },
      {
        id: 3,
        connectedRoutes: [1],
        transfers: [
          // Going back
          { to: 2, length: 1 },
        ] as FootPath<number>[],
      },
      { id: 4, connectedRoutes: [1], transfers: [] as FootPath<number>[] },
    ],
    [
      [
        1,
        [1, 2, 3, 4],
        [
          {
            id: 1,
            times: [
              [0, 0],
              [2, 2],
              [4, 4],
              [6, 6],
            ],
          },
          {
            id: 2,
            times: [
              [3, 3],
              [5, 5],
              [7, 7],
              [9, 9],
            ],
          },
        ],
      ],
    ],
  ],
  withFastTransfers: [
    [
      {
        id: 1,
        connectedRoutes: [1],
        transfers: [
          // Not better
          { to: 2, length: 3 },
          { to: 3, length: 5 },
          // Dumb
          { to: 1, length: 1 },
        ] as FootPath<number>[],
      },
      {
        id: 2,
        connectedRoutes: [1],
        transfers: [
          // Not better
          { to: 4, length: 5 },
        ] as FootPath<number>[],
      },
      {
        id: 3,
        connectedRoutes: [1],
        transfers: [
          // Better!
          { to: 4, length: 1 },
          // Not better, going back
          { to: 1, length: 1 },
        ] as FootPath<number>[],
      },
      { id: 4, connectedRoutes: [1], transfers: [] as FootPath<number>[] },
    ],
    [
      [
        1,
        [1, 2, 3, 4],
        [
          {
            id: 1,
            times: [
              [0, 0],
              [2, 2],
              [4, 4],
              [6, 6],
            ],
          },
          {
            id: 2,
            times: [
              [3, 3],
              [5, 5],
              [7, 7],
              [9, 9],
            ],
          },
        ],
      ],
    ],
  ],
} satisfies Record<string, ConstructorParameters<typeof RAPTORData<number, number, number>>>;
