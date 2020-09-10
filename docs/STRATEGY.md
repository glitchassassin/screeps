# Overview

A summary of the strategy to be implemented in this repository.

# Main Phases

* Colonize: Establish a spawner and basic infrastructure.
* Exploit: Ramp up production and establish basic defences.

(there will be more, but this is a start)

## Colonize

Create a Spawner equidistant from the room's main energy sources.

Create Pioneers (cheap, versatile units) to begin mining. Their priority:

1. Harvest energy
2. Replenish Spawn
3. Build roads between Spawn and energy sources
4. Build containers near energy sources for Miner units
5. Repair structures as needed

Create a basic Upgrader to boost the Room Controller. Its priority:

1. Withdraw energy from the Spawner (or nearby container)
2. Upgrade the Controller

Once roads have been created, the Controller is upgraded to level 2, and containers have been built, move to Exploit phase.

## Exploit

Create Miners to take over mining from Pioneers. Their priority:

1. Find a site to harvest energy, and settle down.
2. Harvest energy
3. Fill Containers

Create container near Controller. Create Haulers to move energy from mines to Controller depot. Their priority:

1. Collect energy from flagged Source containers
2. Move energy to flagged Destination containers, based on need at time of departure.

Create Builders. Their priority:

1. Withdraw energy from nearby containers
2. Move to location near construction site, or structure in need of repair (but not on a road)
3. Build (or repair) the target

