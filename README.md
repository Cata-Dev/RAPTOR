# RAPTOR

[![Lint](https://github.com/Cata-Dev/RAPTOR/actions/workflows/lint.yml/badge.svg?branch=mc-no-local-pruning)](https://github.com/Cata-Dev/RAPTOR/actions/workflows/lint.yml)
[![Test](https://github.com/Cata-Dev/RAPTOR/actions/workflows/test.yml/badge.svg?branch=mc-no-local-pruning)](https://github.com/Cata-Dev/RAPTOR/actions/workflows/test.yml)
![Coverage: total](./badges/coverage-total.svg)
[![Maintainability](https://qlty.sh/badges/5bb9d02c-a878-4bab-807f-04cc28bb7520/maintainability.svg)](https://qlty.sh/gh/Cata-Dev/projects/RAPTOR)

A TypeScript implementation of [RAPTOR algorithm](https://pubsonline.informs.org/doi/10.1287/trsc.2014.0534).
It includes the following derivatives:

- RAPTOR
- McRAPTOR

All optimizations are included except _local pruning_.

## What it is

An algorithm to compute all Pareto-optimal journeys in a dynamic public transit network for multiple criteria, such as arrival time and number of transfers.
