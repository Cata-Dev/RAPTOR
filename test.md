## With no considerations of fp from ps

```ts
[
  null,
  [
    { time: 1697784902000 },
    {
      tripIndex: 1,
      boardedAt: 2832,
      route: Route { id: 212204, stops: [Array], trips: [Array] },
      time: 1697801280000
    },
    {
      boardedAt: 2281,
      transfer: { to: 2168, length: 378.0221045189403 },
      time: 1697801532014.7363
    }
  ],
  [
    { time: 1697784902000 },
    {
      tripIndex: 1,
      boardedAt: 2832,
      route: { id: 212204, stops: [Array], trips: [Array] },
      time: 1697801280000
    },
    {
      boardedAt: 2281,
      transfer: { to: 2168, length: 378.0221045189403 },
      time: 1697801532014.7363
    }
  ],
  [
    { time: 1697784902000 },
    {
      tripIndex: 1,
      boardedAt: 2832,
      route: { id: 212204, stops: [Array], trips: [Array] },
      time: 1697801280000
    },
    {
      boardedAt: 2281,
      transfer: { to: 2168, length: 378.0221045189403 },
      time: 1697801532014.7363
    }
  ],
  [
    { time: 1697784902000 },
    {
      tripIndex: 1,
      boardedAt: 2832,
      route: { id: 212204, stops: [Array], trips: [Array] },
      time: 1697801280000
    },
    {
      boardedAt: 2281,
      transfer: { to: 2168, length: 378.0221045189403 },
      time: 1697801532014.7363
    }
  ],
  [
    { time: 1697784902000 },
    {
      tripIndex: 1,
      boardedAt: 2832,
      route: { id: 212204, stops: [Array], trips: [Array] },
      time: 1697801280000
    },
    {
      boardedAt: 2281,
      transfer: { to: 2168, length: 378.0221045189403 },
      time: 1697801532014.7363
    }
  ]
]
```

## With considerations of fp from ps at end of 1st round

```ts
[
  null,
  [
    { time: 1697797362162 },
    {
      tripIndex: 1,
      boardedAt: 2832,
      route: Route { id: 212212, stops: [Array], trips: [Array] },
      time: 1697800149000
    },
    {
      boardedAt: 3339,
      transfer: { to: 2077, length: 613.8944122997134 },
      time: 1697800558262.9417
    },
    {
      boardedAt: 2077,
      transfer: { to: 2281, length: 675.3176605520464 },
      time: 1697801054128.1013
    },
    {
      boardedAt: 2281,
      transfer: { to: 2168, length: 378.0221045189403 },
      time: 1697801396908.8616
    }
  ],
  [
    { time: 1697797362162 },
    {
      tripIndex: 2,
      boardedAt: 2832,
      route: { id: 212331, stops: [Array], trips: [Array] },
      time: 1697799067000
    },
    {
      boardedAt: 2858,
      transfer: { to: 1981, length: 358.0350018311874 },
      time: 1697799305690.0012
    },
    {
      tripIndex: 4,
      boardedAt: 1981,
      route: Route { id: 212269, stops: [Array], trips: [Array] },
      time: 1697799794000
    },
    {
      boardedAt: 315,
      transfer: { to: 2281, length: 846.5226674880396 },
      time: 1697800358348.445
    },
    {
      boardedAt: 2281,
      transfer: { to: 2168, length: 378.0221045189403 },
      time: 1697801396908.8616
    }
  ],
  [
    { time: 1697797362162 },
    {
      boardedAt: 2832,
      transfer: { to: 3850, length: 669.8871103792119 },
      time: 1697797808753.407
    },
    {
      tripIndex: 2,
      boardedAt: 3850,
      route: { id: 257651, stops: [Array], trips: [Array] },
      time: 1697798663000
    },
    {
      boardedAt: 3832,
      transfer: { to: 5246, length: 421.5059849490203 },
      time: 1697798944003.99
    },
    {
      tripIndex: 2,
      boardedAt: 5246,
      route: Route { id: 212463, stops: [Array], trips: [Array] },
      time: 1697800141000
    },
    {
      boardedAt: 1656,
      transfer: { to: 2168, length: 554.1618827250585 },
      time: 1697800510441.2551
    }
  ],
  [
    { time: 1697797362162 },
    {
      boardedAt: 2832,
      transfer: { to: 3850, length: 669.8871103792119 },
      time: 1697797808753.407
    },
    {
      tripIndex: 2,
      boardedAt: 3850,
      route: { id: 257651, stops: [Array], trips: [Array] },
      time: 1697798663000
    },
    {
      boardedAt: 3832,
      transfer: { to: 5246, length: 421.5059849490203 },
      time: 1697798944003.99
    },
    {
      tripIndex: 2,
      boardedAt: 5246,
      route: { id: 212463, stops: [Array], trips: [Array] },
      time: 1697800141000
    },
    {
      boardedAt: 1656,
      transfer: { to: 2168, length: 554.1618827250585 },
      time: 1697800510441.2551
    }
  ],
  [
    { time: 1697797362162 },
    {
      boardedAt: 2832,
      transfer: { to: 3850, length: 669.8871103792119 },
      time: 1697797808753.407
    },
    {
      tripIndex: 2,
      boardedAt: 3850,
      route: { id: 257651, stops: [Array], trips: [Array] },
      time: 1697798663000
    },
    {
      boardedAt: 3832,
      transfer: { to: 5246, length: 421.5059849490203 },
      time: 1697798944003.99
    },
    {
      tripIndex: 2,
      boardedAt: 5246,
      route: { id: 212463, stops: [Array], trips: [Array] },
      time: 1697800141000
    },
    {
      boardedAt: 1656,
      transfer: { to: 2168, length: 554.1618827250585 },
      time: 1697800510441.2551
    }
  ]
]
```

## With considerations of fp from ps before 1st round

```ts
[
  null,
  [
    { time: 1697797362162 },
    {
      boardedAt: 2832,
      transfer: { to: 1937, length: 302.85746472616387 },
      time: 1697797564066.9766
    },
    {
      tripIndex: 1,
      boardedAt: 1937,
      route: Route { id: 212212, stops: [Array], trips: [Array] },
      time: 1697800149000
    },
    {
      boardedAt: 3339,
      transfer: { to: 2077, length: 613.8944122997134 },
      time: 1697800558262.9417
    },
    {
      boardedAt: 2077,
      transfer: { to: 2281, length: 675.3176605520464 },
      time: 1697801054128.1013
    },
    {
      boardedAt: 2281,
      transfer: { to: 2168, length: 378.0221045189403 },
      time: 1697801396908.8616
    }
  ],
  [
    { time: 1697797362162 },
    {
      boardedAt: 2832,
      transfer: { to: 3850, length: 669.8871103792119 },
      time: 1697797808753.407
    },
    {
      tripIndex: 2,
      boardedAt: 3850,
      route: { id: 257651, stops: [Array], trips: [Array] },
      time: 1697798663000
    },
    {
      boardedAt: 3832,
      transfer: { to: 5246, length: 421.5059849490203 },
      time: 1697798944003.99
    },
    {
      tripIndex: 2,
      boardedAt: 5246,
      route: Route { id: 212463, stops: [Array], trips: [Array] },
      time: 1697800141000
    },
    {
      boardedAt: 1656,
      transfer: { to: 2168, length: 554.1618827250585 },
      time: 1697800510441.2551
    }
  ],
  [
    { time: 1697797362162 },
    {
      boardedAt: 2832,
      transfer: { to: 3850, length: 669.8871103792119 },
      time: 1697797808753.407
    },
    {
      tripIndex: 2,
      boardedAt: 3850,
      route: { id: 257651, stops: [Array], trips: [Array] },
      time: 1697798663000
    },
    {
      boardedAt: 3832,
      transfer: { to: 5246, length: 421.5059849490203 },
      time: 1697798944003.99
    },
    {
      tripIndex: 2,
      boardedAt: 5246,
      route: { id: 212463, stops: [Array], trips: [Array] },
      time: 1697800141000
    },
    {
      boardedAt: 1656,
      transfer: { to: 2168, length: 554.1618827250585 },
      time: 1697800510441.2551
    }
  ],
  [
    { time: 1697797362162 },
    {
      boardedAt: 2832,
      transfer: { to: 3850, length: 669.8871103792119 },
      time: 1697797808753.407
    },
    {
      tripIndex: 2,
      boardedAt: 3850,
      route: { id: 257651, stops: [Array], trips: [Array] },
      time: 1697798663000
    },
    {
      boardedAt: 3832,
      transfer: { to: 5246, length: 421.5059849490203 },
      time: 1697798944003.99
    },
    {
      tripIndex: 2,
      boardedAt: 5246,
      route: { id: 212463, stops: [Array], trips: [Array] },
      time: 1697800141000
    },
    {
      boardedAt: 1656,
      transfer: { to: 2168, length: 554.1618827250585 },
      time: 1697800510441.2551
    }
  ],
  [
    { time: 1697797362162 },
    {
      boardedAt: 2832,
      transfer: { to: 3850, length: 669.8871103792119 },
      time: 1697797808753.407
    },
    {
      tripIndex: 2,
      boardedAt: 3850,
      route: { id: 257651, stops: [Array], trips: [Array] },
      time: 1697798663000
    },
    {
      boardedAt: 3832,
      transfer: { to: 5246, length: 421.5059849490203 },
      time: 1697798944003.99
    },
    {
      tripIndex: 2,
      boardedAt: 5246,
      route: { id: 212463, stops: [Array], trips: [Array] },
      time: 1697800141000
    },
    {
      boardedAt: 1656,
      transfer: { to: 2168, length: 554.1618827250585 },
      time: 1697800510441.2551
    }
  ]
]
```

## Right dataset

```ts
[
  null,
  [
    { time: 1697797362162 },
    {
      boardedAt: 2832,
      transfer: { to: 3850, length: 669.8871103792119 },
      time: 1697797808753.407
    },
    {
      tripIndex: 2,
      boardedAt: 3850,
      route: Route { id: 257651, stops: [Array], trips: [Array] },
      time: 1697798663000
    },
    {
      boardedAt: 3832,
      transfer: { to: 2168, length: 103.87566422933122 },
      time: 1697798732250.4429
    }
  ],
  [
    { time: 1697797362162 },
    {
      boardedAt: 2832,
      transfer: { to: 3850, length: 669.8871103792119 },
      time: 1697797808753.407
    },
    {
      tripIndex: 2,
      boardedAt: 3850,
      route: { id: 257651, stops: [Array], trips: [Array] },
      time: 1697798663000
    },
    {
      boardedAt: 3832,
      transfer: { to: 2168, length: 103.87566422933122 },
      time: 1697798732250.4429
    }
  ],
  [
    { time: 1697797362162 },
    {
      boardedAt: 2832,
      transfer: { to: 3850, length: 669.8871103792119 },
      time: 1697797808753.407
    },
    {
      tripIndex: 2,
      boardedAt: 3850,
      route: { id: 257651, stops: [Array], trips: [Array] },
      time: 1697798663000
    },
    {
      boardedAt: 3832,
      transfer: { to: 2168, length: 103.87566422933122 },
      time: 1697798732250.4429
    }
  ],
  null,
  null
]
```