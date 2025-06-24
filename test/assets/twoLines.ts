import { FootPath, RAPTORData } from "../../src/main";

/**
 * 1 route with 4 stops and 2 trips
 */
export default {
  withoutTransfers: [
    [
      { id: 1, connectedRoutes: [1], transfers: [] as FootPath<number>[] },
      { id: 2, connectedRoutes: [1], transfers: [] as FootPath<number>[] },
      { id: 3, connectedRoutes: [1, 2], transfers: [] as FootPath<number>[] },
      { id: 4, connectedRoutes: [1], transfers: [] as FootPath<number>[] },
      { id: 5, connectedRoutes: [2], transfers: [] as FootPath<number>[] },
      { id: 6, connectedRoutes: [2], transfers: [] as FootPath<number>[] },
      { id: 7, connectedRoutes: [2], transfers: [] as FootPath<number>[] },
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
              [2, 2],
              [4, 4],
              [6, 6],
              [8, 8],
            ],
          },
        ],
      ],
      [
        2,
        [5, 3, 6, 7],
        [
          {
            id: 1,
            times: [
              [1, 1],
              [3, 3],
              [5, 5],
              [7, 7],
            ],
          },
          {
            id: 2,
            times: [
              [4, 4],
              [6, 6],
              [8, 8],
              [10, 10],
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
          { to: 3, length: 6 },
          { to: 6, length: 8 },
        ] as FootPath<number>[],
      },
      { id: 2, connectedRoutes: [1], transfers: [] as FootPath<number>[] },
      { id: 3, connectedRoutes: [1, 2], transfers: [] as FootPath<number>[] },
      { id: 4, connectedRoutes: [1], transfers: [{ to: 7, length: 5 }] as FootPath<number>[] },
      { id: 5, connectedRoutes: [2], transfers: [{ to: 2, length: 5 }] as FootPath<number>[] },
      { id: 6, connectedRoutes: [2], transfers: [] as FootPath<number>[] },
      { id: 7, connectedRoutes: [2], transfers: [{ to: 1, length: 10 }] as FootPath<number>[] },
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
              [2, 2],
              [4, 4],
              [6, 6],
              [8, 8],
            ],
          },
        ],
      ],
      [
        2,
        [5, 3, 6, 7],
        [
          {
            id: 1,
            times: [
              [1, 1],
              [3, 3],
              [5, 5],
              [7, 7],
            ],
          },
          {
            id: 2,
            times: [
              [4, 4],
              [6, 6],
              [8, 8],
              [10, 10],
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
          { to: 3, length: 6 },
          { to: 6, length: 8 },
        ] as FootPath<number>[],
      },
      {
        id: 2,
        connectedRoutes: [1],
        transfers: [
          // Better!
          { to: 6, length: 3 },
        ] as FootPath<number>[],
      },
      { id: 3, connectedRoutes: [1, 2], transfers: [] as FootPath<number>[] },
      { id: 4, connectedRoutes: [1], transfers: [{ to: 7, length: 5 }] as FootPath<number>[] },
      { id: 5, connectedRoutes: [2], transfers: [{ to: 2, length: 5 }] as FootPath<number>[] },
      { id: 6, connectedRoutes: [2], transfers: [] as FootPath<number>[] },
      { id: 7, connectedRoutes: [2], transfers: [{ to: 1, length: 10 }] as FootPath<number>[] },
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
              [2, 2],
              [4, 4],
              [6, 6],
              [8, 8],
            ],
          },
        ],
      ],
      [
        2,
        [5, 3, 6, 7],
        [
          {
            id: 1,
            times: [
              [1, 1],
              [3, 3],
              [5, 5],
              [7, 7],
            ],
          },
          {
            id: 2,
            times: [
              [4, 4],
              [6, 6],
              [8, 8],
              [10, 10],
            ],
          },
        ],
      ],
    ],
  ],
} satisfies Record<string, ConstructorParameters<typeof RAPTORData<number, number, number>>>;
