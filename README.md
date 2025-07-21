# Round-bAsed Public Transit Optimized Router

[![Lint](https://github.com/Cata-Dev/RAPTOR/actions/workflows/lint.yml/badge.svg?branch=main)](https://github.com/Cata-Dev/RAPTOR/actions/workflows/lint.yml)
[![Test](https://github.com/Cata-Dev/RAPTOR/actions/workflows/test.yml/badge.svg?branch=main)](https://github.com/Cata-Dev/RAPTOR/actions/workflows/test.yml)
![Coverage: total](./badges/coverage-total.svg)
[![Maintainability](https://qlty.sh/badges/5bb9d02c-a878-4bab-807f-04cc28bb7520/maintainability.svg)](https://qlty.sh/gh/Cata-Dev/projects/RAPTOR)

A TypeScript implementation of [RAPTOR algorithm](https://pubsonline.informs.org/doi/10.1287/trsc.2014.0534).
It includes the following derivatives:

- RAPTOR
- McRAPTOR

All optimizations are included except _local pruning_ ; see [this issue](https://github.com/Cata-Dev/RAPTOR/issues/63).
It is implemented on the [local-pruning branch](https://github.com/Cata-Dev/RAPTOR/tree/local-pruning)

## What it is

An algorithm to compute all Pareto-optimal journeys in a dynamic public transit network for multiple criteria, such as arrival time and number of transfers.

Implemented criteria at [src/criteria.ts](./src/criteria.ts):

- **Foot distance**, minimizes the foot distance over a journey
- **Buffer time** (same as the original paper), maximizes the minimum transfer time to hop on a trip over a journey
- **Success probability**, relative to how connection times intersect

## Additions

Some new features are brought in this implementation:

- Enhancing Pareto front to be maximal in general (with any criterion) — [issue](https://github.com/Cata-Dev/RAPTOR/issues/216), [PR](https://github.com/Cata-Dev/RAPTOR/pull/217)  
  This is done by scanning subsequent catchable trips, not only the earliest one.
  The scanning stops when its label is dominated by one of a previously scanned trip.
  This implies the Pareto front is maximal if every criterion is increasing for increasing trips.
- Generalizing the time type.
  It can be a scalar, an interval.
- Ability to run multiple queries (multiple RAPTOR instances, in fact) in parallel, reading the same RAPTOR data (memory chunk).
  This is done thanks to a [SharedArrayBuffer](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/SharedArrayBuffer) together with powerful [views](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/DataView).
  There is a little overhead due to the views.

# References

- Daniel Delling, Thomas Pajor, Renato F. Werneck (2014) Round-Based Public Transit Routing. Transportation Science 49(3):591-604. [doi.org/10.1287/trsc.2014.0534](https://doi.org/10.1287/trsc.2014.0534)
