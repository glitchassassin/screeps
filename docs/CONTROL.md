Initially, I'll handle all but the most basic control logic myself. The units will have their routines, and I'll use flags and construction sites to direct them.

However, we eventually want a central Controller to place flags and construction sites automatically.

# Colony Planning

The Controller should place Road construction sites along the shortest path between the Spawn and each resource block.

The Controller should place Miner flags on each clear space adjacent to a resource block. It should place Container construction sites (and a Source flag) adjacent to as many Miner flags as possible, with as little overlap as possible, distributed across the resources. Then it should place roads in every square with a Miner flag and every adjacent square.

A block of five Extensions can be set up around a single Destination flag, close to one of the Sources, to make it easy for a Hauler to keep them topped off.
