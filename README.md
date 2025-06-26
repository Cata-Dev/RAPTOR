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

- Foot distance, minimizes the foot distance over a journey
- Buffer time (same as the original paper), maximizes the minimum transfer time to hop on a trip over a journey

# References

- Daniel Delling, Thomas Pajor, Renato F. Werneck (2014) Round-Based Public Transit Routing. Transportation Science 49(3):591-604. [doi.org/10.1287/trsc.2014.0534](https://doi.org/10.1287/trsc.2014.0534)
