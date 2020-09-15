Abstractions.

Micro-managing is not going to work long term. We need the system to be
flexible enough to decide the best way to accomplish certain broad goals.
For now, that goal is simply:

1. Increase the Room Control Level.

The MCP's job is to improve energy flow to the Room Controller.

This is done by maximizing inputs (mining), spending energy on infrastructure (hauling), and dedicating enough Upgraders to dump the rest of the Outputs into the room controller.

Maximizing inputs is easy: after the bootstrapping phase, the RevenueAgent delegates one miner per Source. This means max input is also easy to calculate: 10/tick per Source (in an owned room).

Optimizing outputs is not quite as easy: we can dump surplus into the Controller bucket, but we need to monitor the amount of surplus (as it changes) to scale up or down the number of Upgraders at work. But the time it takes to see a change after autoscaling the Upgraders will vary depending on the Haulers' latency. We'll assign this to an UpgradeAgent.

Optimizing infrastructure is the most difficult. The relevant infrastructure pieces include:

* Containers - source containers at the mining sites, destination containers at the Controller and defense posts
* Extensions - We can lay out an extension "flower" pattern, fit it on the map somewhere out of the way, and build them in order
* Roads - This is fairly simple, lay out roads between hot spots (Spawn, Sources, Controller, Extensions depot) and around congested areas. Maybe track high-traffic areas and add roads as needed?
* Creeps
  - We need one Miner per Source.
  - We need enough Haulers to keep the Mines from filling up. The time it takes to see a change will vary depending on the Haulers' latency.
  - We need enough Builders to keep structures maintained, plus some overlap to build new structures.
  - We need enough Upgraders to keep the Controller bucket empty
  - We need a standing army of Thugs.

Besides infrastructure design, we also need infrastructure managers.

We have Architects and Managers



SourceArchitect - Lays out containers, flags for sources
ControllerArchitect - Lays out container, flags for controller
ExtensionArchitect - Lays out extensions in a flower pattern, adding more extensions (and eventually a Link) as RCL grows
RoadArchitect - Lays out roads between hot spots (Spawn, sources, controller, extensions flower). Lays out roads around congested areas. Watches for opportunities to improve traffic with more roads.


SourceManager - Requests Miners when they are aging out. Assigns Miners to Sources. Manages Miner harvesting.
ControllerManager - Auto-balances Upgraders. Arranges Upgrader formations around container (to allow room for Haulers). Manages Upgrader work.
LogisticsManager - Auto-balances Haulers. Calculates route lengths between Sources and Destinations. Assigns Haulers to routes. Reports average Hauler latency.

TaskManager - Manages Tasks assigned to Creeps.
