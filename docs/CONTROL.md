Initially, I'll handle all but the most basic control logic myself. The units will have their routines, and I'll use flags and construction sites to direct them.

However, we eventually want a central Controller to place flags and construction sites automatically.

# Colony Planning

The Controller should place Road construction sites along the shortest path between the Spawn and each resource block.

The Controller should place one Container construction site and Source flag adjacent to each Energy resource. It should spawn a Miner for each Source flag, if one doesn't exist

A block of five Extensions can be set up around a single Destination flag, close to one of the Sources, to make it easy for a Hauler to keep them topped off.
